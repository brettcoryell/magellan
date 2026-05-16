'use client'

import { CareerProfile } from '@/lib/types'

interface ProfilePanelProps {
  profile: CareerProfile | null
  active: boolean
}

export default function ProfilePanel({ profile, active }: ProfilePanelProps) {
  const pref = profile?.preference_profile as Record<string, unknown> | undefined

  const jobTitle = (pref?.current_job_title as string) ||
                   (pref?.job_title as string) ||
                   null

  const skills: string[] = Array.isArray(pref?.key_skills)
    ? (pref.key_skills as string[]).slice(0, 8)
    : []

  const industry = (pref?.industry as string) || null

  return (
    <div className={`rounded-xl border p-5 transition-all duration-400 ${
      active
        ? 'bg-slate-900 border-slate-700 shadow-lg'
        : 'bg-slate-900/40 border-slate-800/60'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full transition-all duration-400 ${active ? 'bg-amber-400' : 'bg-slate-700'}`} />
        <h3 className={`text-sm font-semibold uppercase tracking-wider transition-colors duration-400 ${
          active ? 'text-amber-400' : 'text-slate-600'
        }`}>
          Your Profile
        </h3>
      </div>

      {!active ? (
        <div className="space-y-2">
          <div className="h-4 bg-slate-800 rounded w-3/4 animate-none" />
          <div className="h-3 bg-slate-800/60 rounded w-1/2" />
          <div className="flex gap-1.5 mt-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-5 bg-slate-800/40 rounded-full w-14" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {jobTitle && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Current Role</p>
              <p className="text-slate-100 font-medium text-sm">{jobTitle}</p>
            </div>
          )}

          {industry && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Industry</p>
              <p className="text-slate-300 text-sm">{industry}</p>
            </div>
          )}

          {skills.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Key Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map(skill => (
                  <span
                    key={skill}
                    className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full border border-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile?.resume_filename && (
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-slate-500 truncate">{profile.resume_filename}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
