import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60
import Anthropic from '@anthropic-ai/sdk'
import { scoreJob, assignTier, makeDeduKey } from '@/lib/scoring'
import { JobSignals, PreferenceProfile, SignalConfidence } from '@/lib/types'
import { logError } from '@/lib/logError'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Claude extraction helpers ────────────────────────────────────────────────

async function extractConstraints(text: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract hard constraints from this job seeker's answer. Return JSON only:
{
  "excluded_industries": [],
  "excluded_company_types": [],
  "excluded_locations": [],
  "remote_required": false,
  "excluded_keywords": [],
  "confidence": 0.8
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
2. Generate 2 job title search queries. Each must be a SHORT job title only (3-6 words max). Include seniority level (e.g. "VP", "Chief", "Director", "Senior"). No extra keywords, no OR syntax, no industry terms — just the title.

Return JSON only:
{
  "signals": {
    "desired_functions": [],
    "desired_industries": [],
    "desired_company_types": [],
    "growth_direction": "unclear",
    "keywords": []
  },
  "queries": ["Chief AI Officer", "VP of Technology"],
  "confidence": 0.8
}`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : { signals: {}, queries: [], confidence: 0.5 }
}

async function extractValues(valuesText: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract values and culture signals from this job seeker's answer about a moment of work pride.

Answer: ${valuesText}

Return JSON only:
{
  "values_signals": [],
  "work_style": "autonomous",
  "motivation_type": "outcome",
  "unstructured_notes": "",
  "schema_fit_warning": false,
  "schema_fit_details": "",
  "confidence": 0.8
}

work_style options: "autonomous" | "collaborative" | "unclear"
motivation_type options: "outcome" | "process" | "people" | "unclear"
values_signals: concrete values like ["craftsmanship", "collaboration", "impact", "autonomy", "mentorship"]
unstructured_notes: capture any meaningful detail that doesn't fit the structured fields above

schema_fit_warning: set to true ONLY if the answer is genuinely off-topic, incoherent, or so abstract that no meaningful values can be extracted. A long, detailed, or personal answer is NOT a reason to set this — extract what you can and put overflow detail in unstructured_notes.`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

async function extractCapabilities(capText: string, profileJson: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Given this job seeker's profile: ${profileJson}

And their answer about their hardest problem: ${capText}

Extract demonstrated capabilities. Return JSON only:
{
  "demonstrated_capabilities": [],
  "problem_domain": "",
  "differentiator": "",
  "unstructured_notes": "",
  "schema_fit_warning": false,
  "schema_fit_details": "",
  "confidence": 0.8
}

demonstrated_capabilities: concrete skills/domains, e.g. ["distributed systems", "team leadership", "cost optimization"]
problem_domain: primary domain the hardest problem was in
differentiator: 1 sentence on what made them the right person
unstructured_notes: capture any meaningful detail that doesn't fit the structured fields above

schema_fit_warning: set to true ONLY if the answer is genuinely off-topic, incoherent, or so abstract that no meaningful capabilities can be extracted. A long, detailed, or technical answer is NOT a reason to set this — extract what you can and put overflow detail in unstructured_notes.`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

async function extractStar(starText: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 768,
    messages: [{
      role: 'user',
      content: `Extract a STAR story from this job seeker's accomplishment narrative.

Answer: ${starText}

Return JSON only:
{
  "star_situation": "",
  "star_action": "",
  "star_result": "",
  "star_skills_demonstrated": [],
  "star_scope": "",
  "star_industry_context": "",
  "unstructured_notes": "",
  "schema_fit_warning": false,
  "schema_fit_details": "",
  "confidence": 0.8
}

star_situation: 1-2 sentences on the challenge or context
star_action: 1-2 sentences on what they specifically did
star_result: 1-2 sentences on measurable outcome or impact
star_skills_demonstrated: concrete skills shown, e.g. ["stakeholder management", "systems design", "executive communication"]
star_scope: scale — team size, budget, users affected, revenue impact, etc.
star_industry_context: industry or domain this accomplishment occurred in`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

async function extractAdjacent(adjacentText: string, greatTitles: string[]) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `The user was shown these top job titles: ${greatTitles.join(', ')}

Their response about adjacent roles: ${adjacentText}

Extract what sounds interesting vs what they want to avoid. Return JSON only:
{
  "adjacent_interest": [],
  "adjacent_rejection": [],
  "search_terms": [],
  "confidence": 0.7
}

search_terms: 2-3 JSearch queries for adjacent role discovery based on their interest`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : { adjacent_interest: [], adjacent_rejection: [], search_terms: [], confidence: 0.5 }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

async function extractJobSignals(jobs: Array<{ id: string; description: string }>) {
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

${jobsText}`
    }]
  })
  const raw = (response.content[0] as { type: string; text: string }).text
  const match = raw.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

async function generateFitSummaries(
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

${jobsText}`
    }]
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
  if (!appId || !appKey) {
    console.warn('[submit-stage] Adzuna keys missing')
    return []
  }
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&what=${encodeURIComponent(query)}`
  console.log('[submit-stage] Adzuna query:', query)
  const response = await fetch(url)
  if (!response.ok) {
    console.error('[submit-stage] Adzuna error', response.status, await response.text())
    return []
  }
  const data = await response.json()
  const results = data.results || []
  console.log('[submit-stage] Adzuna results:', results.length, 'for:', query)
  return results
}

async function fetchJSearch(query: string): Promise<{ jobs: Record<string, unknown>[]; hadError: boolean }> {
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
    console.error('[submit-stage] JSearch error', response.status, errText.slice(0, 200))
    return { jobs: [], hadError: true }
  }
  const data = await response.json()
  return { jobs: data.data || [], hadError: false }
}

// ── Job normalizers ──────────────────────────────────────────────────────────

function normalizeRemotiveJob(job: Record<string, unknown>, profileId: string, fetchedAtStage: number) {
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
    dedup_key: `remotive-${String(job.id)}`,
    signals: {},
    fit_score: null,
    fit_tier: null,
    source_type: 'main',
    fetched_at_stage: fetchedAtStage,
  }
}

function normalizeAdzunaJob(job: Record<string, unknown>, profileId: string, sourceType = 'main', fetchedAtStage = 3) {
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

function normalizeJSearchJob(job: Record<string, unknown>, profileId: string, sourceType = 'main', fetchedAtStage = 4) {
  const title = (job.job_title as string) || ''
  const company = (job.employer_name as string) || ''
  const location = [job.job_city, job.job_state, job.job_country]
    .filter(Boolean)
    .join(', ')
  const isRemote = !!(job.job_is_remote)
  return {
    profile_id: profileId,
    external_id: String(job.job_id || ''),
    source: 'jsearch',
    title,
    company,
    location,
    remote: isRemote,
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

// ── Shared helpers ───────────────────────────────────────────────────────────

async function extractAndUpdateSignals(
  supabase: ReturnType<typeof createServiceClient>,
  profileId: string
) {
  const { data: newJobs } = await supabase
    .from('job_postings')
    .select('id, description')
    .eq('profile_id', profileId)
    .filter('signals', 'eq', '{}')
    .not('description', 'is', null)

  if (!newJobs?.length) return

  // Build batches then extract all in parallel (Claude rate limits are generous)
  const batches: Array<Array<{ id: string; description: string }>> = []
  for (let i = 0; i < newJobs.length; i += 10) batches.push(newJobs.slice(i, i + 10))

  const allSignals = (await Promise.all(batches.map(b => extractJobSignals(b)))).flat()

  await Promise.all(
    allSignals
      .filter(sig => !!sig.id)
      .map(sig => supabase.from('job_postings').update({ signals: sig }).eq('id', sig.id))
  )
}

async function rescoreAllJobs(
  supabase: ReturnType<typeof createServiceClient>,
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
        profile_id: profileId, job_id: job.id, stage_scored: stage,
        raw_score: raw, normalized_score: normalized, fit_tier: tier,
        signals_fired: reasons.map(r => r.label), penalties_fired: penalties.map(p => p.label),
        confidence_snapshot: updatedPref.signal_confidence || {},
      }
    })
  )

  if (scoreEventRows.length > 0) {
    await supabase.from('score_events').insert(scoreEventRows)
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stage, answer, profileId } = await request.json()
    if (!stage || !answer || !profileId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('career_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // ── Stage 2: Hard constraints + Remotive ─────────────────────────────────
    if (stage === 2) {
      const extracted = await extractConstraints(answer)
      const { confidence: rawConf, ...constraints } = extracted

      const prevConf: Partial<SignalConfidence> = profile.preference_profile?.signal_confidence || {}
      const signal_confidence: Partial<SignalConfidence> = {
        ...prevConf,
        constraints: rawConf ?? 0.5,
      }

      const updatedPref: Partial<PreferenceProfile> = {
        ...(profile.preference_profile || {}),
        ...constraints,
        signal_confidence: signal_confidence as SignalConfidence,
      }

      // Prefer job_search_titles set at resume upload; fall back gracefully
      const pref2 = profile.preference_profile as Record<string, unknown>
      const searchTitles2 = (pref2?.job_search_titles as string[]) || []
      const fallbackTitle2 = (pref2?.job_title as string) || 'technology leadership'
      const queries = searchTitles2.length > 0 ? searchTitles2.slice(0, 2) : [fallbackTitle2]

      const allRawJobs: ReturnType<typeof normalizeRemotiveJob>[] = []
      for (const q of queries) {
        const jobs = await fetchRemotive(q)
        for (const j of jobs) allRawJobs.push(normalizeRemotiveJob(j, profileId, 2))
      }

      if (allRawJobs.length > 0) {
        await supabase
          .from('job_postings')
          .upsert(allRawJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
      }

      await extractAndUpdateSignals(supabase, profileId)
      await rescoreAllJobs(supabase, profileId, updatedPref, 2)

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

    // ── Stage 3: Aspiration + Adzuna + Remotive ──────────────────────────────
    if (stage === 3) {
      const profileJson = JSON.stringify(profile.preference_profile || {})
      const { signals, queries, confidence: rawConf } = await extractAspiration(profileJson, answer)

      const prevConf: Partial<SignalConfidence> = profile.preference_profile?.signal_confidence || {}
      const signal_confidence: Partial<SignalConfidence> = {
        ...prevConf,
        aspiration: rawConf ?? 0.5,
      }

      const updatedPref: Partial<PreferenceProfile> = {
        ...(profile.preference_profile || {}),
        ...signals,
        signal_confidence: signal_confidence as SignalConfidence,
      }

      // Adzuna's `what` param doesn't support OR syntax — take only the first title phrase
      const sanitizeForAdzuna = (q: string) => q.split(/ OR /i)[0].trim().split(' ').slice(0, 5).join(' ')

      const allRawJobs: Array<ReturnType<typeof normalizeAdzunaJob> | ReturnType<typeof normalizeRemotiveJob>> = []
      for (const q of (queries as string[]).slice(0, 2)) {
        const adzunaQ = sanitizeForAdzuna(q)
        const [adzunaJobs, remotiveJobs] = await Promise.all([
          fetchAdzuna(adzunaQ),
          fetchRemotive(q),
        ])
        for (const j of adzunaJobs) allRawJobs.push(normalizeAdzunaJob(j as Record<string, unknown>, profileId, 'main', 3))
        for (const j of remotiveJobs) allRawJobs.push(normalizeRemotiveJob(j, profileId, 3))
      }

      if (allRawJobs.length > 0) {
        await supabase
          .from('job_postings')
          .upsert(allRawJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
      }

      await extractAndUpdateSignals(supabase, profileId)
      await rescoreAllJobs(supabase, profileId, updatedPref, 3)

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

    // ── Stage 4: Values fit + JSearch ────────────────────────────────────────
    if (stage === 4) {
      const extracted = await extractValues(answer)
      const { confidence: rawConf, ...valuesSignals } = extracted

      const prevConf: Partial<SignalConfidence> = profile.preference_profile?.signal_confidence || {}
      const signal_confidence: Partial<SignalConfidence> = {
        ...prevConf,
        values: rawConf ?? 0.5,
      }

      const updatedPref: Partial<PreferenceProfile> = {
        ...(profile.preference_profile || {}),
        ...valuesSignals,
        signal_confidence: signal_confidence as SignalConfidence,
      }

      // JSearch queries: use all job_search_titles from resume extraction (exec-level aware)
      const pref4 = profile.preference_profile as Record<string, unknown>
      const searchTitles4 = (pref4?.job_search_titles as string[]) || []
      const fallbackTitle4 = (pref4?.job_title as string) || (updatedPref.desired_functions?.[0]) || 'executive leadership'
      const jSearchQueries = searchTitles4.length > 0
        ? searchTitles4.slice(0, 3)
        : [fallbackTitle4]

      console.log('[submit-stage] Stage 4 JSearch queries:', jSearchQueries)

      const allRawJobs: Array<ReturnType<typeof normalizeJSearchJob> | ReturnType<typeof normalizeAdzunaJob>> = []
      let jSearchHadError = false
      const jSearchResults = await Promise.all(jSearchQueries.map(q => fetchJSearch(q)))
      for (const { jobs, hadError } of jSearchResults) {
        if (hadError) jSearchHadError = true
        for (const j of jobs) allRawJobs.push(normalizeJSearchJob(j, profileId, 'main', 4))
      }

      // If JSearch returned nothing (subscription inactive or error), fall back to Adzuna
      if (allRawJobs.length === 0) {
        console.log('[submit-stage] Stage 4 JSearch fallback → Adzuna')
        const adzunaResults = await Promise.all(jSearchQueries.slice(0, 2).map(q => fetchAdzuna(q)))
        for (const jobs of adzunaResults) {
          for (const j of jobs) allRawJobs.push(normalizeAdzunaJob(j as Record<string, unknown>, profileId, 'main', 4))
        }
      }

      if (allRawJobs.length > 0) {
        await supabase
          .from('job_postings')
          .upsert(allRawJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
      }

      await extractAndUpdateSignals(supabase, profileId)
      await rescoreAllJobs(supabase, profileId, updatedPref, 4)

      const schemaWarning = !!valuesSignals.schema_fit_warning
      const existingSourceErrors = ((profile.preference_profile as Record<string, unknown>)?.source_errors as Record<string, string> | undefined) || {}
      const newSourceErrors: Record<string, string | null> = { ...existingSourceErrors }
      if (jSearchHadError) newSourceErrors.jsearch = 'unavailable'
      else delete newSourceErrors.jsearch

      const profileUpdate: Record<string, unknown> = {
        values_raw: answer,
        preference_profile: { ...updatedPref, source_errors: newSourceErrors },
        stage_completed: Math.max(profile.stage_completed, 4),
        updated_at: new Date().toISOString(),
      }
      if (schemaWarning) {
        profileUpdate.schema_warnings = [
          ...(profile.schema_warnings || []),
          { stage: 4, details: valuesSignals.schema_fit_details || '' },
        ]
      }

      await supabase.from('career_profiles').update(profileUpdate).eq('id', profileId)

      return NextResponse.json({ success: true, stage: 4, schemaWarning })
    }

    // ── Stage 5: Capabilities + fit summaries ────────────────────────────────
    if (stage === 5) {
      const profileJson = JSON.stringify(profile.preference_profile || {})
      const extracted = await extractCapabilities(answer, profileJson)
      const { confidence: rawConf, ...capSignals } = extracted

      const prevConf: Partial<SignalConfidence> = profile.preference_profile?.signal_confidence || {}
      const signal_confidence: Partial<SignalConfidence> = {
        ...prevConf,
        capabilities: rawConf ?? 0.5,
      }

      const updatedPref: Partial<PreferenceProfile> = {
        ...(profile.preference_profile || {}),
        ...capSignals,
        signal_confidence: signal_confidence as SignalConfidence,
      }

      await rescoreAllJobs(supabase, profileId, updatedPref, 5)

      // Generate fit summaries for all jobs in one batch call
      const { data: allJobsForSummary } = await supabase
        .from('job_postings')
        .select('id, title, description')
        .eq('profile_id', profileId)
        .eq('source_type', 'main')

      if (allJobsForSummary && allJobsForSummary.length > 0) {
        const summaryBatches: typeof allJobsForSummary[] = []
        for (let i = 0; i < allJobsForSummary.length; i += 20) summaryBatches.push(allJobsForSummary.slice(i, i + 20))
        const allSummaries = await Promise.all(summaryBatches.map(b => generateFitSummaries(b, updatedPref)))
        const merged = Object.assign({}, ...allSummaries)
        await Promise.all(
          Object.entries(merged).map(([jobId, summary]) =>
            supabase.from('job_postings').update({ fit_summary: summary }).eq('id', jobId)
          )
        )
      }

      const schemaWarning = !!capSignals.schema_fit_warning
      const profileUpdate: Record<string, unknown> = {
        capabilities_raw: answer,
        preference_profile: updatedPref,
        stage_completed: Math.max(profile.stage_completed, 5),
        updated_at: new Date().toISOString(),
      }
      if (schemaWarning) {
        profileUpdate.schema_warnings = [
          ...(profile.schema_warnings || []),
          { stage: 5, details: capSignals.schema_fit_details || '' },
        ]
      }

      await supabase.from('career_profiles').update(profileUpdate).eq('id', profileId)

      return NextResponse.json({ success: true, stage: 5, schemaWarning })
    }

    // ── Stage 6: STAR story ───────────────────────────────────────────────────
    if (stage === 6) {
      const extracted = await extractStar(answer)
      const { confidence: rawConf, ...starSignals } = extracted

      const prevConf: Partial<SignalConfidence> = profile.preference_profile?.signal_confidence || {}
      const signal_confidence: Partial<SignalConfidence> = {
        ...prevConf,
        star: rawConf ?? 0.5,
      }

      const updatedPref: Partial<PreferenceProfile> = {
        ...(profile.preference_profile || {}),
        ...starSignals,
        signal_confidence: signal_confidence as SignalConfidence,
      }

      await rescoreAllJobs(supabase, profileId, updatedPref, 6)

      // Regenerate fit summaries with STAR context
      const { data: allJobsForSummary } = await supabase
        .from('job_postings')
        .select('id, title, description')
        .eq('profile_id', profileId)
        .eq('source_type', 'main')

      if (allJobsForSummary && allJobsForSummary.length > 0) {
        const summaryBatches: typeof allJobsForSummary[] = []
        for (let i = 0; i < allJobsForSummary.length; i += 20) summaryBatches.push(allJobsForSummary.slice(i, i + 20))
        const allSummaries = await Promise.all(summaryBatches.map(b => generateFitSummaries(b, updatedPref)))
        const merged = Object.assign({}, ...allSummaries)
        await Promise.all(
          Object.entries(merged).map(([jobId, summary]) =>
            supabase.from('job_postings').update({ fit_summary: summary }).eq('id', jobId)
          )
        )
      }

      const schemaWarning = !!starSignals.schema_fit_warning
      const profileUpdate: Record<string, unknown> = {
        star_raw: answer,
        preference_profile: updatedPref,
        stage_completed: Math.max(profile.stage_completed, 6),
        updated_at: new Date().toISOString(),
      }
      if (schemaWarning) {
        profileUpdate.schema_warnings = [
          ...(profile.schema_warnings || []),
          { stage: 6, details: starSignals.schema_fit_details || '' },
        ]
      }

      await supabase.from('career_profiles').update(profileUpdate).eq('id', profileId)

      return NextResponse.json({ success: true, stage: 6, schemaWarning })
    }

    // ── Stage 7: Adjacent exploration ─────────────────────────────────────────
    if (stage === 7) {
      const { data: greatJobs } = await supabase
        .from('job_postings')
        .select('title')
        .eq('profile_id', profileId)
        .eq('fit_tier', 'great')
        .eq('source_type', 'main')
        .order('fit_score', { ascending: false })
        .limit(5)

      const greatTitles = (greatJobs || []).map(j => j.title)
      const extracted = await extractAdjacent(answer, greatTitles)
      const { confidence: rawConf, search_terms: searchTerms, ...adjacentSignals } = extracted

      const prevConf: Partial<SignalConfidence> = profile.preference_profile?.signal_confidence || {}
      const signal_confidence: Partial<SignalConfidence> = {
        ...prevConf,
        adjacent: rawConf ?? 0.5,
      }

      const updatedPref: Partial<PreferenceProfile> = {
        ...(profile.preference_profile || {}),
        ...adjacentSignals,
        signal_confidence: signal_confidence as SignalConfidence,
      }

      const sanitizeForAdzuna7 = (q: string) => q.split(/ OR /i)[0].trim().split(' ').slice(0, 5).join(' ')
      const adjTerms = (searchTerms as string[]).slice(0, 3)
      console.log('[submit-stage] Stage 7 adjacent search terms:', adjTerms)

      const allAdjacentJobs: Array<ReturnType<typeof normalizeJSearchJob> | ReturnType<typeof normalizeAdzunaJob>> = []
      const adjResults = await Promise.all(adjTerms.map(t => fetchJSearch(t)))
      for (const { jobs } of adjResults) {
        for (const j of jobs) allAdjacentJobs.push(normalizeJSearchJob(j, profileId, 'adjacent', 7))
      }

      if (allAdjacentJobs.length === 0) {
        console.log('[submit-stage] Stage 7 JSearch fallback → Adzuna for adjacent')
        const adjAdzunaResults = await Promise.all(adjTerms.slice(0, 2).map(t => fetchAdzuna(sanitizeForAdzuna7(t))))
        for (const jobs of adjAdzunaResults) {
          for (const j of jobs) allAdjacentJobs.push(normalizeAdzunaJob(j as Record<string, unknown>, profileId, 'adjacent', 7))
        }
      }

      if (allAdjacentJobs.length > 0) {
        await supabase
          .from('job_postings')
          .upsert(allAdjacentJobs, { onConflict: 'profile_id,dedup_key', ignoreDuplicates: true })
      }

      await extractAndUpdateSignals(supabase, profileId)
      await rescoreAllJobs(supabase, profileId, updatedPref, 7)

      await supabase
        .from('career_profiles')
        .update({
          adjacent_raw: answer,
          preference_profile: updatedPref,
          stage_completed: Math.max(profile.stage_completed, 7),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId)

      return NextResponse.json({ success: true, stage: 7 })
    }

    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  } catch (err) {
    console.error('[submit-stage]', err)
    await logError({
      error_message: err instanceof Error ? err.message : 'Internal server error',
      source: 'submit-stage',
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
