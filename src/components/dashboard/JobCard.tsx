'use client'

import { useState } from 'react'
import { JobPosting } from '@/lib/types'

interface JobCardProps {
  job: JobPosting
  stageCompleted: number
  onIgnore?: () => void
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

export default function JobCard({ job, stageCompleted, onIgnore }: JobCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isUnlocked = stageCompleted >= 3
  const showScoreBadge = stageCompleted >= 4 && job.fit_score !== null && job.fit_tier !== null
  const showDescription = stageCompleted >= 5
  const sourceStyle = SOURCE_STYLES[job.source] || SOURCE_STYLES.remotive
  const salary = formatSalary(job.salary_min, job.salary_max)

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

      {/* Fit reasons / penalties (Stage 5+) */}
      {showDescription && (job.fit_reasons?.length || job.fit_penalties?.length) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(job.fit_reasons || []).map((r, i) => (
            <span key={i} className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded-full">
              ✓ {r}
            </span>
          ))}
          {(job.fit_penalties || []).map((p, i) => (
            <span key={i} className="text-xs bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full">
              ✗ {p}
            </span>
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
      <div className="flex items-center gap-3">
        {job.posted_at && (
          <span className="text-xs text-slate-600">
            {new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {onIgnore && (
            <button
              onClick={onIgnore}
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
