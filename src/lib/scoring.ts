import { PreferenceProfile, JobSignals, SignalConfidence } from './types'

const RAW_MIN = -0.85
const RAW_MAX = 1.60

const SENIORITY_RANK: Record<string, number> = {
  'entry': 1, 'mid': 2, 'senior': 3, 'director': 4, 'vp': 5, 'c-level': 6,
}

function conf(confidence: Partial<SignalConfidence> | undefined, key: keyof SignalConfidence): number {
  return confidence?.[key] ?? 0.5
}

// Returns true if any token (>3 chars) from `a` appears in `b` or vice versa
function tokenOverlap(a: string, b: string): boolean {
  const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3)
  const aT = tokens(a)
  const bT = new Set(tokens(b))
  return aT.some(t => bT.has(t))
}

// Returns overlap count between two string arrays (token-based)
function arrayOverlapCount(desired: string[], available: string[]): number {
  const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3)
  const availTokens = new Set(available.flatMap(tokens))
  return desired.flatMap(tokens).filter(t => availTokens.has(t)).length
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

export function scoreJob(
  signals: Partial<JobSignals>,
  profile: Partial<PreferenceProfile>
): { raw: number; normalized: number; reasons: string[]; penalties: string[] } {
  let raw = 0.5
  const reasons: string[] = []
  const penalties: string[] = []
  const confidence = profile.signal_confidence

  const cConstraints = conf(confidence, 'constraints')
  const cAspiration = conf(confidence, 'aspiration')
  const cValues = conf(confidence, 'values')
  const cCapabilities = conf(confidence, 'capabilities')

  // ── Seniority mismatch (Stage 1, always active, no confidence damping) ──
  const profileSeniority = profile.seniority_level
  if (profileSeniority && signals.seniority && signals.seniority !== 'unclear') {
    const profileRank = SENIORITY_RANK[profileSeniority] ?? 0
    const jobRank = SENIORITY_RANK[signals.seniority] ?? 0
    const gap = profileRank - jobRank
    if (gap >= 2) {
      raw -= 0.45
      penalties.push('Role well below experience level')
    } else if (gap === 1) {
      raw -= 0.2
      penalties.push('Role below experience level')
    } else if (gap === 0) {
      raw += 0.15
      reasons.push('Seniority match')
    }
  }

  // ── Stage 2 — Constraint penalties ──────────────────────────────────────
  if (profile.excluded_industries?.some(i =>
    signals.industries?.some(ji => tokenOverlap(i, ji))
  )) {
    raw -= 0.3 * cConstraints
    penalties.push('Excluded industry')
  }
  if (signals.company_type && profile.excluded_company_types?.some(t => tokenOverlap(t, signals.company_type!))) {
    raw -= 0.3 * cConstraints
    penalties.push('Excluded company type')
  }
  if (profile.remote_required && signals.remote === 'no') {
    raw -= 0.3 * cConstraints
    penalties.push('Not remote')
  }
  if (profile.excluded_locations?.some(l =>
    signals.locations?.some(jl => tokenOverlap(l, jl))
  )) {
    raw -= 0.2 * cConstraints
    penalties.push('Excluded location')
  }
  const reqText = signals.key_requirements?.join(' ') ?? ''
  if (profile.excluded_keywords?.some(k => reqText.toLowerCase().includes(k.toLowerCase()))) {
    raw -= 0.15 * cConstraints
    penalties.push('Excluded keyword match')
  }

  // ── Stage 3 — Aspiration bonuses ────────────────────────────────────────
  // Function match (token-based, bidirectional)
  if (profile.desired_functions?.length && signals.primary_function) {
    if (profile.desired_functions.some(f => tokenOverlap(f, signals.primary_function!))) {
      raw += 0.2 * cAspiration
      reasons.push('Function match')
    }
  }
  // Growth direction
  if (profile.growth_direction === 'leadership' && ['manager', 'leader'].includes(signals.role_type ?? '')) {
    raw += 0.15 * cAspiration
    reasons.push('Leadership direction match')
  }
  if (profile.growth_direction === 'ic' && signals.role_type === 'ic') {
    raw += 0.15 * cAspiration
    reasons.push('IC direction match')
  }
  // Keywords vs requirements (token overlap)
  const keywordMatches = arrayOverlapCount(profile.keywords ?? [], signals.key_requirements ?? [])
  if (keywordMatches > 0) {
    raw += Math.min(0.15, keywordMatches * 0.05) * cAspiration
    reasons.push(`Keyword match (${keywordMatches})`)
  }
  // Desired industry
  if (profile.desired_industries?.some(i =>
    signals.industries?.some(ji => tokenOverlap(i, ji))
  )) {
    raw += 0.1 * cAspiration
    reasons.push('Desired industry match')
  }
  // Company type match
  if (profile.desired_company_types?.length && signals.company_type) {
    if (profile.desired_company_types.some(t => tokenOverlap(t, signals.company_type!))) {
      raw += 0.08 * cAspiration
      reasons.push('Company type match')
    }
  }

  // ── Stage 4 — Values / culture bonuses ──────────────────────────────────
  if (profile.values_signals?.length && signals.culture_signals?.length) {
    const overlap = arrayOverlapCount(profile.values_signals, signals.culture_signals)
    if (overlap > 0) {
      raw += Math.min(0.2, overlap * 0.07) * cValues
      reasons.push(`Culture overlap (${overlap})`)
    }
  }
  if (profile.work_style === 'autonomous' && signals.culture_signals?.some(c =>
    tokenOverlap(c, 'autonomous self-directed independent')
  )) {
    raw += 0.08 * cValues
    reasons.push('Work style match')
  }
  if (profile.work_style === 'collaborative' && signals.culture_signals?.some(c =>
    tokenOverlap(c, 'collaborative team cross-functional')
  )) {
    raw += 0.08 * cValues
    reasons.push('Work style match')
  }

  // ── Stage 5 — Capabilities bonuses ──────────────────────────────────────
  if (profile.demonstrated_capabilities?.length && signals.key_requirements?.length) {
    const overlap = arrayOverlapCount(profile.demonstrated_capabilities, signals.key_requirements)
    if (overlap > 0) {
      raw += Math.min(0.25, overlap * 0.08) * cCapabilities
      reasons.push(`Skills match (${overlap})`)
    }
  }
  if (profile.problem_domain && signals.primary_function &&
      tokenOverlap(profile.problem_domain, signals.primary_function)) {
    raw += 0.1 * cCapabilities
    reasons.push('Problem domain match')
  }

  const normalized = (raw - RAW_MIN) / (RAW_MAX - RAW_MIN)

  return {
    raw,
    normalized: Math.max(0, Math.min(1, normalized)),
    reasons,
    penalties,
  }
}

export function assignTier(normalizedScore: number): 'great' | 'good' | 'other' {
  if (normalizedScore >= 0.72) return 'great'
  if (normalizedScore >= 0.50) return 'good'
  return 'other'
}

export function makeDeduKey(title: string, company: string, location: string): string {
  const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
  return `${normalize(title)}-${normalize(company)}-${normalize(location)}`
}
