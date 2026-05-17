'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function useCountUp(target: number, duration: number, delay: number) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const startTimer = setTimeout(() => {
      const startTime = Date.now()
      const tick = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress >= 1) clearInterval(tick)
      }, 16)
      return () => clearInterval(tick)
    }, delay)
    return () => clearTimeout(startTimer)
  }, [target, duration, delay])
  return value
}

function useFadeIn(delay: number) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return visible
}

export default function StatsRow() {
  const count3 = useCountUp(3, 1500, 0)
  const count100 = useCountUp(100, 1500, 1000)
  const aiVisible = useFadeIn(500)

  return (
    <div className="mt-10 pt-8 border-t border-slate-800">
      <div className="mb-6">
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-700/60 rounded-lg px-4 py-2 transition-colors"
        >
          Learn More
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400 tabular-nums">{count3}</div>
          <div className="text-xs text-slate-500 mt-0.5">job sources</div>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div className="text-center">
          <div className={`text-2xl font-bold text-amber-400 transition-opacity duration-500 ${aiVisible ? 'opacity-100' : 'opacity-0'}`}>
            AI
          </div>
          <div className="text-xs text-slate-500 mt-0.5">fit scoring</div>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400 tabular-nums">{count100}%</div>
          <div className="text-xs text-slate-500 mt-0.5">personalized</div>
        </div>
      </div>
    </div>
  )
}
