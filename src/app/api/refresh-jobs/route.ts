import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { PreferenceProfile } from '@/lib/types'
import { logError } from '@/lib/logError'
import {
  fetchRemotive,
  fetchAdzuna,
  fetchJSearch,
  normalizeRemotiveJob,
  normalizeAdzunaJob,
  normalizeJSearchJob,
  extractAndUpdateSignals,
  rescoreAllJobs,
  generateFitSummaries,
  sanitizeForAdzuna,
  getSearchQueries,
} from '@/lib/job-sources'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profileId } = await request.json()
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    const { data: profile } = await supabase
      .from('career_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const stageCompleted: number = profile.stage_completed ?? 0
    const pref = (profile.preference_profile || {}) as Partial<PreferenceProfile>
    const { titleQueries, keywordQueries } = getSearchQueries(pref)

    // Delete existing main job postings
    await supabase
      .from('job_postings')
      .delete()
      .eq('profile_id', profileId)
      .eq('source_type', 'main')

    const allRawJobs: ReturnType<typeof normalizeRemotiveJob | typeof normalizeAdzunaJob | typeof normalizeJSearchJob>[] = []

    // Stage 2+: Remotive
    if (stageCompleted >= 2) {
      for (const q of titleQueries.slice(0, 2)) {
        const jobs = await fetchRemotive(q)
        for (const j of jobs) allRawJobs.push(normalizeRemotiveJob(j, profileId, 2))
      }
    }

    // Stage 3+: Adzuna
    if (stageCompleted >= 3) {
      for (const q of keywordQueries.slice(0, 2)) {
        const adzunaQ = sanitizeForAdzuna(q)
        const jobs = await fetchAdzuna(adzunaQ)
        for (const j of jobs) allRawJobs.push(normalizeAdzunaJob(j as Record<string, unknown>, profileId, 'main', 3))
      }
    }

    // Stage 4+: JSearch (with Adzuna fallback)
    if (stageCompleted >= 4) {
      const jSearchResults = await Promise.all(titleQueries.slice(0, 3).map(q => fetchJSearch(q)))
      let anyJSearch = false
      for (const { jobs } of jSearchResults) {
        if (jobs.length > 0) anyJSearch = true
        for (const j of jobs) allRawJobs.push(normalizeJSearchJob(j, profileId, 'main', 4))
      }
      if (!anyJSearch) {
        const fallbackResults = await Promise.all(titleQueries.slice(0, 2).map(q => fetchAdzuna(sanitizeForAdzuna(q))))
        for (const jobs of fallbackResults) {
          for (const j of jobs) allRawJobs.push(normalizeAdzunaJob(j as Record<string, unknown>, profileId, 'main', 4))
        }
      }
    }

    if (allRawJobs.length > 0) {
      await supabase
        .from('job_postings')
        .upsert(allRawJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
    }

    await extractAndUpdateSignals(supabase, profileId)
    await rescoreAllJobs(supabase, profileId, pref, stageCompleted)

    // Regenerate fit summaries if stage 5+ (summaries depend on scored jobs)
    if (stageCompleted >= 5) {
      const { data: mainJobs } = await supabase
        .from('job_postings')
        .select('id, title, description')
        .eq('profile_id', profileId)
        .eq('source_type', 'main')

      if (mainJobs && mainJobs.length > 0) {
        const batches = []
        for (let i = 0; i < mainJobs.length; i += 20) batches.push(mainJobs.slice(i, i + 20))
        const allSummaries = await Promise.all(batches.map(b => generateFitSummaries(b, pref)))
        const merged = Object.assign({}, ...allSummaries)
        await Promise.all(
          Object.entries(merged).map(([jobId, summary]) =>
            supabase.from('job_postings').update({ fit_summary: summary }).eq('id', jobId)
          )
        )
      }
    }

    // Return updated job list
    const { data: jobs } = await supabase
      .from('job_postings')
      .select('*')
      .eq('profile_id', profileId)
      .order('fit_score', { ascending: false, nullsFirst: false })

    return NextResponse.json({ success: true, jobs: jobs || [] })
  } catch (err) {
    console.error('[refresh-jobs]', err)
    await logError({
      error_message: err instanceof Error ? err.message : 'Internal server error',
      source: 'refresh-jobs',
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
