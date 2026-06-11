import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { PreferenceProfile } from '@/lib/types'
import { logError } from '@/lib/logError'

const STAGE_PROFILE_FIELDS: Record<number, Array<keyof PreferenceProfile>> = {
  2: ['excluded_industries', 'excluded_company_types', 'excluded_locations', 'remote_required', 'excluded_keywords',
      'values_signals', 'work_style', 'motivation_type', 'demonstrated_capabilities', 'problem_domain', 'differentiator',
      'star_situation', 'star_action', 'star_result', 'star_skills_demonstrated', 'star_scope', 'star_industry_context',
      'adjacent_interest', 'adjacent_rejection', 'signal_confidence'],
  3: ['desired_functions', 'desired_industries', 'desired_company_types', 'growth_direction', 'keywords',
      'values_signals', 'work_style', 'motivation_type', 'demonstrated_capabilities', 'problem_domain', 'differentiator',
      'star_situation', 'star_action', 'star_result', 'star_skills_demonstrated', 'star_scope', 'star_industry_context',
      'adjacent_interest', 'adjacent_rejection'],
  4: ['values_signals', 'work_style', 'motivation_type', 'demonstrated_capabilities', 'problem_domain', 'differentiator',
      'star_situation', 'star_action', 'star_result', 'star_skills_demonstrated', 'star_scope', 'star_industry_context',
      'adjacent_interest', 'adjacent_rejection'],
  5: ['demonstrated_capabilities', 'problem_domain', 'differentiator',
      'star_situation', 'star_action', 'star_result', 'star_skills_demonstrated', 'star_scope', 'star_industry_context',
      'adjacent_interest', 'adjacent_rejection'],
  6: ['star_situation', 'star_action', 'star_result', 'star_skills_demonstrated', 'star_scope', 'star_industry_context',
      'adjacent_interest', 'adjacent_rejection'],
  7: ['adjacent_interest', 'adjacent_rejection'],
}

const STAGE_RAW_FIELDS: Record<number, string[]> = {
  2: ['constraints_raw', 'aspiration_raw', 'values_raw', 'capabilities_raw', 'star_raw', 'adjacent_raw'],
  3: ['aspiration_raw', 'values_raw', 'capabilities_raw', 'star_raw', 'adjacent_raw'],
  4: ['values_raw', 'capabilities_raw', 'star_raw', 'adjacent_raw'],
  5: ['capabilities_raw', 'star_raw', 'adjacent_raw'],
  6: ['star_raw', 'adjacent_raw'],
  7: ['adjacent_raw'],
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stage, profileId } = await request.json()
    if (!stage || !profileId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: profile } = await supabase
      .from('career_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (stage > profile.stage_completed) return NextResponse.json({ error: 'Cannot navigate to future stage' }, { status: 400 })

    // Build updated preference_profile with cleared fields
    const pref = { ...(profile.preference_profile || {}) } as Partial<PreferenceProfile>
    const fieldsToRemove = STAGE_PROFILE_FIELDS[stage] || []
    for (const field of fieldsToRemove) {
      delete pref[field]
    }
    // Reset confidence for cleared stages
    if (stage <= 7) {
      const newConf = { ...(pref.signal_confidence || {}) }
      if (stage <= 2) { newConf.constraints = 0.5 }
      if (stage <= 3) { newConf.aspiration = 0.5 }
      if (stage <= 4) { newConf.values = 0.5 }
      if (stage <= 5) { newConf.capabilities = 0.5 }
      if (stage <= 6) { newConf.star = 0.5 }
      if (stage <= 7) { newConf.adjacent = 0.5 }
      pref.signal_confidence = newConf as PreferenceProfile['signal_confidence']
    }

    // Build profile update
    const profileUpdate: Record<string, unknown> = {
      preference_profile: pref,
      stage_completed: stage - 1,
      schema_warnings: [],
      updated_at: new Date().toISOString(),
    }
    for (const field of STAGE_RAW_FIELDS[stage] || []) {
      profileUpdate[field] = null
    }

    // Delete job_postings for the target stage and beyond
    if (stage <= 2) {
      // Clear all jobs
      await supabase.from('score_events').delete().eq('profile_id', profileId)
      await supabase.from('job_postings').delete().eq('profile_id', profileId)
    } else if (stage === 7) {
      // Clear only adjacent/relaxed jobs
      await supabase.from('job_postings').delete()
        .eq('profile_id', profileId)
        .in('source_type', ['adjacent', 'relaxed'])
    } else {
      // Clear jobs fetched at this stage or later
      const stageThreshold = stage === 3 ? 3 : stage
      await supabase.from('score_events').delete().eq('profile_id', profileId)
      await supabase.from('job_postings').delete()
        .eq('profile_id', profileId)
        .gte('fetched_at_stage', stageThreshold)
    }

    await supabase.from('career_profiles').update(profileUpdate).eq('id', profileId)

    // Return fresh profile and jobs
    const [{ data: updatedProfile }, { data: updatedJobs }] = await Promise.all([
      supabase.from('career_profiles').select('*').eq('id', profileId).single(),
      supabase.from('job_postings').select('*').eq('profile_id', profileId)
        .eq('ignored', false).order('fit_score', { ascending: false, nullsFirst: false }),
    ])

    return NextResponse.json({ profile: updatedProfile, jobs: updatedJobs || [] })
  } catch (err) {
    await logError({ error_message: err instanceof Error ? err.message : String(err), source: 'navigate-to-stage' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
