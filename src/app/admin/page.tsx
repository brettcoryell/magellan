import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClearErrorsButton from './ClearErrorsButton'

const GREAT_THRESHOLD = 0.72
const GOOD_THRESHOLD = 0.50

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string; stage?: string; source?: string; since?: string }
}) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!adminProfile?.is_admin) redirect('/')

  const tab = searchParams.tab === 'errors' ? 'errors' : 'scoring'

  // ── Errors tab data ──────────────────────────────────────────────────────
  type ErrorRow = {
    id: string
    source: string | null
    stage: number | null
    error_code: string | null
    created_at: string
    error_message: string
    profile_id: string | null
    query_context: Record<string, unknown> | null
  }
  let errors: ErrorRow[] = []
  if (tab === 'errors') {
    let query = supabase
      .from('error_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (searchParams.stage) query = query.eq('stage', parseInt(searchParams.stage))
    if (searchParams.source) query = query.eq('source', searchParams.source)
    if (searchParams.since) query = query.gte('created_at', searchParams.since)
    const { data } = await query
    errors = (data || []) as ErrorRow[]
  }

  // ── Scoring tab data ─────────────────────────────────────────────────────
  type ByStageRow = { stage: number; avg: number; median: number; min: number; max: number; count: number }
  type SignalRow = { label: string; count: number }
  let distribution: { bucket: number; count: number }[] = []
  let byStage: ByStageRow[] = []
  const tierCounts = { great: 0, good: 0, other: 0 }
  let topSignals: SignalRow[] = []
  let topPenalties: SignalRow[] = []

  if (tab === 'scoring') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: allEvents }, { data: recentEvents }, { data: jobRows }] = await Promise.all([
      supabase.from('score_events').select('normalized_score, stage_scored'),
      supabase.from('score_events').select('signals_fired, penalties_fired').gte('created_at', thirtyDaysAgo),
      supabase.from('job_postings').select('fit_tier').eq('source_type', 'main'),
    ])

    const bucketCounts = new Array(20).fill(0)
    for (const ev of allEvents || []) {
      if (ev.normalized_score == null) continue
      const idx = Math.min(Math.floor(ev.normalized_score / 0.05), 19)
      bucketCounts[idx]++
    }
    distribution = bucketCounts.map((count, i) => ({ bucket: parseFloat((i * 0.05).toFixed(2)), count }))

    const byStageMap: Record<number, number[]> = {}
    for (const ev of allEvents || []) {
      if (ev.normalized_score == null) continue
      if (!byStageMap[ev.stage_scored]) byStageMap[ev.stage_scored] = []
      byStageMap[ev.stage_scored].push(ev.normalized_score)
    }
    byStage = Object.entries(byStageMap).map(([stage, scores]) => {
      const sorted = [...scores].sort((a, b) => a - b)
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
      return {
        stage: parseInt(stage),
        avg: parseFloat(avg.toFixed(3)),
        median: parseFloat(median.toFixed(3)),
        min: parseFloat(sorted[0].toFixed(3)),
        max: parseFloat(sorted[sorted.length - 1].toFixed(3)),
        count: scores.length,
      }
    }).sort((a, b) => a.stage - b.stage)

    for (const job of jobRows || []) {
      if (job.fit_tier === 'great') tierCounts.great++
      else if (job.fit_tier === 'good') tierCounts.good++
      else if (job.fit_tier === 'other') tierCounts.other++
    }

    const signalCounts: Record<string, number> = {}
    const penaltyCounts: Record<string, number> = {}
    for (const ev of recentEvents || []) {
      const signals = (ev.signals_fired as string[]) || []
      const penalties = (ev.penalties_fired as string[]) || []
      for (const s of signals) signalCounts[s] = (signalCounts[s] || 0) + 1
      for (const p of penalties) penaltyCounts[p] = (penaltyCounts[p] || 0) + 1
    }
    topSignals = Object.entries(signalCounts).sort(([, a], [, b]) => b - a).slice(0, 15).map(([label, count]) => ({ label, count }))
    topPenalties = Object.entries(penaltyCounts).sort(([, a], [, b]) => b - a).slice(0, 15).map(([label, count]) => ({ label, count }))
  }

  const maxCount = distribution.length ? Math.max(...distribution.map(d => d.count), 1) : 1

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-100">Admin</h1>
          <a
            href="/dashboard"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 rounded-lg px-3 py-1.5"
          >
            ← Dashboard
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          <a
            href="/admin"
            className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
              tab === 'scoring'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Scoring
          </a>
          <a
            href="/admin?tab=errors"
            className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
              tab === 'errors'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Errors
          </a>
        </div>

        {/* ── Errors tab ─────────────────────────────────────────────────────── */}
        {tab === 'errors' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 font-mono">{errors.length} entries</span>
              <ClearErrorsButton />
            </div>

            <form className="flex gap-3 mb-6 flex-wrap">
              <input type="hidden" name="tab" value="errors" />
              <input
                name="stage"
                defaultValue={searchParams.stage}
                placeholder="Stage #"
                type="number"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-24 focus:outline-none focus:border-amber-500/60"
              />
              <input
                name="source"
                defaultValue={searchParams.source}
                placeholder="Source"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-40 focus:outline-none focus:border-amber-500/60"
              />
              <input
                name="since"
                defaultValue={searchParams.since}
                placeholder="Since (ISO date)"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-48 focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-medium hover:bg-amber-400 transition-colors"
              >
                Filter
              </button>
              <a
                href="/admin?tab=errors"
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear
              </a>
            </form>

            {errors.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                <p className="text-slate-400">No errors found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {errors.map((err) => (
                  <details
                    key={err.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl"
                  >
                    <summary className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-800/40 rounded-xl list-none">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {err.source && (
                            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                              {err.source}
                            </span>
                          )}
                          {err.stage != null && (
                            <span className="text-xs bg-amber-950/60 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded">
                              Stage {err.stage}
                            </span>
                          )}
                          {err.error_code && (
                            <span className="text-xs bg-red-950/60 text-red-400 border border-red-800/60 px-1.5 py-0.5 rounded">
                              {err.error_code}
                            </span>
                          )}
                          <span className="text-xs text-slate-600 font-mono ml-auto">
                            {new Date(err.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 font-medium truncate">{err.error_message}</p>
                        {err.profile_id && (
                          <p className="text-xs text-slate-600 mt-0.5 font-mono">{err.profile_id}</p>
                        )}
                      </div>
                    </summary>
                    <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                      <p className="text-xs text-slate-400 font-semibold mb-1">Full message</p>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap mb-3">{err.error_message}</p>
                      {err.query_context && Object.keys(err.query_context).length > 0 && (
                        <>
                          <p className="text-xs text-slate-400 font-semibold mb-1">Query context</p>
                          <pre className="text-xs text-slate-400 bg-slate-800 rounded-lg p-3 overflow-x-auto">
                            {JSON.stringify(err.query_context, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Scoring tab ────────────────────────────────────────────────────── */}
        {tab === 'scoring' && (
          <div className="space-y-6">
            {/* Histogram + Tier counts row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Histogram */}
              <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Score Distribution
                </p>
                <div className="text-xs text-slate-600 mb-1 flex justify-between">
                  <span>0.0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                </div>
                <svg
                  viewBox="0 0 400 80"
                  className="w-full"
                  preserveAspectRatio="none"
                  style={{ height: '80px' }}
                >
                  {distribution.map((d, i) => {
                    const barHeight = maxCount > 0 ? (d.count / maxCount) * 72 : 0
                    return (
                      <rect
                        key={i}
                        x={i * 20 + 1}
                        y={80 - barHeight}
                        width={18}
                        height={barHeight}
                        className="fill-slate-700 hover:fill-slate-500"
                      />
                    )
                  })}
                  {/* Good threshold line at 0.50 */}
                  <line
                    x1={GOOD_THRESHOLD * 400}
                    y1={0}
                    x2={GOOD_THRESHOLD * 400}
                    y2={80}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.7}
                  />
                  {/* Great threshold line at 0.72 */}
                  <line
                    x1={GREAT_THRESHOLD * 400}
                    y1={0}
                    x2={GREAT_THRESHOLD * 400}
                    y2={80}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  {/* Threshold labels */}
                  <text x={GOOD_THRESHOLD * 400 - 2} y={10} fill="#f59e0b" fontSize={7} textAnchor="end" opacity={0.8}>Good</text>
                  <text x={GREAT_THRESHOLD * 400 - 2} y={10} fill="#f59e0b" fontSize={7} textAnchor="end">Great</text>
                </svg>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-0.5 border-t border-dashed border-amber-500/70" />
                    Good ≥ {GOOD_THRESHOLD}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-0.5 border-t border-dashed border-amber-500" />
                    Great ≥ {GREAT_THRESHOLD}
                  </span>
                </div>
              </div>

              {/* Tier counts */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Tier Counts (current)
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-medium">Great (≥ {GREAT_THRESHOLD})</span>
                    <span className="text-lg font-bold text-amber-400">{tierCounts.great}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sky-400 font-medium">Good (≥ {GOOD_THRESHOLD})</span>
                    <span className="text-lg font-bold text-sky-400">{tierCounts.good}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Other</span>
                    <span className="text-lg font-bold text-slate-400">{tierCounts.other}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-stage stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Score Events by Stage
              </p>
              {byStage.length === 0 ? (
                <p className="text-xs text-slate-600">No score events recorded yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left pb-2 font-medium">Stage</th>
                      <th className="text-right pb-2 font-medium">Avg</th>
                      <th className="text-right pb-2 font-medium">Median</th>
                      <th className="text-right pb-2 font-medium">Min</th>
                      <th className="text-right pb-2 font-medium">Max</th>
                      <th className="text-right pb-2 font-medium">Events</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {byStage.map(row => (
                      <tr key={row.stage} className="text-slate-300">
                        <td className="py-2 font-medium">{row.stage}</td>
                        <td className="py-2 text-right font-mono">{row.avg.toFixed(3)}</td>
                        <td className="py-2 text-right font-mono">{row.median.toFixed(3)}</td>
                        <td className="py-2 text-right font-mono text-slate-500">{row.min.toFixed(3)}</td>
                        <td className="py-2 text-right font-mono text-slate-500">{row.max.toFixed(3)}</td>
                        <td className="py-2 text-right text-slate-500">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top signals + penalties */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Top Signals Fired (last 30 days)
                </p>
                {topSignals.length === 0 ? (
                  <p className="text-xs text-slate-600">No data yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {topSignals.map(s => (
                      <div key={s.label} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-emerald-400 truncate">{s.label}</span>
                        <span className="text-xs font-mono text-slate-500 shrink-0">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Top Penalties Fired (last 30 days)
                </p>
                {topPenalties.length === 0 ? (
                  <p className="text-xs text-slate-600">No data yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {topPenalties.map(p => (
                      <div key={p.label} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-red-400 truncate">{p.label}</span>
                        <span className="text-xs font-mono text-slate-500 shrink-0">{p.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
