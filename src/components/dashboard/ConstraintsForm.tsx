'use client'

import { useState } from 'react'

interface ConstraintsFormProps {
  profileId: string
  onComplete: () => void
}

export default function ConstraintsForm({ profileId, onComplete }: ConstraintsFormProps) {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = answer.trim().length >= 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/submit-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 2, answer: answer.trim(), profileId }),
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
    }
  }

  return (
    <div>
      <h3 className="text-slate-100 font-semibold mb-1">Your Hard Constraints</h3>
      <p className="text-slate-400 text-sm mb-1">
        Tell us what you absolutely won't accept in your next role.
      </p>
      <p className="text-slate-500 text-xs mb-4 italic">
        e.g. "No finance or oil & gas, must be fully remote, no agencies, no relocating to NYC"
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Describe industries, company types, locations, or anything else you want to exclude..."
          rows={4}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm resize-none"
        />

        <div className="flex items-center justify-between">
          <span className={`text-xs transition-colors ${
            answer.length < 10 ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {answer.trim().length} / 10 min characters
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
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Finding initial jobs...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Jobs
            </>
          )}
        </button>
      </form>
    </div>
  )
}
