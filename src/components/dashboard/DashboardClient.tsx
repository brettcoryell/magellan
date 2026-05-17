'use client'

import { useState, useCallback } from 'react'
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
import AdjacentForm from './AdjacentForm'
import BroaderVisionPanel from './BroaderVisionPanel'

interface DashboardClientProps {
  initialProfile: CareerProfile | null
  initialJobs: JobPosting[]
  userId: string
  buildSha: string
}

export default function DashboardClient({
  initialProfile,
  initialJobs,
  userId,
  buildSha,
}: DashboardClientProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<CareerProfile | null>(initialProfile)
  const [jobs, setJobs] = useState<JobPosting[]>(initialJobs)
  const [stageLoading, setStageLoading] = useState<number | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const supabase = createClient()

  const refetchJobs = useCallback(async (profileId: string) => {
    const response = await fetch(`/api/jobs?profileId=${profileId}`)
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

  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await fetch('/api/reset', { method: 'POST' })
      if (res.ok) {
        setProfile(null)
        setJobs([])
        setShowResetConfirm(false)
      }
    } finally {
      setResetting(false)
    }
  }

  const handleAddToResults = useCallback((job: JobPosting) => {
    setJobs(prev => {
      if (prev.find(j => j.id === job.id)) return prev
      return [{ ...job, source_type: 'main' }, ...prev]
    })
  }, [])

  const stageCompleted = profile?.stage_completed ?? 0
  const profileId = profile?.id ?? null

  // Schema warning stages — any stage that had an overflow
  const schemaWarnings = (profile?.schema_warnings || []) as Array<{ stage: number }>
  const schemaWarningStages = schemaWarnings.map(w => w.stage)

  // Determine which form to show
  const showResumeUpload = stageCompleted < 1
  const showConstraints = stageCompleted >= 1 && stageCompleted < 2
  const showAspiration = stageCompleted >= 2 && stageCompleted < 3
  const showValues = stageCompleted >= 3 && stageCompleted < 4
  const showCapabilities = stageCompleted >= 4 && stageCompleted < 5
  const showAdjacent = stageCompleted >= 5 && stageCompleted < 6
  const allDone = stageCompleted >= 6

  const currentStage = Math.min(stageCompleted + 1, 6)
  const completedStages = Array.from({ length: stageCompleted }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Left column - sticky sidebar */}
          <div className="w-72 shrink-0 sticky top-8">
            {/* Logo + sign out + reset */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <span className="text-amber-400 font-semibold text-sm tracking-tight">Career Explorer</span>
                </div>
                <div className="flex items-center gap-3">
                  {profile && !showResetConfirm && (
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
                    >
                      Start over
                    </button>
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
              {showResetConfirm && (
                <div className="mt-2 bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-slate-300">Delete all results and start over?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      disabled={resetting}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={resetting}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-red-900/60 border border-red-800/60 text-red-300 hover:bg-red-800/60 transition-colors disabled:opacity-50"
                    >
                      {resetting ? 'Resetting…' : 'Yes, reset'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stage progress */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              <StageProgress
                currentStage={currentStage}
                completedStages={completedStages}
                schemaWarningStages={schemaWarningStages}
              />
            </div>

            {/* Active stage form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              {showResumeUpload && (
                <ResumeUpload profileId={profileId} onComplete={handleResumeComplete} />
              )}
              {showConstraints && profileId && (
                <ConstraintsForm profileId={profileId} onComplete={() => handleStageComplete(2)} />
              )}
              {showAspiration && profileId && (
                <AspirationForm profileId={profileId} onComplete={() => handleStageComplete(3)} />
              )}
              {showValues && profileId && (
                <ValuesForm profileId={profileId} onComplete={() => handleStageComplete(4)} />
              )}
              {showCapabilities && profileId && (
                <CapabilitiesForm profileId={profileId} onComplete={() => handleStageComplete(5)} />
              )}
              {showAdjacent && profileId && (
                <AdjacentForm profileId={profileId} jobs={jobs} onComplete={() => handleStageComplete(6)} />
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
                  jobs={jobs}
                  active={stageCompleted >= 4}
                />
              </div>
            </div>

            {/* Sources panel — each source on its own line */}
            <SourcesPanel
              jobs={jobs}
              active={jobs.length > 0}
              stageCompleted={stageCompleted}
              loading={stageLoading !== null}
            />

            {/* Broader Vision panel — at top of job section */}
            {profileId && stageCompleted >= 6 && (
              <BroaderVisionPanel
                profileId={profileId}
                active={stageCompleted >= 6}
                onAddToResults={handleAddToResults}
              />
            )}

            {/* Jobs list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  {stageCompleted >= 2 ? 'Your Job Matches' : 'Job Postings'}
                </h2>
                {stageCompleted < 3 && jobs.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Titles unlock after stage 3
                  </div>
                )}
              </div>
              <JobsList
                jobs={jobs.filter(j => j.source_type === 'main')}
                stageCompleted={stageCompleted}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
