'use client'

interface TotalJobsPanelProps {
  count: number
  active: boolean
}

export default function TotalJobsPanel({ count, active }: TotalJobsPanelProps) {
  return (
    <div className={`rounded-xl border p-5 transition-all duration-400 flex flex-col justify-between ${
      active
        ? 'bg-slate-900 border-slate-700 shadow-lg'
        : 'bg-slate-900/40 border-slate-800/60'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full transition-all duration-400 ${active ? 'bg-amber-400' : 'bg-slate-700'}`} />
        <h3 className={`text-sm font-semibold uppercase tracking-wider transition-colors duration-400 ${
          active ? 'text-amber-400' : 'text-slate-600'
        }`}>
          Total Jobs
        </h3>
      </div>

      <div>
        <p className={`text-4xl font-bold transition-all duration-400 ${
          active ? 'text-slate-100' : 'text-slate-700'
        }`}>
          {active ? count.toLocaleString() : '--'}
        </p>
        {active && (
          <p className="text-slate-500 text-xs mt-1">
            {count === 1 ? 'job found' : 'jobs found'}
          </p>
        )}
      </div>
    </div>
  )
}
