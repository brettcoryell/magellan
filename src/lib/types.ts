export interface PreferenceProfile {
  excluded_industries: string[]
  excluded_company_types: string[]
  excluded_locations: string[]
  remote_required: boolean
  excluded_keywords: string[]
  desired_functions: string[]
  desired_industries: string[]
  desired_company_types: string[]
  growth_direction: 'leadership' | 'ic' | 'unclear'
  keywords: string[]
}

export interface JobSignals {
  seniority: string
  role_type: string
  primary_function: string
  industries: string[]
  company_type: string
  remote: 'yes' | 'no' | 'hybrid' | 'unclear'
  locations: string[]
  key_requirements: string[]
  certifications_required: boolean
  travel_required: boolean
  estimated_level: string
}

export interface CareerProfile {
  id: string
  user_id: string
  resume_text: string | null
  resume_filename: string | null
  stage_completed: number
  constraints_raw: string | null
  aspiration_raw: string | null
  preference_profile: Partial<PreferenceProfile>
  created_at: string
  updated_at: string
}

export interface JobPosting {
  id: string
  profile_id: string
  external_id: string | null
  source: string
  title: string
  company: string | null
  location: string | null
  remote: boolean
  description: string | null
  url: string
  salary_min: number | null
  salary_max: number | null
  posted_at: string | null
  signals: Partial<JobSignals>
  fit_score: number | null
  fit_tier: 'great' | 'good' | 'other' | null
  dedup_key: string | null
  fetched_at: string
}

export interface DashboardState {
  profile: CareerProfile | null
  jobs: JobPosting[]
  loading: boolean
  stageLoading: number | null
}
