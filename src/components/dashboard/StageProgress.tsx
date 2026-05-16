'use client'

interface StageProgressProps {
  currentStage: number
  completedStages: number[]
}

const STAGES = [
  { number: 1, label: 'Resume Upload', phase: 1 },
  { number: 2, label: 'Hard Constraints', phase: 1 },
  { number: 3, label: 'Career Aspirations', phase: 1 },
  { number: 4, label: 'Values & Culture', phase: 2 },
  { number: 5, label: 'Skills Match', phase: 2 },
  { number: 6, label: 'Broader Exploration', phase: 2 },
]

export default function StageProgress({ currentStage, completedStages }: StageProgressProps) {
  return (
    <nav aria-label="Progress" className="py-2">
      <ol className="space-y-1">
        {STAGES.map((stage, index) => {
          const isCompleted = completedStages.includes(stage.number)
          const isCurrent = currentStage === stage.number
          const isPhase2 = stage.phase === 2
          const isLocked = isPhase2

          return (
            <li key={stage.number} className="relative">
              {/* Connector line */}
              {index < STAGES.length - 1 && (
                <div className="absolute left-[19px] top-[36px] w-px h-[calc(100%+4px)] bg-slate-800" />
              )}

              <div className={`flex items-start gap-3 py-2 px-3 rounded-lg transition-all duration-300 ${
                isCurrent && !isLocked ? 'bg-amber-500/5' : ''
              } ${isLocked ? 'opacity-40' : ''}`}>
                {/* Circle indicator */}
                <div className="relative shrink-0 mt-0.5">
                  {isCompleted && !isLocked ? (
                    <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <svg className="w-4 h-4 text-slate-950" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : isCurrent && !isLocked ? (
                    <div className="relative w-9 h-9">
                      <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                      <div className="relative w-9 h-9 rounded-full border-2 border-amber-500 bg-slate-900 flex items-center justify-center">
                        <span className="text-amber-400 text-sm font-bold">{stage.number}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center">
                      <span className="text-slate-500 text-sm font-medium">{stage.number}</span>
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="pt-1.5 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${
                    isCompleted && !isLocked
                      ? 'text-amber-400'
                      : isCurrent && !isLocked
                      ? 'text-slate-100'
                      : 'text-slate-500'
                  }`}>
                    {stage.label}
                  </p>
                  {isPhase2 && (
                    <p className="text-xs text-slate-600 mt-0.5">Phase 2</p>
                  )}
                  {isCompleted && !isLocked && (
                    <p className="text-xs text-slate-500 mt-0.5">Complete</p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
