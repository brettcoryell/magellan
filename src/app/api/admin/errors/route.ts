import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return null
  return supabase
}

export async function GET(request: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const source = searchParams.get('source')
  const since = searchParams.get('since')

  let query = supabase
    .from('error_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (stage) query = query.eq('stage', parseInt(stage))
  if (source) query = query.eq('source', source)
  if (since) query = query.gte('created_at', since)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ errors: data })
}

export async function DELETE() {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('error_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
