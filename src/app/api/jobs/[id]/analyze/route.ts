import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { PreferenceProfile } from '@/lib/types'
import { logError } from '@/lib/logError'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function profileHash(profile: Partial<PreferenceProfile>): string {
  return createHash('sha256').update(JSON.stringify(profile)).digest('hex')
}

function formatConstraints(profile: Partial<PreferenceProfile>): string {
  const parts: string[] = []
  if (profile.excluded_industries?.length) parts.push(`No ${profile.excluded_industries.join(', ')}`)
  if (profile.excluded_company_types?.length) parts.push(`No ${profile.excluded_company_types.join(', ')}`)
  if (profile.excluded_locations?.length) parts.push(`Not in ${profile.excluded_locations.join(', ')}`)
  if (profile.remote_required) parts.push('Must be remote')
  if (profile.excluded_keywords?.length) parts.push(`Avoid: ${profile.excluded_keywords.join(', ')}`)
  return parts.join('; ') || 'None stated'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profileId } = await request.json()
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    const [{ data: job }, { data: profile }] = await Promise.all([
      supabase.from('job_postings').select('*').eq('id', id).single(),
      supabase.from('career_profiles').select('*').eq('id', profileId).eq('user_id', user.id).single(),
    ])

    if (!job || !profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const pref = (profile.preference_profile || {}) as Partial<PreferenceProfile>
    const currentHash = profileHash(pref)

    // Serve from cache if profile hasn't changed
    if (job.fit_analysis && job.fit_analysis_profile_hash === currentHash) {
      return NextResponse.json({ analysis: job.fit_analysis, cached: true })
    }

    const prompt = `You are an expert career advisor conducting an honest fit assessment.
You are NOT trying to encourage this person or sell them on the job.
Your job is to give them the clearest possible picture of where they fit and where they don't.

## Candidate Profile
Current role: ${pref.job_title || 'Not specified'}
Experience: ${pref.years_experience || '?'} years
Key skills: ${pref.key_skills?.join(', ') || 'Not specified'}
Career aspirations: ${profile.aspiration_raw || 'Not yet provided'}
What they value: ${profile.values_raw || 'Not yet provided'}
Their strongest demonstrated capability: ${profile.capabilities_raw || 'Not yet provided'}
Their featured accomplishment: ${profile.star_raw || 'Not yet provided'}
Hard constraints: ${formatConstraints(pref)}
Growth direction: ${pref.growth_direction || 'unclear'}

## Job Posting
Title: ${job.title}
Company: ${job.company || 'Unknown'}
${job.description ? `Full description:\n${job.description.slice(0, 3000)}` : 'No description available'}

## Your Task

Write a structured fit assessment with these four sections. Use the exact headers below.

### Where You Fit
2-4 genuine strengths relative to this specific role. Be specific — name the exact requirement and the exact evidence from their profile. Do not pad this section.

### Where You Don't Fit (or Might Struggle)
2-4 honest gaps or risks. This is the most important section. Name the specific requirement they may not meet, and why. If a gap is minor, say so. If it's a dealbreaker, say so.

### The One Question to Ask Yourself
One sentence. The single most important thing they need to decide about before applying. Not a gap — a values or priorities question.

### Bottom Line
2-3 sentences. Is this worth applying to? Under what conditions? Be direct.

Do not use phrases like "great opportunity" or "perfect fit" or "exciting role."
Do not soften gaps with "however" or "that said."
Write as if you are a trusted advisor who will be held accountable for this advice.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = (response.content[0] as { type: string; text: string }).text

    await supabase.from('job_postings').update({
      fit_analysis: analysis,
      fit_analysis_profile_hash: currentHash,
      fit_analysis_generated_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ analysis, cached: false })
  } catch (err) {
    await logError({ error_message: err instanceof Error ? err.message : String(err), source: 'analyze' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
