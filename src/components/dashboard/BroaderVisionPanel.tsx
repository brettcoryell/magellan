'use client'

import { useState, useEffect, useCallback } from 'react'
import { JobPosting } from '@/lib/types'

interface RelaxedJob extends JobPosting {
  improvement: number
  relaxed_constraint: string
  relaxed_tier: string
}

interface BroaderVisionPanelProps {
  profileId: string
  active: boolean
  onAddToResults: (job: JobPosting) => void
  ignoredIds?: Set<string>
  onIgnore?: (id: string) => void
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  if (max) return `Up to ${fmt(max)}`
  return null
}

function BroaderJobCard({
  job,
  label,
  onAdd,
  added,
  onIgnore,
}: {
  job: RelaxedJob | JobPosting
  label?: string
  onAdd: () => void
  added: boolean
  onIgnore?: () => void
}) {
  const salary = formatSalary(job.salary_min, job.salary_max)
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 space-y-2">
      {label && (
        <span className="text-xs font-medium text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-full">
          {label}
        </span>
      )}
      <h4 className="text-sm font-semibold text-slate-100">{job.title}</h4>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
        {job.company && <span className="font-medium text-slate-300">{job.company}</span>}
        {job.location && <><span className="text-slate-700">·</span><span>{job.location}</span></>}
        {salary && <><span className="text-slate-700">·</span><span className="font-mono">{salary}</span></>}
      </div>
      {'relaxed_constraint' in job && (job as RelaxedJob).relaxed_constraint && (
        <p className="text-xs text-amber-400/80">
          Would improve if you relaxed: {(job as RelaxedJob).relaxed_constraint}
        </p>
      )}
      {job.fit_summary && (
        <p className="text-xs text-slate-400 italic">{job.fit_summary}</p>
      )}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-600 text-slate-300 hover:border-amber-600 hover:text-amber-400 transition-colors"
        >
          View Job →
        </a>
        {!added && (
          <button
            onClick={onAdd}
            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-amber-700/60 text-amber-400 hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950 transition-all"
          >
            + Add to my results
          </button>
        )}
        {added && (
          <span className="text-xs text-emerald-400">Added ✓</span>
        )}
        {onIgnore && (
          <button
            onClick={onIgnore}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded hover:bg-slate-700/60 ml-auto"
          >
            Ignore
          </button>
        )}
      </div>
    </div>
  )
}

export default function BroaderVisionPanel({ profileId, active, onAddToResults, ignoredIds, onIgnore }: BroaderVisionPanelProps) {
  const [relaxed, setRelaxed] = useState<RelaxedJob[]>([])
  const [adjacent, setAdjacent] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const fetchBroaderVision = useCallback(async () => {
    if (!active || !profileId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/broader-vision?profileId=${profileId}`)
      if (res.ok) {
        const data = await res.json()
        setRelaxed(data.relaxed || [])
        setAdjacent(data.adjacent || [])
      }
    } finally {
      setLoading(false)
    }
  }, [active, profileId])

  useEffect(() => {
    fetchBroaderVision()
  }, [fetchBroaderVision])

  const handleAdd = (job: JobPosting | RelaxedJob) => {
    setAddedIds(prev => { const s = new Set(prev); s.add(job.id); return s })
    onAddToResults(job)
  }

  if (!active) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 opacity-40">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Broader Vision
        </h3>
        <p className="text-xs text-slate-700">Unlocks after Stage 6</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Broader Vision</h3>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="animate-spin w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Computing constraint relaxation…
        </div>
      </div>
    )
  }

  const visibleRelaxed = relaxed.filter(j => !ignoredIds?.has(j.id))
  const visibleAdjacent = adjacent.filter(j => !ignoredIds?.has(j.id))
  const hasContent = visibleRelaxed.length > 0 || visibleAdjacent.length > 0

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-slate-100 mb-1">Broader Vision</h3>
      <p className="text-xs text-slate-500 mb-5">
        Jobs you almost ruled out · New opportunities in adjacent roles
      </p>

      {!hasContent && (
        <p className="text-xs text-slate-500">No broader matches found based on your profile.</p>
      )}

      {hasContent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left pane — constraint relaxation */}
          <div>
            <h4 className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-3">
              Jobs you almost ruled out
            </h4>
            {visibleRelaxed.length === 0 ? (
              <p className="text-xs text-slate-600">No tier-jumping jobs found when constraints are relaxed.</p>
            ) : (
              <div className="space-y-3">
                {visibleRelaxed.map(job => (
                  <BroaderJobCard
                    key={job.id}
                    job={job}
                    label={`Would be ${job.relaxed_tier}`}
                    onAdd={() => handleAdd(job)}
                    added={addedIds.has(job.id)}
                    onIgnore={onIgnore ? () => onIgnore(job.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right pane — adjacent re-query */}
          <div>
            <h4 className="text-xs font-semibold text-violet-400/80 uppercase tracking-wider mb-3">
              New opportunities
            </h4>
            {visibleAdjacent.length === 0 ? (
              <p className="text-xs text-slate-600">No adjacent role results found.</p>
            ) : (
              <div className="space-y-3">
                {visibleAdjacent.map(job => (
                  <BroaderJobCard
                    key={job.id}
                    job={job}
                    onAdd={() => handleAdd(job)}
                    added={addedIds.has(job.id)}
                    onIgnore={onIgnore ? () => onIgnore(job.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
