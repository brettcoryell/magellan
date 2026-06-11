import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

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
}
