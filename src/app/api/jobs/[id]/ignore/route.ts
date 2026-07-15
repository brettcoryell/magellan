import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let profileId: string | null = null

  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ignored, profileId: requestedProfileId } = await request.json()
    profileId = typeof requestedProfileId === 'string' ? requestedProfileId : null
    if (typeof ignored !== 'boolean' || !profileId) {
      return NextResponse.json({ error: 'ignored must be boolean and profileId is required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('career_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: job, error } = await supabase
      .from('job_postings')
      .update({ ignored })
      .eq('id', id)
      .eq('profile_id', profileId)
      .select('id, ignored')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ job })
  } catch (err) {
    const { logError } = await import('@/lib/logError')
    await logError({ profile_id: profileId, error_message: err instanceof Error ? err.message : String(err), source: 'ignore-job' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
