'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'register'

export default function AuthForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setError(error.message)
        } else {
          router.push('/dashboard')
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) {
          setError(error.message)
        } else {
          setMessage('Check your email to confirm your account.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[var(--mag-surface)] border border-[var(--mag-border)] rounded-lg p-8 shadow-2xl">
      <h2 className="text-2xl font-bold text-[var(--mag-text)] mb-1">
        {tab === 'login' ? 'Welcome back' : 'Create account'}
      </h2>
      <p className="text-[var(--mag-text-soft)] text-sm mb-6">
        {tab === 'login'
          ? 'Sign in to continue to your dashboard.'
          : 'Start navigating better-fit roles.'}
      </p>

      <div className="flex bg-[var(--mag-bg)] rounded-lg p-1 mb-6 border border-[var(--mag-border)]">
        {(['login', 'register'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setError(null)
              setMessage(null)
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              tab === t
                ? 'bg-[var(--mag-accent)] text-[var(--mag-accent-contrast)] shadow'
                : 'text-[var(--mag-text-soft)] hover:text-[var(--mag-text)]'
            }`}
          >
            {t === 'login' ? 'Sign In' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--mag-text-soft)] mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full bg-[var(--mag-bg)] border border-[var(--mag-border-strong)] rounded-lg px-4 py-2.5 text-[var(--mag-text)] placeholder:text-[var(--mag-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--mag-accent)] focus:border-transparent transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--mag-text-soft)] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder={tab === 'register' ? 'Min. 8 characters' : '••••••••'}
            minLength={tab === 'register' ? 8 : undefined}
            className="w-full bg-[var(--mag-bg)] border border-[var(--mag-border-strong)] rounded-lg px-4 py-2.5 text-[var(--mag-text)] placeholder:text-[var(--mag-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--mag-accent)] focus:border-transparent transition-all text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg px-4 py-3">
            <p className="text-emerald-400 text-sm">{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--mag-accent)] hover:bg-[var(--mag-accent-strong)] disabled:opacity-50 text-[var(--mag-accent-contrast)] font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {tab === 'login' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : (
            tab === 'login' ? 'Sign In' : 'Create Account'
          )}
        </button>
      </form>

      <p className="text-center text-[var(--mag-text-muted)] text-xs mt-6">
        By continuing, you agree to our terms of service.
      </p>
    </div>
  )
}
