import { NextResponse } from 'next/server'
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

export async function GET() {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: allEvents }, { data: recentEvents }, { data: jobRows }] = await Promise.all([
    supabase.from('score_events').select('normalized_score, stage_scored'),
    supabase
      .from('score_events')
      .select('signals_fired, penalties_fired')
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('job_postings')
      .select('fit_tier')
      .eq('source_type', 'main'),
  ])

  // Score distribution — 20 buckets of width 0.05
  const bucketCounts = new Array(20).fill(0)
  for (const ev of allEvents || []) {
    if (ev.normalized_score == null) continue
    const idx = Math.min(Math.floor(ev.normalized_score / 0.05), 19)
    bucketCounts[idx]++
  }
  const distribution = bucketCounts.map((count, i) => ({
    bucket: parseFloat((i * 0.05).toFixed(2)),
    count,
  }))

  // Per-stage stats
  const byStageMap: Record<number, number[]> = {}
  for (const ev of allEvents || []) {
    if (ev.normalized_score == null) continue
    if (!byStageMap[ev.stage_scored]) byStageMap[ev.stage_scored] = []
    byStageMap[ev.stage_scored].push(ev.normalized_score)
  }
  const byStage = Object.entries(byStageMap).map(([stage, scores]) => {
    const sorted = [...scores].sort((a, b) => a - b)
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
    return {
      stage: parseInt(stage),
      avg: parseFloat(avg.toFixed(4)),
      median: parseFloat(median.toFixed(4)),
      min: parseFloat(sorted[0].toFixed(4)),
      max: parseFloat(sorted[sorted.length - 1].toFixed(4)),
      count: scores.length,
    }
  }).sort((a, b) => a.stage - b.stage)

  // Tier counts
  const tierCounts = { great: 0, good: 0, other: 0 }
  for (const job of jobRows || []) {
    if (job.fit_tier === 'great') tierCounts.great++
    else if (job.fit_tier === 'good') tierCounts.good++
    else if (job.fit_tier === 'other') tierCounts.other++
  }

  // Top signals and penalties (last 30 days)
  const signalCounts: Record<string, number> = {}
  const penaltyCounts: Record<string, number> = {}
  for (const ev of recentEvents || []) {
    const signals = ev.signals_fired as string[] || []
    const penalties = ev.penalties_fired as string[] || []
    for (const s of signals) signalCounts[s] = (signalCounts[s] || 0) + 1
    for (const p of penalties) penaltyCounts[p] = (penaltyCounts[p] || 0) + 1
  }
  const topSignals = Object.entries(signalCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([label, count]) => ({ label, count }))
  const topPenalties = Object.entries(penaltyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([label, count]) => ({ label, count }))

  return NextResponse.json({ distribution, byStage, tierCounts, topSignals, topPenalties })
}
