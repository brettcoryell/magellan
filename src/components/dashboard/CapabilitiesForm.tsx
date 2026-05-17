'use client'

import { useState } from 'react'

interface CapabilitiesFormProps {
  profileId: string
  onComplete: () => void
}

export default function CapabilitiesForm({ profileId, onComplete }: CapabilitiesFormProps) {
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
      const res = await fetch('/api/submit-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 5, answer, profileId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Skills &amp; Capabilities</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          What&apos;s the hardest problem you&apos;ve solved in the last two years, and why were you the right person to solve it?
        </p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={5}
        placeholder="The problem that stretched me most was…"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !isValid}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          loading
            ? 'bg-amber-500/40 text-slate-950/60 cursor-not-allowed'
            : isValid
            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
        }`}
      >
        {loading ? 'Generating match analysis…' : 'Unlock Full Matches →'}
      </button>
    </form>
  )
}
