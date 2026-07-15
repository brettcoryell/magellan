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
  let profileId: string | null = null

  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profileId: requestedProfileId } = await request.json()
    profileId = typeof requestedProfileId === 'string' ? requestedProfileId : null
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

    const allRawJobs: ReturnType<typeof normalizeRemotiveJob | typeof normalizeAdzunaJob | typeof normalizeJSearchJob>[] = []

    const [remotiveResults, adzunaResults, jSearchResults] = await Promise.all([
      stageCompleted >= 2
        ? Promise.all(titleQueries.slice(0, 2).map(q => fetchRemotive(q)))
        : Promise.resolve([]),
      stageCompleted >= 3
        ? Promise.all(keywordQueries.slice(0, 2).map(q => fetchAdzuna(sanitizeForAdzuna(q))))
        : Promise.resolve([]),
      stageCompleted >= 4
        ? Promise.all(titleQueries.slice(0, 3).map(q => fetchJSearch(q)))
        : Promise.resolve([]),
    ])

    for (const jobs of remotiveResults) {
      for (const job of jobs) allRawJobs.push(normalizeRemotiveJob(job, profileId, 2))
    }
    for (const jobs of adzunaResults) {
      for (const job of jobs) allRawJobs.push(normalizeAdzunaJob(job as Record<string, unknown>, profileId, 'main', 3))
    }

    const anyJSearch = jSearchResults.some(({ jobs }) => jobs.length > 0)
    for (const { jobs } of jSearchResults) {
      for (const job of jobs) allRawJobs.push(normalizeJSearchJob(job, profileId, 'main', 4))
    }

    // JSearch is optional; fall back only after its parallel requests produce no jobs.
    if (stageCompleted >= 4 && !anyJSearch) {
      const fallbackResults = await Promise.all(
        titleQueries.slice(0, 2).map(q => fetchAdzuna(sanitizeForAdzuna(q)))
      )
      for (const jobs of fallbackResults) {
        for (const job of jobs) {
          allRawJobs.push(normalizeAdzunaJob(job as Record<string, unknown>, profileId, 'main', 4))
        }
      }
    }

    if (allRawJobs.length === 0) {
      return NextResponse.json(
        { error: 'No fresh job results were returned. Your existing results have been kept.' },
        { status: 502 }
      )
    }

    // Do not clear a customer's current results until replacement results exist.
    const { error: deleteError } = await supabase
      .from('job_postings')
      .delete()
      .eq('profile_id', profileId)
      .eq('source_type', 'main')
    if (deleteError) throw deleteError

    const { error: upsertError } = await supabase
      .from('job_postings')
      .upsert(allRawJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
    if (upsertError) throw upsertError

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
      profile_id: profileId,
      error_message: err instanceof Error ? err.message : 'Internal server error',
      source: 'refresh-jobs',
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
