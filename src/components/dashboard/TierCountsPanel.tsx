'use client'

import { JobPosting } from '@/lib/types'

interface TierCountsPanelProps {
  jobs: JobPosting[]
  active: boolean
}

export default function TierCountsPanel({ jobs, active }: TierCountsPanelProps) {
  const mainJobs = jobs.filter(j => j.source_type === 'main')
  const great = mainJobs.filter(j => j.fit_tier === 'great').length
  const good = mainJobs.filter(j => j.fit_tier === 'good').length
  const other = mainJobs.filter(j => j.fit_tier === 'other').length

  return (
    <div className={`rounded-xl border flex-1 flex flex-col items-center justify-center p-4 transition-all duration-400 ${
      active ? 'border-slate-700 opacity-100' : 'border-slate-800 opacity-40'
    } bg-slate-900`}>
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="text-center">
          <div className={`text-xl font-bold ${active ? 'text-amber-400' : 'text-slate-700'}`}>
            {active ? great : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Great</div>
        </div>
        <div className="text-center">
          <div className={`text-xl font-bold ${active ? 'text-sky-400' : 'text-slate-700'}`}>
            {active ? good : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Good</div>
        </div>
        <div className="text-center">
          <div className={`text-xl font-bold ${active ? 'text-slate-400' : 'text-slate-700'}`}>
            {active ? other : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Other</div>
        </div>
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wider mt-2 ${active ? 'text-amber-400' : 'text-slate-600'}`}>
        Fit Tiers
      </p>
    </div>
  )
}
