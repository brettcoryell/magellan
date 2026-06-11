import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scoreJob, assignTier } from '@/lib/scoring'
import { JobSignals, PreferenceProfile, SignalConfidence } from '@/lib/types'
import { logError } from '@/lib/logError'

// Temporarily zero one constraint's confidence and re-score all main jobs.
// Returns the normalized score delta per job.
function scoreDeltaWithoutConstraint(
  jobs: Array<{ id: string; signals: Partial<JobSignals> }>,
  profile: Partial<PreferenceProfile>,
  constraintKey: keyof Pick<PreferenceProfile, 'excluded_industries' | 'excluded_company_types' | 'excluded_locations' | 'remote_required' | 'excluded_keywords'>,
  confidenceKey: keyof SignalConfidence
): Map<string, number> {
  const relaxedConf: Partial<SignalConfidence> = {
    ...(profile.signal_confidence || {}),
    [confidenceKey]: 0,
  }
  const relaxedProfile: Partial<PreferenceProfile> = {
    ...profile,
    signal_confidence: relaxedConf as SignalConfidence,
  }

  const deltas = new Map<string, number>()
  for (const job of jobs) {
    if (!job.signals || Object.keys(job.signals).length === 0) continue
    const before = scoreJob(job.signals, profile).normalized
    const after = scoreJob(job.signals, relaxedProfile).normalized
    deltas.set(job.id, after - before)
  }
  return deltas
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileId = request.nextUrl.searchParams.get('profileId')
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    // Verify ownership
    const { data: profile } = await supabase
      .from('career_profiles')
      .select('preference_profile')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const pref = (profile.preference_profile || {}) as Partial<PreferenceProfile>

    // Load all main jobs with signals and current scores
    const { data: mainJobs } = await supabase
      .from('job_postings')
      .select('*')
      .eq('profile_id', profileId)
      .eq('source_type', 'main')
      .not('signals', 'eq', '{}')

    const jobs = mainJobs || []

    // Constraint relaxation — try each constraint dimension
    const constraintChecks: Array<{
      key: keyof Pick<PreferenceProfile, 'excluded_industries' | 'excluded_company_types' | 'excluded_locations' | 'remote_required' | 'excluded_keywords'>
      confKey: keyof SignalConfidence
      label: string
    }> = [
      { key: 'excluded_industries', confKey: 'constraints', label: 'industry constraint' },
      { key: 'excluded_company_types', confKey: 'constraints', label: 'company type constraint' },
      { key: 'excluded_locations', confKey: 'constraints', label: 'location constraint' },
      { key: 'remote_required', confKey: 'constraints', label: 'remote requirement' },
      { key: 'excluded_keywords', confKey: 'constraints', label: 'keyword constraint' },
    ]

    const improvementByJob = new Map<string, number>()
    const relaxedConstraintByJob = new Map<string, string>()

    for (const check of constraintChecks) {
      const hasConstraint = Array.isArray(pref[check.key])
        ? (pref[check.key] as string[]).length > 0
        : !!pref[check.key]
      if (!hasConstraint) continue

      const deltas = scoreDeltaWithoutConstraint(jobs, pref, check.key, check.confKey)
      deltas.forEach((delta, jobId) => {
        if (delta > (improvementByJob.get(jobId) ?? 0)) {
          improvementByJob.set(jobId, delta)
          relaxedConstraintByJob.set(jobId, check.label)
        }
      })
    }

    // Also try relaxing the seniority requirement — the seniority penalty has no confidence
    // damping so it's invisible to the constraint checks above. This surfaces jobs that score
    // well on everything except seniority level (e.g. a great Director role for a VP/CIO).
    if (pref.seniority_level) {
      const seniorityRelaxedProfile: Partial<PreferenceProfile> = { ...pref, seniority_level: undefined }
      for (const job of jobs) {
        if (!job.signals || Object.keys(job.signals).length === 0) continue
        const before = scoreJob(job.signals as Partial<JobSignals>, pref).normalized
        const after = scoreJob(job.signals as Partial<JobSignals>, seniorityRelaxedProfile).normalized
        const delta = after - before
        if (delta > (improvementByJob.get(job.id) ?? 0)) {
          improvementByJob.set(job.id, delta)
          relaxedConstraintByJob.set(job.id, 'seniority level')
        }
      }
    }

    // Find jobs that jump a tier when any constraint is relaxed
    const relaxedJobs = jobs
      .filter(job => {
        const improvement = improvementByJob.get(job.id) ?? 0
        if (improvement <= 0) return false
        const currentTier = assignTier(job.fit_score ?? 0)
        const newNorm = Math.min(1, (job.fit_score ?? 0) + improvement)
        const newTier = assignTier(newNorm)
        return newTier !== currentTier
      })
      .sort((a, b) => (improvementByJob.get(b.id) ?? 0) - (improvementByJob.get(a.id) ?? 0))
      .slice(0, 5)
      .map(job => ({
        ...job,
        improvement: improvementByJob.get(job.id) ?? 0,
        relaxed_constraint: relaxedConstraintByJob.get(job.id) ?? '',
        relaxed_tier: assignTier(Math.min(1, (job.fit_score ?? 0) + (improvementByJob.get(job.id) ?? 0))),
      }))

    // Load adjacent jobs (already stored by Stage 6 submit)
    const { data: adjacentJobs } = await supabase
      .from('job_postings')
      .select('*')
      .eq('profile_id', profileId)
      .eq('source_type', 'adjacent')
      .order('fit_score', { ascending: false })
      .limit(20)

    return NextResponse.json({
      relaxed: relaxedJobs,
      adjacent: adjacentJobs || [],
    })
  } catch (err) {
    await logError({ error_message: err instanceof Error ? err.message : String(err), source: 'broader-vision' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
