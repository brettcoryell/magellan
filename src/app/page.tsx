import AuthForm from '@/components/auth/AuthForm'
import StatsRow from '@/components/landing/StatsRow'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--mag-bg)] flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-20 border-r border-[var(--mag-border)]">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[var(--mag-accent)] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--mag-accent-contrast)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-[var(--mag-accent)] font-semibold text-lg tracking-tight">Magellan</span>
          </div>

          <h1 className="text-4xl font-bold text-[var(--mag-text)] leading-tight mb-4">
            Navigate toward work<br />
            <span className="text-[var(--mag-accent)]">that fits your direction.</span>
          </h1>

          <p className="text-[var(--mag-text-soft)] text-lg mb-10 leading-relaxed">
            Build a preference profile, then see real job postings ranked by how well they match your goals, constraints, values, and career direction.
          </p>

          <ul className="space-y-4">
            {[
              { icon: '01', text: 'Upload your resume — we extract your skills and experience automatically' },
              { icon: '02', text: 'Tell us what you won\'t accept — industries, locations, company types to avoid' },
              { icon: '03', text: 'Share where you want to go — we find roles aligned with your growth direction' },
            ].map(item => (
              <li key={item.icon} className="flex items-start gap-4">
                <span className="text-[var(--mag-accent-strong)] font-mono text-sm font-bold mt-0.5 shrink-0">{item.icon}</span>
                <span className="text-[var(--mag-text-soft)] text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>

          <StatsRow />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-16 lg:px-16">
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 bg-[var(--mag-accent)] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--mag-accent-contrast)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-[var(--mag-accent)] font-semibold text-lg">Magellan</span>
        </div>

        <div className="w-full max-w-sm">
          <AuthForm />
        </div>
      </div>
    </div>
  )
}
