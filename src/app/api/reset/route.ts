import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('career_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ success: true })

    const profileId = profile.id

    // Delete dependent rows first, then the profile
    await supabase.from('score_events').delete().eq('profile_id', profileId)
    await supabase.from('job_postings').delete().eq('profile_id', profileId)
    await supabase.from('error_log').delete().eq('profile_id', profileId)
    await supabase.from('career_profiles').delete().eq('id', profileId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
