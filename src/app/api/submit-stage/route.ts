import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreJob, assignTier, makeDeduKey } from '@/lib/scoring'
import { JobSignals, PreferenceProfile } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractConstraints(text: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract hard constraints from this job seeker's answer. Return JSON only with these exact fields:
{
  "excluded_industries": [],
  "excluded_company_types": [],
  "excluded_locations": [],
  "remote_required": false,
  "excluded_keywords": []
}

Answer: ${text}`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

async function extractAspiration(profileJson: string, aspirationText: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 768,
    messages: [{
      role: 'user',
      content: `Given this job seeker's resume profile: ${profileJson}
And their stated aspiration: ${aspirationText}

1. Extract aspiration signals as JSON
2. Generate 2 search queries (different keyword combos)

Return JSON only:
{
  "signals": {
    "desired_functions": [],
    "desired_industries": [],
    "desired_company_types": [],
    "growth_direction": "unclear",
    "keywords": []
  },
  "queries": ["query 1", "query 2"]
}`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : { signals: {}, queries: [] }
}

async function extractJobSignals(jobs: Array<{ id: string; description: string }>) {
  if (!jobs.length) return []
  const jobsText = jobs.map((j, i) => `JOB_ID:${j.id}\nDESCRIPTION:\n${j.description?.slice(0, 1000)}`).join('\n\n---\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `For each job posting below, extract signals as JSON. Return array in same order as input.

For each extract:
{
  "id": "the job id",
  "seniority": "entry|mid|senior|director|vp|c-level",
  "role_type": "ic|manager|leader|unclear",
  "primary_function": "",
  "industries": [],
  "company_type": "startup|enterprise|agency|consulting|nonprofit|government|unclear",
  "remote": "yes|no|hybrid|unclear",
  "locations": [],
  "key_requirements": [],
  "certifications_required": false,
  "travel_required": false,
  "estimated_level": ""
}

Return JSON array only.

${jobsText}`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

async function fetchRemotive(query: string) {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=25`
  const response = await fetch(url)
  if (!response.ok) return []
  const data = await response.json()
  return (data.jobs || []).slice(0, 25)
}

async function fetchAdzuna(query: string) {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&what=${encodeURIComponent(query)}`
  const response = await fetch(url)
  if (!response.ok) return []
  const data = await response.json()
  return data.results || []
}

function normalizeRemotiveJob(job: Record<string, unknown>, profileId: string) {
  const title = (job.title as string) || ''
  const company = (job.company_name as string) || ''
  const location = 'Remote'
  return {
    profile_id: profileId,
    external_id: String(job.id),
    source: 'remotive',
    title,
    company,
    location,
    remote: true,
    description: (job.description as string) || '',
    url: (job.url as string) || '',
    salary_min: null,
    salary_max: null,
    posted_at: (job.publication_date as string) || null,
    dedup_key: makeDeduKey(title, company, location),
    signals: {},
    fit_score: null,
    fit_tier: null,
  }
}

function normalizeAdzunaJob(job: Record<string, unknown>, profileId: string) {
  const title = (job.title as string) || ''
  const company = ((job.company as Record<string, unknown>)?.display_name as string) || ''
  const location = ((job.location as Record<string, unknown>)?.display_name as string) || ''
  const isRemote = title.toLowerCase().includes('remote') || location.toLowerCase().includes('remote')
  return {
    profile_id: profileId,
    external_id: String(job.id),
    source: 'adzuna',
    title,
    company,
    location,
    remote: isRemote,
    description: (job.description as string) || '',
    url: (job.redirect_url as string) || '',
    salary_min: job.salary_min ? Math.round(job.salary_min as number) : null,
    salary_max: job.salary_max ? Math.round(job.salary_max as number) : null,
    posted_at: (job.created as string) || null,
    dedup_key: makeDeduKey(title, company, location),
    signals: {},
    fit_score: null,
    fit_tier: null,
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stage, answer, profileId } = await request.json()
  if (!stage || !answer || !profileId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Load existing profile
  const { data: profile } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (stage === 2) {
    // Extract constraints
    const constraints = await extractConstraints(answer)

    // Merge into preference_profile
    const updatedPref = { ...(profile.preference_profile || {}), ...constraints }

    // Build search queries from profile
    const titleQuery = (profile.preference_profile as Record<string, unknown>)?.current_job_title as string ||
                       (profile.preference_profile as Record<string, unknown>)?.job_title as string || 'remote work'
    const skillsArr = (profile.preference_profile as Record<string, unknown>)?.key_skills as string[] || []
    const skillQuery = skillsArr.slice(0, 3).join(' ')
    const queries = [titleQuery, skillQuery].filter(Boolean)

    // Fetch from Remotive
    const allRawJobs: ReturnType<typeof normalizeRemotiveJob>[] = []
    for (const q of queries) {
      const jobs = await fetchRemotive(q)
      for (const j of jobs) {
        allRawJobs.push(normalizeRemotiveJob(j, profileId))
      }
    }

    // Batch upsert — conflicts (duplicate dedup_key) are silently ignored
    if (allRawJobs.length > 0) {
      await supabase
        .from('job_postings')
        .upsert(allRawJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
    }

    // Extract signals for any jobs in this profile that don't have them yet
    const { data: newJobs } = await supabase
      .from('job_postings')
      .select('id, description')
      .eq('profile_id', profileId)
      .filter('signals', 'eq', '{}')
      .not('description', 'is', null)

    if (newJobs && newJobs.length > 0) {
      for (let i = 0; i < newJobs.length; i += 10) {
        const batch = newJobs.slice(i, i + 10)
        const batchSignals = await extractJobSignals(batch)
        for (const sig of batchSignals) {
          if (sig.id) {
            await supabase
              .from('job_postings')
              .update({ signals: sig })
              .eq('id', sig.id)
          }
        }
      }
    }

    // Re-score all jobs for this profile
    const { data: allJobs } = await supabase
      .from('job_postings')
      .select('id, signals')
      .eq('profile_id', profileId)

    for (const job of allJobs || []) {
      if (job.signals && Object.keys(job.signals).length > 0) {
        const score = scoreJob(job.signals as JobSignals, updatedPref as Partial<PreferenceProfile>)
        const tier = assignTier(score)
        await supabase
          .from('job_postings')
          .update({ fit_score: score, fit_tier: tier })
          .eq('id', job.id)
      }
    }

    // Update profile
    await supabase
      .from('career_profiles')
      .update({
        constraints_raw: answer,
        preference_profile: updatedPref,
        stage_completed: Math.max(profile.stage_completed, 2),
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)

    return NextResponse.json({ success: true, stage: 2 })
  }

  if (stage === 3) {
    // Extract aspiration signals + queries
    const profileJson = JSON.stringify(profile.preference_profile || {})
    const { signals, queries } = await extractAspiration(profileJson, answer)

    // Merge signals into preference_profile
    const updatedPref = { ...(profile.preference_profile || {}), ...signals }

    // Fetch from Adzuna + Remotive with new queries
    const allRawJobs: Array<ReturnType<typeof normalizeAdzunaJob> | ReturnType<typeof normalizeRemotiveJob>> = []

    for (const q of (queries as string[]).slice(0, 2)) {
      const [adzunaJobs, remotiveJobs] = await Promise.all([
        fetchAdzuna(q),
        fetchRemotive(q),
      ])
      for (const j of adzunaJobs) allRawJobs.push(normalizeAdzunaJob(j as Record<string, unknown>, profileId))
      for (const j of remotiveJobs) allRawJobs.push(normalizeRemotiveJob(j, profileId))
    }

    // Batch upsert — conflicts (duplicate dedup_key) are silently ignored
    if (allRawJobs.length > 0) {
      await supabase
        .from('job_postings')
        .upsert(allRawJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
    }

    // Extract signals for any jobs in this profile that don't have them yet
    const { data: newJobs } = await supabase
      .from('job_postings')
      .select('id, description')
      .eq('profile_id', profileId)
      .filter('signals', 'eq', '{}')
      .not('description', 'is', null)

    if (newJobs && newJobs.length > 0) {
      for (let i = 0; i < newJobs.length; i += 10) {
        const batch = newJobs.slice(i, i + 10)
        const batchSignals = await extractJobSignals(batch)
        for (const sig of batchSignals) {
          if (sig.id) {
            await supabase
              .from('job_postings')
              .update({ signals: sig })
              .eq('id', sig.id)
          }
        }
      }
    }

    // Re-score ALL jobs with updated profile
    const { data: allJobs } = await supabase
      .from('job_postings')
      .select('id, signals')
      .eq('profile_id', profileId)

    for (const job of allJobs || []) {
      if (job.signals && Object.keys(job.signals).length > 0) {
        const score = scoreJob(job.signals as JobSignals, updatedPref as Partial<PreferenceProfile>)
        const tier = assignTier(score)
        await supabase
          .from('job_postings')
          .update({ fit_score: score, fit_tier: tier })
          .eq('id', job.id)
      }
    }

    // Update profile
    await supabase
      .from('career_profiles')
      .update({
        aspiration_raw: answer,
        preference_profile: updatedPref,
        stage_completed: Math.max(profile.stage_completed, 3),
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)

    return NextResponse.json({ success: true, stage: 3 })
  }

  return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
}
