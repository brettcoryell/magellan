import { PreferenceProfile, JobSignals } from './types'

export function scoreJob(job: JobSignals, profile: Partial<PreferenceProfile>): number {
  let score = 0.5

  if (profile.excluded_industries?.some(i => job.industries?.map(x => x.toLowerCase()).includes(i.toLowerCase()))) score -= 0.3
  if (profile.excluded_company_types?.map(x => x.toLowerCase()).includes(job.company_type?.toLowerCase())) score -= 0.3
  if (profile.remote_required && job.remote === 'no') score -= 0.3
  if (profile.excluded_locations?.some(l => job.locations?.map(x => x.toLowerCase()).includes(l.toLowerCase()))) score -= 0.2
  if (profile.desired_functions?.some(f => job.primary_function?.toLowerCase().includes(f.toLowerCase()))) score += 0.2
  if (profile.growth_direction === 'leadership' && ['manager', 'leader'].includes(job.role_type)) score += 0.15
  if (profile.growth_direction === 'ic' && job.role_type === 'ic') score += 0.15
  if (profile.keywords?.some(k => job.key_requirements?.join(' ').toLowerCase().includes(k.toLowerCase()))) score += 0.1

  return Math.max(0, Math.min(1, score))
}

export function assignTier(score: number): 'great' | 'good' | 'other' {
  if (score >= 0.7) return 'great'
  if (score >= 0.45) return 'good'
  return 'other'
}

export function makeDeduKey(title: string, company: string, location: string): string {
  const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
  return `${normalize(title)}-${normalize(company)}-${normalize(location)}`
}
