'use client'

import { JobPosting } from '@/lib/types'

interface SourcesPanelProps {
  jobs: JobPosting[]
  active: boolean
  stageCompleted: number
  loading?: boolean
}

const SOURCE_CONFIG = [
  {
    key: 'remotive',
    label: 'Remotive',
    description: 'Remote-first jobs',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/50 border-emerald-800/60',
    dot: 'bg-emerald-400',
    activatesAt: 2,
  },
  {
    key: 'adzuna',
    label: 'Adzuna',
    description: 'Broad job aggregator',
    color: 'text-blue-400',
    bg: 'bg-blue-950/50 border-blue-800/60',
    dot: 'bg-blue-400',
    activatesAt: 3,
  },
  {
    key: 'jsearch',
    label: 'JSearch',
    description: 'LinkedIn, Indeed & more',
    color: 'text-violet-400',
    bg: 'bg-violet-950/50 border-violet-800/60',
    dot: 'bg-violet-400',
    activatesAt: 4,
  },
]

export default function SourcesPanel({ jobs, active, stageCompleted, loading }: SourcesPanelProps) {
  return (
    <div className={`rounded-xl border p-5 transition-all duration-400 ${
      active
        ? 'bg-slate-900 border-slate-700 shadow-lg'
        : 'bg-slate-900/40 border-slate-800/60'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-all duration-400 ${active ? 'bg-amber-400' : 'bg-slate-700'}`} />
          <h3 className={`text-sm font-semibold uppercase tracking-wider transition-colors duration-400 ${
            active ? 'text-amber-400' : 'text-slate-600'
          }`}>
            Job Sources
          </h3>
        </div>
        {loading && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {SOURCE_CONFIG.map(src => {
          const count = jobs.filter(j => j.source === src.key).length
          const hasReached = stageCompleted >= src.activatesAt
          const isActive = active && hasReached
          const hasJobs = count > 0

          return (
            <div
              key={src.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all duration-300 ${
                isActive && hasJobs
                  ? src.bg
                  : isActive
                  ? 'bg-slate-800/40 border-slate-700/60'
                  : 'bg-slate-800/20 border-slate-800/40 opacity-40'
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                isActive && hasJobs ? src.dot : 'bg-slate-600'
              }`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${
                  isActive && hasJobs ? src.color : isActive ? 'text-slate-500' : 'text-slate-600'
                }`}>
                  {src.label}
                </span>
                <span className={`text-xs ml-1.5 ${isActive && hasJobs ? 'text-slate-500' : 'text-slate-700'}`}>
                  {src.description}
                </span>
              </div>
              <span className={`font-mono text-sm font-bold shrink-0 ${
                isActive && hasJobs ? src.color : 'text-slate-600'
              }`}>
                {isActive ? (hasJobs ? count : '0') : '—'}
              </span>
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2.5">
            <svg className="animate-spin w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-amber-400 text-sm">Searching…</span>
          </div>
        )}
      </div>
    </div>
  )
}
