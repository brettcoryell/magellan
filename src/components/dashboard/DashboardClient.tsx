'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CareerProfile, JobPosting } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import StageProgress from './StageProgress'
import ProfilePanel from './ProfilePanel'
import TotalJobsPanel from './TotalJobsPanel'
import SourcesPanel from './SourcesPanel'
import JobsList from './JobsList'
import ResumeUpload from './ResumeUpload'
import ConstraintsForm from './ConstraintsForm'
import AspirationForm from './AspirationForm'

interface DashboardClientProps {
  initialProfile: CareerProfile | null
  initialJobs: JobPosting[]
  userId: string
}

export default function DashboardClient({
  initialProfile,
  initialJobs,
  userId,
}: DashboardClientProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<CareerProfile | null>(initialProfile)
  const [jobs, setJobs] = useState<JobPosting[]>(initialJobs)
  const [stageLoading, setStageLoading] = useState<number | null>(null)

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

  const handleResumeComplete = useCallback(async (updatedProfile: CareerProfile) => {
    setProfile(updatedProfile)
  }, [])

  const handleConstraintsComplete = useCallback(async () => {
    setStageLoading(2)
    try {
      const updated = await refetchProfile()
      if (updated?.id) {
        await refetchJobs(updated.id)
      }
    } finally {
      setStageLoading(null)
    }
  }, [refetchProfile, refetchJobs])

  const handleAspirationComplete = useCallback(async () => {
    setStageLoading(3)
    try {
      const updated = await refetchProfile()
      if (updated?.id) {
        await refetchJobs(updated.id)
      }
    } finally {
      setStageLoading(null)
    }
  }, [refetchProfile, refetchJobs])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const stageCompleted = profile?.stage_completed ?? 0
  const profileId = profile?.id ?? null

  // Determine which form to show
  const showResumeUpload = stageCompleted < 1
  const showConstraints = stageCompleted >= 1 && stageCompleted < 2
  const showAspiration = stageCompleted >= 2 && stageCompleted < 3
  const allDone = stageCompleted >= 3

  // Determine current stage number for the stepper
  const currentStage = stageCompleted + 1
  const completedStages = Array.from({ length: stageCompleted }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Left column - sticky sidebar */}
          <div className="w-72 shrink-0 sticky top-8">
            {/* Logo + sign out */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <span className="text-amber-400 font-semibold text-sm tracking-tight">Career Explorer</span>
              </div>
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

            {/* Stage progress */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              <StageProgress
                currentStage={Math.min(currentStage, 3)}
                completedStages={completedStages}
              />
            </div>

            {/* Active stage form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              {showResumeUpload && (
                <ResumeUpload profileId={profileId} onComplete={handleResumeComplete} />
              )}
              {showConstraints && profileId && (
                <ConstraintsForm profileId={profileId} onComplete={handleConstraintsComplete} />
              )}
              {showAspiration && profileId && (
                <AspirationForm profileId={profileId} onComplete={handleAspirationComplete} />
              )}
              {allDone && (
                <div className="text-center py-4">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-slate-300 font-medium text-sm mb-1">All stages complete!</p>
                  <p className="text-slate-500 text-xs">
                    Phase 2 features coming soon.
                  </p>
                </div>
              )}
              {stageLoading !== null && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-slate-400">
                  <svg className="animate-spin w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs">Refreshing your results...</span>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Top row: Profile + Total Jobs */}
            <div className="grid grid-cols-2 gap-4">
              <ProfilePanel
                profile={profile}
                active={stageCompleted >= 1}
              />
              <TotalJobsPanel
                count={jobs.length}
                active={jobs.length > 0}
              />
            </div>

            {/* Sources panel */}
            <SourcesPanel
              jobs={jobs}
              active={jobs.length > 0}
              loading={stageLoading !== null}
            />

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
              <JobsList jobs={jobs} stageCompleted={stageCompleted} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
