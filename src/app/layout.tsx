import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Magellan',
  description: 'AI-powered job discovery for career direction',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--mag-bg)] text-[var(--mag-text)] antialiased">
        {children}
      </body>
    </html>
  )
}
