'use client'

import { useState } from 'react'

interface AspirationFormProps {
  profileId: string
  onComplete: () => void
  onLoadingChange?: (loading: boolean) => void
}

export default function AspirationForm({ profileId, onComplete, onLoadingChange }: AspirationFormProps) {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = answer.trim().length >= 20

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    onLoadingChange?.(true)
    setError(null)

    try {
      const response = await fetch('/api/submit-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 3, answer: answer.trim(), profileId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      onComplete()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  return (
    <div>
      <h3 className="text-slate-100 font-semibold mb-1">Your Career Aspirations</h3>
      <p className="text-slate-400 text-sm mb-1">
        Where do you want your career to go? What kind of work excites you?
      </p>
      <p className="text-slate-500 text-xs mb-4 italic">
        e.g. &ldquo;I want to move into engineering leadership at a growth-stage startup, ideally in climate tech or developer tooling. I&apos;m passionate about building high-performing teams.&rdquo;
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Describe your ideal next role, industry interests, growth direction, and what matters most to you..."
          rows={5}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm resize-none"
        />

        <div className="flex items-center justify-between">
          <span className={`text-xs transition-colors ${
            answer.length < 20 ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {answer.trim().length} / 20 min characters
          </span>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 ${
            loading
              ? 'bg-slate-700 text-white cursor-not-allowed'
              : isValid
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching job boards...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Find Matching Jobs
            </>
          )}
        </button>

        {loading && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Searching Remotive and Adzuna — this takes a minute or two.
          </p>
        )}
      </form>
    </div>
  )
}
