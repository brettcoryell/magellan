import AuthForm from '@/components/auth/AuthForm'
import StatsRow from '@/components/landing/StatsRow'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left side: Hero */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-20 bg-slate-950 border-r border-slate-800">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-amber-400 font-semibold text-lg tracking-tight">Career Explorer</span>
          </div>

          <h1 className="text-4xl font-bold text-slate-100 leading-tight mb-4">
            Find jobs that actually<br />
            <span className="text-amber-400">fit who you are.</span>
          </h1>

          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Upload your resume. Answer two questions. See real job postings ranked by how well they match your goals, constraints, and career direction.
          </p>

          <ul className="space-y-4">
            {[
              { icon: '01', text: 'Upload your resume — we extract your skills and experience automatically' },
              { icon: '02', text: 'Tell us what you won\'t accept — industries, locations, company types to avoid' },
              { icon: '03', text: 'Share where you want to go — we find roles aligned with your growth direction' },
            ].map(item => (
              <li key={item.icon} className="flex items-start gap-4">
                <span className="text-amber-500 font-mono text-sm font-bold mt-0.5 shrink-0">{item.icon}</span>
                <span className="text-slate-300 text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>

          <StatsRow />
        </div>
      </div>

      {/* Right side: Auth */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-16 lg:px-16">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-amber-400 font-semibold text-lg">Career Explorer</span>
        </div>

        <div className="w-full max-w-sm">
          <AuthForm />
        </div>
      </div>
    </div>
  )
}
