'use client'

import { useState } from 'react'
import { FitSignal, JobPosting } from '@/lib/types'

interface JobCardProps {
  job: JobPosting
  stageCompleted: number
  onIgnore?: (id: string) => void
  onRestore?: (id: string) => void
}

const SOURCE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  remotive: { label: 'Remotive', bg: 'bg-emerald-950/60 border-emerald-800/60', text: 'text-emerald-400' },
  adzuna: { label: 'Adzuna', bg: 'bg-blue-950/60 border-blue-800/60', text: 'text-blue-400' },
  jsearch: { label: 'JSearch', bg: 'bg-violet-950/60 border-violet-800/60', text: 'text-violet-400' },
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`
    return `$${n}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  if (max) return `Up to ${fmt(max)}`
  return null
}

function ScoreBadge({ score, tier }: { score: number; tier: 'great' | 'good' | 'other' }) {
  const pct = Math.round(score * 100)
  const styles = {
    great: 'bg-amber-500 text-slate-950',
    good: 'bg-slate-600 text-slate-100',
    other: 'bg-slate-800 text-slate-500 border border-slate-700',
  }
  return (
    <div className={`absolute -top-2.5 -right-2.5 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${styles[tier]}`}>
      {pct}
    </div>
  )
}

function FitChip({ signal, positive }: { signal: FitSignal; positive: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
          positive
            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/50'
            : 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-900/50'
        }`}
      >
        {positive ? '✓' : '✗'} {signal.label}
      </button>
      {open && signal.detail && (
        <div className="absolute z-10 bottom-full mb-1 left-0 w-56 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 shadow-xl leading-relaxed">
          {signal.detail}
        </div>
      )}
    </div>
  )
}

function AnalysisPanel({ jobId, profileId }: { jobId: string; profileId: string }) {
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (!open) {
      setOpen(true)
      if (!analysis) {
        setLoading(true)
        setError(null)
        try {
          const res = await fetch(`/api/jobs/${jobId}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to analyze')
          setAnalysis(data.analysis)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
          setLoading(false)
        }
      }
    } else {
      setOpen(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 ${
          open
            ? 'border-amber-600 bg-amber-500/10 text-amber-400'
            : 'border-slate-600 text-slate-400 hover:border-amber-600 hover:text-amber-400'
        }`}
      >
        {open ? '▲ ' : '▼ '}Full Analysis
      </button>
      {open && (
        <div className="mt-3 border border-slate-700 rounded-lg p-4 bg-slate-800/60">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <svg className="animate-spin w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating honest assessment…
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {analysis && (
            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap prose-invert">
              {analysis}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JobCard({ job, stageCompleted, onIgnore, onRestore }: JobCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isUnlocked = stageCompleted >= 3
  const showScoreBadge = stageCompleted >= 4 && job.fit_score !== null && job.fit_tier !== null
  const showDescription = stageCompleted >= 5
  const sourceStyle = SOURCE_STYLES[job.source] || SOURCE_STYLES.remotive
  const salary = formatSalary(job.salary_min, job.salary_max)

  if (job.ignored) {
    return (
      <div className="relative bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 opacity-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sourceStyle.bg} ${sourceStyle.text}`}>
              {sourceStyle.label}
            </span>
            <span className="text-xs text-slate-600 border border-slate-700 rounded-full px-2 py-0.5">Ignored</span>
          </div>
          {onRestore && (
            <button
              onClick={() => onRestore(job.id)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-800"
            >
              Restore
            </button>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-2">{isUnlocked ? job.title : '••••••••'}</p>
        {job.company && <p className="text-xs text-slate-700 mt-0.5">{job.company}</p>}
      </div>
    )
  }

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 group">
      {showScoreBadge && (
        <ScoreBadge score={job.fit_score!} tier={job.fit_tier!} />
      )}

      {/* Header row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap pr-8">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sourceStyle.bg} ${sourceStyle.text}`}>
          {sourceStyle.label}
        </span>
        {stageCompleted < 4 && job.fit_tier && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
            job.fit_tier === 'great' ? 'bg-amber-950/60 border-amber-700/60 text-amber-400' :
            job.fit_tier === 'good' ? 'bg-sky-950/60 border-sky-800/60 text-sky-400' :
            'bg-slate-800/60 border-slate-700/60 text-slate-400'
          }`}>
            {job.fit_tier === 'great' ? 'Great Match' : job.fit_tier === 'good' ? 'Good Match' : 'Other'}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="mb-2">
        {!isUnlocked ? (
          <div
            className="overflow-hidden rounded cursor-help"
            title="Tell us about your career aspirations to reveal job titles"
          >
            <h3 className="text-base font-semibold text-slate-100 blur-xl select-none pointer-events-none">
              {job.title}
            </h3>
          </div>
        ) : (
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
            {job.title}
          </h3>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 mb-3">
        {job.company && (
          <span className="font-medium text-slate-300">{job.company}</span>
        )}
        {job.company && job.location && (
          <span className="text-slate-700">·</span>
        )}
        {job.location && (
          <span>{job.location}</span>
        )}
        {job.remote && !job.location?.toLowerCase().includes('remote') && (
          <>
            <span className="text-slate-700">·</span>
            <span className="bg-emerald-950/40 text-emerald-400 text-xs font-medium px-1.5 py-0.5 rounded border border-emerald-900/60">
              Remote
            </span>
          </>
        )}
        {salary && (
          <>
            <span className="text-slate-700">·</span>
            <span className="text-slate-400 text-xs font-mono">{salary}</span>
          </>
        )}
      </div>

      {/* Fit summary (Stage 5+) */}
      {showDescription && job.fit_summary && (
        <p className="text-xs text-slate-400 italic mb-3 leading-relaxed">
          {job.fit_summary}
        </p>
      )}

      {/* Fit reasons / penalties (Stage 5+) — clickable chips with popovers */}
      {showDescription && (job.fit_reasons?.length || job.fit_penalties?.length) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(job.fit_reasons || []).map((r, i) => (
            <FitChip key={i} signal={r} positive={true} />
          ))}
          {(job.fit_penalties || []).map((p, i) => (
            <FitChip key={i} signal={p} positive={false} />
          ))}
        </div>
      )}

      {/* Expandable description (Stage 5+) */}
      {showDescription && job.description && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Hide description' : 'Show description'}
          </button>
          {expanded && (
            <div className="mt-2 text-xs text-slate-400 leading-relaxed max-h-48 overflow-y-auto border border-slate-800 rounded-lg p-3 whitespace-pre-wrap">
              {job.description}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 flex-wrap">
        {job.posted_at && (
          <span className="text-xs text-slate-600">
            {new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Full Analysis — unlocks after Stage 6 (STAR story) */}
          {stageCompleted >= 6 && (
            <AnalysisPanel jobId={job.id} profileId={job.profile_id} />
          )}
          {onIgnore && (
            <button
              onClick={() => onIgnore(job.id)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded hover:bg-slate-800"
            >
              Ignore
            </button>
          )}
          <a
            href={isUnlocked ? job.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => !isUnlocked && e.preventDefault()}
            title={!isUnlocked ? 'Tell us about your career aspirations to unlock job links' : undefined}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              isUnlocked
                ? 'border-amber-700/60 text-amber-400 hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950'
                : 'border-slate-700 text-slate-600 cursor-not-allowed'
            }`}
          >
            View Job →
          </a>
        </div>
      </div>
    </div>
  )
}
