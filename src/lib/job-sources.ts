import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { makeDeduKey, scoreJob, assignTier } from './scoring'
import { JobSignals, PreferenceProfile, SignalConfidence } from './types'
import type { createServiceClient } from './supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createServiceClient>>

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

export async function extractJobSignals(jobs: Array<{ id: string; description: string }>) {
  if (!jobs.length) return []
  const jobsText = jobs.map((j) =>
    `JOB_ID:${j.id}\nDESCRIPTION:\n${stripHtml(j.description || '').slice(0, 1000)}`
  ).join('\n\n---\n\n')

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
  "culture_signals": [],
  "certifications_required": false,
  "travel_required": false,
  "estimated_level": ""
}

culture_signals: values/culture words from the description, e.g. ["collaborative", "fast-paced", "data-driven", "autonomous"]

Return JSON array only.

${jobsText}`,
    }],
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

export async function generateFitSummaries(
  jobs: Array<{ id: string; title: string; description: string | null }>,
  profile: Partial<PreferenceProfile>
): Promise<Record<string, string>> {
  if (!jobs.length) return {}

  const profileSummary = [
    profile.desired_functions?.length ? `Functions: ${profile.desired_functions.join(', ')}` : null,
    profile.values_signals?.length ? `Values: ${profile.values_signals.join(', ')}` : null,
    profile.demonstrated_capabilities?.length ? `Skills: ${profile.demonstrated_capabilities.join(', ')}` : null,
    profile.problem_domain ? `Domain: ${profile.problem_domain}` : null,
  ].filter(Boolean).join('; ')

  const jobsText = jobs.map(j =>
    `JOB_ID:${j.id}\nTITLE:${j.title}\n${j.description?.slice(0, 400) || ''}`
  ).join('\n\n---\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Candidate: ${profileSummary}

For each job, write a 12-15 word fit summary. Be specific about why it fits or doesn't.
Return JSON array only:
[{"id": "uuid", "summary": "12-15 words"}]

${jobsText}`,
    }],
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return {}
  const arr = JSON.parse(match[0]) as Array<{ id: string; summary: string }>
  const result: Record<string, string> = {}
  for (const item of arr) {
    if (item.id && item.summary) result[item.id] = item.summary
  }
  return result
}

// ── Job source fetchers ──────────────────────────────────────────────────────

export async function fetchRemotive(query: string) {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=25`
  const response = await fetch(url)
  if (!response.ok) return []
  const data = await response.json()
  return (data.jobs || []).slice(0, 25)
}

export async function fetchAdzuna(query: string) {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    console.warn('[job-sources] Adzuna keys missing')
    return []
  }
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&what=${encodeURIComponent(query)}`
  const response = await fetch(url)
  if (!response.ok) {
    console.error('[job-sources] Adzuna error', response.status)
    return []
  }
  const data = await response.json()
  return data.results || []
}

export async function fetchJSearch(query: string): Promise<{ jobs: Record<string, unknown>[]; hadError: boolean }> {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) return { jobs: [], hadError: false }
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=1&results_per_page=25`
  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  })
  if (!response.ok) {
    const errText = await response.text()
    console.error('[job-sources] JSearch error', response.status, errText.slice(0, 200))
    return { jobs: [], hadError: true }
  }
  const data = await response.json()
  return { jobs: data.data || [], hadError: false }
}

// ── Job normalizers ──────────────────────────────────────────────────────────

export function normalizeRemotiveJob(job: Record<string, unknown>, profileId: string, fetchedAtStage: number) {
  const title = (job.title as string) || ''
  const company = (job.company_name as string) || ''
  return {
    profile_id: profileId,
    external_id: String(job.id),
    source: 'remotive',
    title,
    company,
    location: 'Remote',
    remote: true,
    description: (job.description as string) || '',
    url: (job.url as string) || '',
    salary_min: null,
    salary_max: null,
    posted_at: (job.publication_date as string) || null,
    dedup_key: `remotive-${String(job.id)}`,
    signals: {},
    fit_score: null,
    fit_tier: null,
    source_type: 'main',
    fetched_at_stage: fetchedAtStage,
  }
}

export function normalizeAdzunaJob(
  job: Record<string, unknown>,
  profileId: string,
  sourceType = 'main',
  fetchedAtStage = 3
) {
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
    dedup_key: `adzuna-${makeDeduKey(title, company, '')}`,
    signals: {},
    fit_score: null,
    fit_tier: null,
    source_type: sourceType,
    fetched_at_stage: fetchedAtStage,
  }
}

export function normalizeJSearchJob(
  job: Record<string, unknown>,
  profileId: string,
  sourceType = 'main',
  fetchedAtStage = 4
) {
  const title = (job.job_title as string) || ''
  const company = (job.employer_name as string) || ''
  const location = [job.job_city, job.job_state, job.job_country]
    .filter(Boolean)
    .join(', ')
  return {
    profile_id: profileId,
    external_id: String(job.job_id || ''),
    source: 'jsearch',
    title,
    company,
    location,
    remote: !!(job.job_is_remote),
    description: (job.job_description as string)?.slice(0, 5000) || '',
    url: (job.job_apply_link as string) || (job.job_google_link as string) || '',
    salary_min: job.job_min_salary ? Math.round(job.job_min_salary as number) : null,
    salary_max: job.job_max_salary ? Math.round(job.job_max_salary as number) : null,
    posted_at: (job.job_posted_at_datetime_utc as string) || null,
    dedup_key: `jsearch-${String(job.job_id || '')}`,
    signals: {},
    fit_score: null,
    fit_tier: null,
    source_type: sourceType,
    fetched_at_stage: fetchedAtStage,
  }
}

// ── Shared processing helpers ────────────────────────────────────────────────

export async function extractAndUpdateSignals(supabase: SupabaseClient, profileId: string) {
  const { data: newJobs } = await supabase
    .from('job_postings')
    .select('id, description')
    .eq('profile_id', profileId)
    .filter('signals', 'eq', '{}')
    .not('description', 'is', null)

  if (!newJobs?.length) return

  const batches: Array<Array<{ id: string; description: string }>> = []
  for (let i = 0; i < newJobs.length; i += 10) batches.push(newJobs.slice(i, i + 10))

  const allSignals = (await Promise.all(batches.map(b => extractJobSignals(b)))).flat()

  await Promise.all(
    allSignals
      .filter(sig => !!sig.id)
      .map(sig => supabase.from('job_postings').update({ signals: sig }).eq('id', sig.id))
  )
}

export async function rescoreAllJobs(
  supabase: SupabaseClient,
  profileId: string,
  updatedPref: Partial<PreferenceProfile>,
  stage: number
) {
  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('id, signals')
    .eq('profile_id', profileId)

  const scoredJobs = (allJobs || []).filter(
    job => job.signals && Object.keys(job.signals).length > 0
  )

  const scoreEventRows = await Promise.all(
    scoredJobs.map(async job => {
      const { raw, normalized, reasons, penalties } = scoreJob(job.signals as JobSignals, updatedPref)
      const tier = assignTier(normalized)
      await supabase
        .from('job_postings')
        .update({ fit_score: normalized, fit_tier: tier, fit_reasons: reasons, fit_penalties: penalties })
        .eq('id', job.id)
      return {
        profile_id: profileId,
        job_id: job.id,
        stage_scored: stage,
        raw_score: raw,
        normalized_score: normalized,
        fit_tier: tier,
        signals_fired: reasons.map((r: { label: string }) => r.label),
        penalties_fired: penalties.map((p: { label: string }) => p.label),
        confidence_snapshot: updatedPref.signal_confidence || {},
      }
    })
  )

  if (scoreEventRows.length > 0) {
    await supabase.from('score_events').insert(scoreEventRows)
  }
}

export function sanitizeForAdzuna(q: string): string {
  return q.split(/ OR /i)[0].trim().split(' ').slice(0, 5).join(' ')
}

// Returns queries to use for each source based on preference_profile
export function getSearchQueries(pref: Partial<PreferenceProfile>): {
  titleQueries: string[]
  keywordQueries: string[]
} {
  const p = pref as Record<string, unknown>
  const jobSearchTitles = (p?.job_search_titles as string[]) || []
  const jobTitle = (p?.job_title as string) || 'professional'
  const keywords = (p?.keywords as string[]) || []

  const titleQueries = jobSearchTitles.length > 0
    ? jobSearchTitles.slice(0, 3)
    : [jobTitle]

  const keywordQueries = keywords.length > 0
    ? keywords.slice(0, 2)
    : titleQueries.slice(0, 2)

  return { titleQueries, keywordQueries }
}

// Unused SignalConfidence import guard
export type { SignalConfidence }
