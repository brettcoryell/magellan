'use client'

interface StageProgressProps {
  currentStage: number
  completedStages: number[]
  schemaWarningStages?: number[]
  onNavigate?: (stage: number) => void
}

const STAGES = [
  { number: 1, label: 'Resume Upload' },
  { number: 2, label: 'Hard Constraints' },
  { number: 3, label: 'Career Aspirations' },
  { number: 4, label: 'Values & Culture' },
  { number: 5, label: 'Skills Match' },
  { number: 6, label: 'Your Story' },
  { number: 7, label: 'Broader Exploration' },
]

export default function StageProgress({
  currentStage,
  completedStages,
  schemaWarningStages = [],
  onNavigate,
}: StageProgressProps) {
  return (
    <nav aria-label="Progress" className="py-2">
      <ol className="space-y-1">
        {STAGES.map((stage, index) => {
          const isCompleted = completedStages.includes(stage.number)
          const isCurrent = currentStage === stage.number
          const isFuture = !isCompleted && !isCurrent
          const hasWarning = schemaWarningStages.includes(stage.number)
          const isClickable = isCompleted && onNavigate

          return (
            <li key={stage.number} className="relative">
              {index < STAGES.length - 1 && (
                <div className="absolute left-[19px] top-[36px] w-px h-[calc(100%+4px)] bg-slate-800" />
              )}

              <div
                className={`flex items-start gap-3 py-2 px-3 rounded-lg transition-all duration-300 ${
                  isCurrent ? 'bg-amber-500/5' : ''
                } ${isFuture ? 'opacity-40' : ''} ${isClickable ? 'cursor-pointer hover:bg-slate-800/60' : ''}`}
                onClick={isClickable ? () => onNavigate(stage.number) : undefined}
                title={isClickable ? `Go back to Stage ${stage.number}` : undefined}
              >
                {/* Circle indicator */}
                <div className="relative shrink-0 mt-0.5">
                  {isCompleted ? (
                    <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <svg className="w-4 h-4 text-slate-950" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : isCurrent ? (
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
                <div className="pt-1.5 min-w-0 flex items-start justify-between w-full">
                  <div>
                    <p className={`text-sm font-medium leading-tight ${
                      isCompleted ? 'text-amber-400' :
                      isCurrent ? 'text-slate-100' :
                      'text-slate-500'
                    }`}>
                      {stage.label}
                    </p>
                    {isCompleted && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isClickable ? 'Complete · click to edit' : 'Complete'}
                      </p>
                    )}
                  </div>
                  {hasWarning && (
                    <span title="Some details from your answer are stored as notes — nothing was lost" className="text-slate-500 text-sm ml-1 shrink-0">·</span>
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
