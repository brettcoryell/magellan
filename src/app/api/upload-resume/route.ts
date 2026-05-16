import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
// @ts-ignore
import pdfParse from 'pdf-parse'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await pdfParse(buffer)
  const resumeText = parsed.text

  const extraction = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract from this resume: current job title, years of experience, industry, key skills (up to 10), most recent company type. Return as JSON only.\n\n${resumeText.slice(0, 8000)}`
    }]
  })

  let extractedProfile: Record<string, unknown> = {}
  try {
    const text = (extraction.content[0] as { type: string; text: string }).text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) extractedProfile = JSON.parse(jsonMatch[0])
  } catch {}

  // Upsert career profile
  const { data: profile, error } = await supabase
    .from('career_profiles')
    .upsert({
      user_id: user.id,
      resume_text: resumeText,
      resume_filename: file.name,
      stage_completed: 1,
      preference_profile: extractedProfile,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ profile, extractedProfile })
}
