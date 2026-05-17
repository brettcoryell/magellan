'use client'

interface TotalJobsPanelProps {
  count: number
  active: boolean
}

export default function TotalJobsPanel({ count, active }: TotalJobsPanelProps) {
  return (
    <div className={`rounded-xl border flex-1 flex flex-col items-center justify-center p-4 transition-all duration-400 ${
      active
        ? 'bg-slate-900 border-slate-700 shadow-lg'
        : 'bg-slate-900/40 border-slate-800/60'
    }`}>
      <p className={`text-3xl font-bold transition-all duration-400 ${
        active ? 'text-slate-100' : 'text-slate-700'
      }`}>
        {active ? count.toLocaleString() : '—'}
      </p>
      <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${
        active ? 'text-amber-400' : 'text-slate-600'
      }`}>
        Total Jobs
      </p>
    </div>
  )
}
