'use client'

import { JobPosting } from '@/lib/types'

interface SourcesPanelProps {
  jobs: JobPosting[]
  active: boolean
  loading?: boolean
}

export default function SourcesPanel({ jobs, active, loading }: SourcesPanelProps) {
  const remotiveCount = jobs.filter(j => j.source === 'remotive').length
  const adzunaCount = jobs.filter(j => j.source === 'adzuna').length

  const SOURCES = [
    {
      key: 'remotive',
      label: 'Remotive',
      count: remotiveCount,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/50 border-emerald-800/60',
      dot: 'bg-emerald-400',
    },
    {
      key: 'adzuna',
      label: 'Adzuna',
      count: adzunaCount,
      color: 'text-blue-400',
      bg: 'bg-blue-950/50 border-blue-800/60',
      dot: 'bg-blue-400',
    },
  ]

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

      {!active ? (
        <div className="flex gap-3">
          {SOURCES.map(src => (
            <div
              key={src.key}
              className="flex items-center gap-2 bg-slate-800/40 border border-slate-800/60 rounded-lg px-3 py-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="text-slate-600 text-sm font-medium">{src.label}</span>
              <span className="text-slate-700 font-mono text-sm">--</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {SOURCES.map(src => (
            <div
              key={src.key}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border transition-all duration-300 ${
                src.count > 0 ? src.bg : 'bg-slate-800/40 border-slate-800/60'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${src.count > 0 ? src.dot : 'bg-slate-600'}`} />
              <span className={`text-sm font-medium ${src.count > 0 ? src.color : 'text-slate-500'}`}>
                {src.label}
              </span>
              <span className={`font-mono text-sm font-bold ${src.count > 0 ? src.color : 'text-slate-600'}`}>
                {src.count}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
              <svg className="animate-spin w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-amber-400 text-sm">Searching...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
