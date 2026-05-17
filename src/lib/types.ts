export interface SignalConfidence {
  constraints: number
  aspiration: number
  values: number
  capabilities: number
  adjacent: number
  overall: number
}

export interface PreferenceProfile {
  // Stage 1 — Resume extraction
  job_title: string
  seniority_level: 'entry' | 'mid' | 'senior' | 'director' | 'vp' | 'c-level'
  years_experience: number
  industries: string[]
  key_skills: string[]
  company_type: string
  job_search_titles: string[]
  // Stage 2 — Hard Constraints
  excluded_industries: string[]
  excluded_company_types: string[]
  excluded_locations: string[]
  remote_required: boolean
  excluded_keywords: string[]
  // Stage 3 — Aspiration
  desired_functions: string[]
  desired_industries: string[]
  desired_company_types: string[]
  growth_direction: 'leadership' | 'ic' | 'unclear'
  keywords: string[]
  // Stage 4 — Values Fit
  values_signals: string[]
  work_style: 'autonomous' | 'collaborative' | 'unclear'
  motivation_type: 'outcome' | 'process' | 'people' | 'unclear'
  // Stage 5 — Demands-Abilities
  demonstrated_capabilities: string[]
  problem_domain: string
  differentiator: string
  // Stage 6 — Adjacent Exploration
  adjacent_interest: string[]
  adjacent_rejection: string[]
  // Overflow handling
  unstructured_notes: string
  schema_fit_warning: boolean
  schema_fit_details: string
  // Confidence (0.0–1.0, Claude reasoning output, defaults to 0.5)
  signal_confidence: SignalConfidence
  stages_completed: number
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
  culture_signals: string[]
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
  values_raw: string | null
  capabilities_raw: string | null
  adjacent_raw: string | null
  preference_profile: Partial<PreferenceProfile>
  schema_warnings: unknown[]
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
  fit_reasons: string[] | null
  fit_penalties: string[] | null
  fit_summary: string | null
  source_type: 'main' | 'relaxed' | 'adjacent'
}

export interface DashboardState {
  profile: CareerProfile | null
  jobs: JobPosting[]
  loading: boolean
  stageLoading: number | null
}
