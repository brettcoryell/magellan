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
        Tell us what you absolutely won&apos;t accept in your next role.
      </p>
      <p className="text-slate-500 text-xs mb-4 italic">
        e.g. &ldquo;No finance or oil &amp; gas, must be fully remote, no agencies, no relocating to NYC&rdquo;
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
          className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 ${
            loading
              ? 'bg-amber-500/40 text-slate-950/60 cursor-not-allowed'
              : isValid
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search Jobs
        </button>

        {loading && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Searching Remotive for your initial matches — this takes a minute or two.
          </p>
        )}
      </form>
    </div>
  )
}
