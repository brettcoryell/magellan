import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--mag-bg)]">
      <header className="border-b border-[var(--mag-border)]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-[var(--mag-accent)] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--mag-accent-contrast)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-[var(--mag-accent)] font-semibold text-sm tracking-tight">Magellan</span>
          </Link>
          <Link
            href="/"
            className="text-xs text-[var(--mag-text-muted)] hover:text-[var(--mag-text)] transition-colors border border-[var(--mag-border)] rounded-lg px-3 py-1.5"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <h1 className="text-3xl font-bold text-[var(--mag-text)] leading-tight mb-6">
            About Magellan
          </h1>
          <div className="space-y-4 text-[var(--mag-text-soft)] leading-relaxed">
            <p>
              Finding your next job is hard. Knowing what to look for is harder.
            </p>
            <p>
              Most job sites assume you already know what you want. You type in a title, a location,
              and a salary range — and you get back a list. But what if the title you&apos;re searching
              for isn&apos;t quite right? What if there are roles that match who you are and what
              you&apos;re good at, but you&apos;ve never thought to search for them?
            </p>
            <p>
              Magellan was built for that moment of uncertainty. It&apos;s not a replacement
              for LinkedIn or Indeed. It&apos;s a place to think before you search.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-[var(--mag-text)] mb-6">How It Works</h2>
          <div className="space-y-4 text-[var(--mag-text-soft)] leading-relaxed">
            <p>
              Magellan asks you a short series of questions — not a lengthy form, but a real
              conversation about your work. What you&apos;ve accomplished. What matters to you. What
              you won&apos;t do. What you&apos;re proud of but haven&apos;t found the right words for yet.
            </p>
            <p>
              As you answer, the site builds a picture of you — not just your resume, but your values,
              your strengths, and your direction. It uses that picture to find jobs that fit who you
              are, not just what you&apos;ve done.
            </p>
            <p>
              Jobs appear progressively as you share more. The more you tell us, the more precisely
              we can match you. And the matches update in real time — you can watch your results
              sharpen as the conversation deepens.
            </p>
          </div>
        </section>

        {/* What Makes It Different */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-[var(--mag-text)] mb-8">What Makes It Different</h2>
          <div className="space-y-8">
            <div className="border-l-2 border-[var(--mag-accent)] pl-6">
              <h3 className="text-base font-semibold text-[var(--mag-text)] mb-3">
                We ask questions based on research, not guesswork.
              </h3>
              <p className="text-[var(--mag-text-soft)] leading-relaxed text-sm">
                The questions in Magellan are grounded in what organizational psychologists
                and career researchers have found actually predicts job satisfaction and performance.
                We ask about the work you&apos;re proudest of — not because it sounds nice, but because
                the way you answer reveals your values more honestly than any checklist. We ask about
                the hardest problem you&apos;ve solved, because demonstrated capability is a better
                predictor of fit than a list of skills on a page.
              </p>
            </div>
            <div className="border-l-2 border-[var(--mag-accent)] pl-6">
              <h3 className="text-base font-semibold text-[var(--mag-text)] mb-3">
                We score honestly.
              </h3>
              <p className="text-[var(--mag-text-soft)] leading-relaxed text-sm">
                Every job in your results gets a fit score based on how well it matches your profile
                — your constraints, your aspirations, your values, and your strengths. But we also
                tell you where you don&apos;t fit. A job with three strong matches and one deal-breaker
                will show you both. We think you deserve the full picture.
              </p>
            </div>
            <div className="border-l-2 border-[var(--mag-accent)] pl-6">
              <h3 className="text-base font-semibold text-[var(--mag-text)] mb-3">
                We show you jobs you might not have considered.
              </h3>
              <p className="text-[var(--mag-text-soft)] leading-relaxed text-sm">
                After you&apos;ve built your profile, Magellan looks beyond the obvious results.
                It finds roles that match almost everything you said — except one thing you ruled out.
                It surfaces adjacent titles that people with your background have moved into
                successfully. It asks whether those boundaries are firm or flexible. Sometimes the
                most interesting opportunity is the one you almost filtered out.
              </p>
            </div>
          </div>
        </section>

        {/* What This Site Is Not */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-[var(--mag-text)] mb-6">What This Site Is Not</h2>
          <div className="space-y-4 text-[var(--mag-text-soft)] leading-relaxed">
            <p>
              Magellan is not an application tool. It won&apos;t submit your resume or message
              recruiters on your behalf. It&apos;s designed to help you arrive at other job sites —
              LinkedIn, Indeed, your industry&apos;s niche boards — with a clearer sense of what
              you&apos;re looking for and a broader sense of what&apos;s out there.
            </p>
            <p>
              Think of it as the conversation you&apos;d have with a trusted advisor before you started
              your search. We ask the questions. You do the thinking. Then you go apply.
            </p>
          </div>
        </section>

        {/* Data note */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-[var(--mag-text)] mb-6">A Note on Your Data</h2>
          <div className="text-[var(--mag-text-soft)] leading-relaxed">
            <p>
              Your answers, your resume, and your results are stored in your account and used only
              to power your experience in Magellan. We don&apos;t sell your data, share it with
              employers, or use it for advertising. When you&apos;re done, your data stays yours.
            </p>
          </div>
        </section>

        {/* Closing */}
        <div className="border-t border-[var(--mag-border)] pt-10">
          <p className="text-[var(--mag-text-soft)] leading-relaxed italic">
            Magellan was built with care for people who are ready to move but aren&apos;t sure where.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[var(--mag-accent)] text-[var(--mag-accent-contrast)] font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[var(--mag-accent-strong)] transition-colors"
            >
              Get started →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
