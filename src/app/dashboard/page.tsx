import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { CareerProfile, JobPosting } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  // Load or create career profile
  let profile: CareerProfile | null = null

  const { data: existing } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    profile = existing as CareerProfile
  } else {
    // Create a new blank profile
    const { data: created } = await supabase
      .from('career_profiles')
      .insert({
        user_id: user.id,
        stage_completed: 0,
        preference_profile: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (created) {
      profile = created as CareerProfile
    }
  }

  // Load existing jobs
  let jobs: JobPosting[] = []
  if (profile?.id) {
    const { data: jobData } = await supabase
      .from('job_postings')
      .select('*')
      .eq('profile_id', profile.id)
      .order('fit_score', { ascending: false, nullsFirst: false })

    if (jobData) {
      jobs = jobData as JobPosting[]
    }
  }

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const isAdmin = userProfile?.is_admin ?? false

  const buildSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'

  return (
    <DashboardClient
      initialProfile={profile}
      initialJobs={jobs}
      userId={user.id}
      buildSha={buildSha}
      isAdmin={isAdmin}
    />
  )
}
