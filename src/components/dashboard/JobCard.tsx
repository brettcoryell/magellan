'use client'

import { JobPosting } from '@/lib/types'

interface JobCardProps {
  job: JobPosting
  stageCompleted: number
}

const SOURCE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  remotive: { label: 'Remotive', bg: 'bg-emerald-950/60 border-emerald-800/60', text: 'text-emerald-400' },
  adzuna: { label: 'Adzuna', bg: 'bg-blue-950/60 border-blue-800/60', text: 'text-blue-400' },
  jsearch: { label: 'JSearch', bg: 'bg-violet-950/60 border-violet-800/60', text: 'text-violet-400' },
}

const TIER_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  great: { label: 'Great Match', bg: 'bg-amber-950/60 border-amber-700/60', text: 'text-amber-400' },
  good: { label: 'Good Match', bg: 'bg-sky-950/60 border-sky-800/60', text: 'text-sky-400' },
  other: { label: 'Other', bg: 'bg-slate-800/60 border-slate-700/60', text: 'text-slate-400' },
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

export default function JobCard({ job, stageCompleted }: JobCardProps) {
  const isUnlocked = stageCompleted >= 3
  const sourceStyle = SOURCE_STYLES[job.source] || SOURCE_STYLES.remotive
  const tierStyle = job.fit_tier ? TIER_STYLES[job.fit_tier] : null
  const salary = formatSalary(job.salary_min, job.salary_max)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 group">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sourceStyle.bg} ${sourceStyle.text}`}>
          {sourceStyle.label}
        </span>
        {tierStyle && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tierStyle.bg} ${tierStyle.text}`}>
            {tierStyle.label}
          </span>
        )}
        {job.fit_score !== null && (
          <span className="text-xs text-slate-600 font-mono ml-auto">
            {Math.round(job.fit_score * 100)}% fit
          </span>
        )}
      </div>

      {/* Title */}
      <div className="relative mb-2">
        {!isUnlocked ? (
          <div className="relative">
            <h3 className="text-base font-semibold text-slate-100 filter blur-sm select-none">
              {job.title}
            </h3>
            <div className="absolute inset-0 flex items-center justify-start gap-1.5 pl-0.5">
              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-slate-500">Complete all stages to unlock</span>
            </div>
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
        {job.remote && (
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

      {/* Footer */}
      <div className="flex items-center justify-between">
        {job.posted_at && (
          <span className="text-xs text-slate-600">
            {new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <a
          href={isUnlocked ? job.url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => !isUnlocked && e.preventDefault()}
          className={`ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 ${
            isUnlocked
              ? 'border-amber-700/60 text-amber-400 hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950'
              : 'border-slate-700 text-slate-600 cursor-not-allowed'
          }`}
        >
          View Job →
        </a>
      </div>
    </div>
  )
}
