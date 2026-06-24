import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ignored } = await request.json()
    if (typeof ignored !== 'boolean') {
      return NextResponse.json({ error: 'ignored must be boolean' }, { status: 400 })
    }

    // Verify ownership via profile FK
    const { data: job, error } = await supabase
      .from('job_postings')
      .update({ ignored })
      .eq('id', id)
      .select('id, ignored')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ job })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
