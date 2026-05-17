import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
// @ts-expect-error pdf-parse lacks type declarations
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
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
      max_tokens: 768,
      messages: [{
        role: 'user',
        content: `Extract from this resume. Return ONLY valid JSON with these EXACT field names — do not rename them:
{
  "job_title": "most recent job title verbatim",
  "seniority_level": "entry|mid|senior|director|vp|c-level",
  "years_experience": 0,
  "industries": ["industry1"],
  "key_skills": ["skill1", "skill2"],
  "company_type": "startup|enterprise|agency|consulting|nonprofit|government|unclear",
  "job_search_titles": ["title1", "title2", "title3"]
}

seniority_level rules: entry=<3 yrs or IC contributor with no lead experience, mid=3-7 yrs, senior=7-12 yrs IC, director=first-line leader, vp=VP/SVP/EVP, c-level=C-suite or equivalent (CIO, CISO, CTO, CEO, COO, etc.)
job_search_titles: 3-4 realistic job titles this person should search for, ordered by fit. Include both the exact title they held AND lateral/aspirational variations (e.g. ["Chief Information Officer", "CIO", "VP of Technology", "Chief Digital Officer"]).

Resume:
${resumeText.slice(0, 8000)}`
      }]
    })

    let extractedProfile: Record<string, unknown> = {}
    try {
      const text = (extraction.content[0] as { type: string; text: string }).text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) extractedProfile = JSON.parse(jsonMatch[0])
    } catch {}

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
  } catch (err) {
    console.error('[upload-resume]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
