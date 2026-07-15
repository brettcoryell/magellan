import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  let profileId: string | null = null

  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    profileId = searchParams.get('profileId')
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    const { data: profile } = await supabase
      .from('career_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const showIgnored = searchParams.get('showIgnored') === 'true'

    let query = supabase
      .from('job_postings')
      .select('*')
      .eq('profile_id', profileId)
      .order('fit_score', { ascending: false, nullsFirst: false })

    if (!showIgnored) {
      query = query.eq('ignored', false)
    }

    const { data: jobs, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ jobs })
  } catch (err) {
    const { logError } = await import('@/lib/logError')
    await logError({ profile_id: profileId, error_message: err instanceof Error ? err.message : String(err), source: 'list-jobs' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
