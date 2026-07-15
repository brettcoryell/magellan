'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CareerProfile, JobPosting } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import StageProgress from './StageProgress'
import ProfilePanel from './ProfilePanel'
import TotalJobsPanel from './TotalJobsPanel'
import TierCountsPanel from './TierCountsPanel'
import SourcesPanel from './SourcesPanel'
import JobsList from './JobsList'
import ResumeUpload from './ResumeUpload'
import ConstraintsForm from './ConstraintsForm'
import AspirationForm from './AspirationForm'
import ValuesForm from './ValuesForm'
import CapabilitiesForm from './CapabilitiesForm'
import StarForm from './StarForm'
import AdjacentForm from './AdjacentForm'
import BroaderVisionPanel from './BroaderVisionPanel'

type FreshnessFilter = 'all' | '7d' | '30d' | '60d'

const FRESHNESS_OPTIONS: { value: FreshnessFilter; label: string; days: number }[] = [
  { value: 'all', label: 'All jobs', days: 0 },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '60d', label: 'Last 60 days', days: 60 },
]

function filterByFreshness(jobs: JobPosting[], filter: FreshnessFilter): JobPosting[] {
  if (filter === 'all') return jobs
  const opt = FRESHNESS_OPTIONS.find(o => o.value === filter)!
  const cutoff = new Date(Date.now() - opt.days * 24 * 60 * 60 * 1000)
  return jobs.filter(j => {
    if (!j.posted_at) return false
    return new Date(j.posted_at) >= cutoff
  })
}

interface DashboardClientProps {
  initialProfile: CareerProfile | null
  initialJobs: JobPosting[]
  userId: string
  buildSha: string
  isAdmin?: boolean
}

export default function DashboardClient({
  initialProfile,
  initialJobs,
  userId,
  buildSha,
  isAdmin = false,
}: DashboardClientProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<CareerProfile | null>(initialProfile)
  const [jobs, setJobs] = useState<JobPosting[]>(initialJobs)
  const [stageLoading, setStageLoading] = useState<number | null>(null)
  const [submittingStage, setSubmittingStage] = useState<number | null>(null)
  const [navigateConfirm, setNavigateConfirm] = useState<number | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedAtStage7, setRefreshedAtStage7] = useState(false)
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessFilter>('all')

  const supabase = createClient()
  const profileId = profile?.id ?? null

  const refetchJobs = useCallback(async (profileId: string) => {
    const response = await fetch(`/api/jobs?profileId=${profileId}&showIgnored=true`)
    if (response.ok) {
      const data = await response.json()
      setJobs(data.jobs || [])
    }
  }, [])

  const refetchProfile = useCallback(async () => {
    const { data } = await supabase
      .from('career_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) setProfile(data as CareerProfile)
    return data as CareerProfile | null
  }, [supabase, userId])

  const handleStageComplete = useCallback(async (stage: number) => {
    setStageLoading(stage)
    try {
      const updated = await refetchProfile()
      if (updated?.id) {
        await refetchJobs(updated.id)
      }
    } finally {
      setStageLoading(null)
    }
  }, [refetchProfile, refetchJobs])

  const handleResumeComplete = useCallback((updatedProfile: CareerProfile) => {
    setProfile(updatedProfile)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleNavigateToStage = async (stage: number) => {
    if (!profileId) return
    setNavigateConfirm(null)
    setNavigating(true)
    try {
      const res = await fetch('/api/navigate-to-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, profileId }),
      })
      const data = await res.json()
      if (res.ok) {
        setProfile(data.profile)
        setJobs(data.jobs || [])
      }
    } finally {
      setNavigating(false)
    }
  }

  const handleRefresh = async () => {
    if (!profileId) return
    setShowRefreshConfirm(false)
    setRefreshing(true)
    try {
      const res = await fetch('/api/refresh-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (res.ok) {
        setJobs(data.jobs || [])
        if (stageCompleted >= 7) setRefreshedAtStage7(true)
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleAddToResults = useCallback(async (job: JobPosting) => {
    setJobs(prev => {
      if (prev.find(j => j.id === job.id && j.source_type === 'main')) return prev
      const updated = [{ ...job, source_type: 'main' as const }, ...prev.filter(j => j.id !== job.id)]
      return updated.sort((a, b) => {
        if (a.fit_score === null) return 1
        if (b.fit_score === null) return -1
        return b.fit_score - a.fit_score
      })
    })
    await supabase.from('job_postings').update({ source_type: 'main' }).eq('id', job.id)
    if (profileId) await refetchJobs(profileId)
  }, [supabase, profileId, refetchJobs])

  const handleIgnore = useCallback(async (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ignored: true } : j))
    try {
      const response = await fetch(`/api/jobs/${id}/ignore`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ignored: true, profileId }),
      })
      if (!response.ok) throw new Error('Could not ignore this job')
    } catch {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ignored: false } : j))
    }
  }, [profileId])

  const handleRestore = useCallback(async (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ignored: false } : j))
    try {
      const response = await fetch(`/api/jobs/${id}/ignore`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ignored: false, profileId }),
      })
      if (!response.ok) throw new Error('Could not restore this job')
    } catch {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ignored: true } : j))
    }
  }, [profileId])

  const stageCompleted = profile?.stage_completed ?? 0
  const sourceErrors = ((profile?.preference_profile as Record<string, unknown>)?.source_errors as Record<string, string> | undefined) || {}

  const schemaWarnings = (profile?.schema_warnings || []) as Array<{ stage: number }>
  const schemaWarningStages = schemaWarnings.map(w => w.stage)

  // Determine which form to show
  const showResumeUpload = stageCompleted < 1
  const showConstraints = stageCompleted >= 1 && stageCompleted < 2
  const showAspiration = stageCompleted >= 2 && stageCompleted < 3
  const showValues = stageCompleted >= 3 && stageCompleted < 4
  const showCapabilities = stageCompleted >= 4 && stageCompleted < 5
  const showStar = stageCompleted >= 5 && stageCompleted < 6
  const showAdjacent = stageCompleted >= 6 && stageCompleted < 7
  const allDone = stageCompleted >= 7

  const currentStage = Math.min(stageCompleted + 1, 7)
  const completedStages = Array.from({ length: stageCompleted }, (_, i) => i + 1)

  const activeJobs = jobs.filter(j => j.source_type === 'main' && !j.ignored)
  const ignoredJobs = jobs.filter(j => j.source_type === 'main' && j.ignored)
  const displayedActiveJobs = filterByFreshness(activeJobs, freshnessFilter)
  const totalActiveCount = activeJobs.length
  const filteredCount = displayedActiveJobs.length

  return (
    <div className="min-h-screen bg-[var(--mag-bg)]">
      {/* Refresh confirm modal */}
      {showRefreshConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm mx-4 space-y-4">
            <h3 className="text-slate-100 font-semibold text-sm">Refresh job results?</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              This will replace your current job results with fresh search results.
              Your profile answers and scores will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefreshConfirm(false)}
                className="flex-1 text-xs py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefresh}
                className="flex-1 text-xs py-2 rounded-lg bg-amber-500 text-slate-950 font-medium hover:bg-amber-400 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back-navigation confirm modal */}
      {navigateConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm mx-4 space-y-4">
            <h3 className="text-slate-100 font-semibold text-sm">Go back to Stage {navigateConfirm}?</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              This will clear your answers and job results from Stage {navigateConfirm} onward.
              You&apos;ll need to re-answer that stage and all subsequent stages.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setNavigateConfirm(null)}
                disabled={navigating}
                className="flex-1 text-xs py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleNavigateToStage(navigateConfirm)}
                disabled={navigating}
                className="flex-1 text-xs py-2 rounded-lg bg-amber-500 text-slate-950 font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {navigating ? 'Going back…' : 'Yes, go back'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Left column - sticky sidebar */}
          <div className="w-72 shrink-0 sticky top-8">
            {/* Logo + sign out + reset */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-7 h-7 bg-[var(--mag-accent)] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--mag-accent-contrast)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <span className="text-[var(--mag-accent)] font-semibold text-sm tracking-tight">Magellan</span>
                </Link>
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
                    >
                      Admin
                    </a>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="text-slate-500 hover:text-slate-300 text-xs transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </div>

            {/* Stage progress */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              <StageProgress
                currentStage={currentStage}
                completedStages={completedStages}
                schemaWarningStages={schemaWarningStages}
                onNavigate={stageCompleted >= 2 ? (stage) => setNavigateConfirm(stage) : undefined}
              />
            </div>

            {/* Active stage form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              {showResumeUpload && (
                <ResumeUpload profileId={profileId} onComplete={handleResumeComplete} />
              )}
              {showConstraints && profileId && (
                <ConstraintsForm
                  profileId={profileId}
                  onComplete={() => handleStageComplete(2)}
                  onLoadingChange={(l) => setSubmittingStage(l ? 2 : null)}
                />
              )}
              {showAspiration && profileId && (
                <AspirationForm
                  profileId={profileId}
                  onComplete={() => handleStageComplete(3)}
                  onLoadingChange={(l) => setSubmittingStage(l ? 3 : null)}
                />
              )}
              {showValues && profileId && (
                <ValuesForm
                  profileId={profileId}
                  onComplete={() => handleStageComplete(4)}
                  onLoadingChange={(l) => setSubmittingStage(l ? 4 : null)}
                />
              )}
              {showCapabilities && profileId && (
                <CapabilitiesForm profileId={profileId} onComplete={() => handleStageComplete(5)} />
              )}
              {showStar && profileId && (
                <StarForm
                  profileId={profileId}
                  onComplete={() => handleStageComplete(6)}
                  onLoadingChange={(l) => setSubmittingStage(l ? 6 : null)}
                />
              )}
              {showAdjacent && profileId && (
                <AdjacentForm profileId={profileId} jobs={jobs} onComplete={() => handleStageComplete(7)} />
              )}
              {allDone && (
                <div className="text-center py-4">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-slate-300 font-medium text-sm mb-1">All stages complete!</p>
                  <p className="text-slate-500 text-xs">Your full match picture is below.</p>
                </div>
              )}
              {stageLoading !== null && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-slate-400">
                  <svg className="animate-spin w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs">Refreshing your results…</span>
                </div>
              )}
            </div>

            {/* Build version */}
            <div className="mt-3 text-center">
              <span className="font-mono text-xs text-slate-700">build {buildSha}</span>
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Top row: Profile (2/3) + stacked Total Jobs & Tier Counts (1/3) */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <ProfilePanel
                  profile={profile}
                  active={stageCompleted >= 1}
                />
              </div>
              <div className="flex flex-col gap-4">
                <TotalJobsPanel
                  count={jobs.filter(j => j.source_type === 'main').length}
                  active={jobs.length > 0}
                />
                <TierCountsPanel
                  jobs={displayedActiveJobs}
                  active={stageCompleted >= 4}
                />
              </div>
            </div>

            {/* Sources panel */}
            <SourcesPanel
              jobs={jobs}
              active={jobs.length > 0}
              stageCompleted={stageCompleted}
              loading={stageLoading !== null}
              submittingStage={submittingStage}
              refreshing={refreshing}
              sourceErrors={sourceErrors}
            />

            {/* Broader Vision panel — stage 7+ */}
            {profileId && stageCompleted >= 7 && (
              <BroaderVisionPanel
                profileId={profileId}
                active={stageCompleted >= 7}
                onAddToResults={handleAddToResults}
                ignoredIds={new Set(ignoredJobs.map(j => j.id))}
                onIgnore={handleIgnore}
              />
            )}

            {/* Jobs list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  {stageCompleted >= 2 ? 'Your Job Matches' : 'Job Postings'}
                </h2>
                <div className="flex items-center gap-3">
                  {stageCompleted < 3 && jobs.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Titles unlock after stage 3
                    </div>
                  )}
                  {stageCompleted >= 2 && (
                    <button
                      onClick={() => setShowRefreshConfirm(true)}
                      disabled={refreshing}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <svg className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {refreshing ? 'Refreshing…' : 'Refresh Jobs'}
                    </button>
                  )}
                </div>
              </div>

              {/* Broader Vision stale notice */}
              {refreshedAtStage7 && (
                <div className="mb-4 text-xs text-amber-400/80 bg-amber-950/20 border border-amber-800/30 rounded-lg px-4 py-2.5">
                  Broader Vision results are from your previous session. Re-complete Stage 7 to refresh them.
                </div>
              )}

              {/* Refresh loading bar */}
              {refreshing && (
                <div className="mb-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 animate-pulse w-full" />
                </div>
              )}

              {/* Freshness filter + job count */}
              {stageCompleted >= 2 && activeJobs.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-600">
                    {freshnessFilter === 'all'
                      ? `${totalActiveCount} ${totalActiveCount === 1 ? 'job' : 'jobs'}`
                      : `Showing ${filteredCount} of ${totalActiveCount} jobs`}
                  </span>
                  <select
                    value={freshnessFilter}
                    onChange={e => setFreshnessFilter(e.target.value as FreshnessFilter)}
                    className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400 focus:outline-none focus:border-amber-500/60 cursor-pointer"
                  >
                    {FRESHNESS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <JobsList
                jobs={displayedActiveJobs}
                ignoredJobs={ignoredJobs}
                stageCompleted={stageCompleted}
                onIgnore={handleIgnore}
                onRestore={handleRestore}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
