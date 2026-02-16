import { useEffect, useState } from 'react'
import { Search, Brain, Cog, FlaskConical, Wrench, CheckCircle2, XCircle } from 'lucide-react'
import type { FeatureGenerationStep } from '../../types'

const steps: { key: FeatureGenerationStep; icon: React.ElementType; label: string }[] = [
  { key: 'analyzing', icon: Search, label: 'Analyzing your request...' },
  { key: 'designing', icon: Brain, label: 'Designing the feature architecture...' },
  { key: 'generating', icon: Cog, label: 'Generating code...' },
  { key: 'testing', icon: FlaskConical, label: 'Running tests...' },
  { key: 'fixing', icon: Wrench, label: 'Found an issue, fixing...' },
  { key: 'ready', icon: CheckCircle2, label: 'Feature ready! Installing...' },
  { key: 'failed', icon: XCircle, label: 'Could not create this feature. Try rephrasing your request.' },
]

interface ProgressViewProps {
  currentStep: FeatureGenerationStep
}

export function ProgressView({ currentStep }: ProgressViewProps) {
  const [progress, setProgress] = useState(0)

  const currentIndex = steps.findIndex((s) => s.key === currentStep)
  const totalSteps = steps.length - 2 // exclude fixing & failed from total
  const targetProgress = currentStep === 'ready' ? 100 : currentStep === 'failed' ? 100 : ((currentIndex + 1) / totalSteps) * 90

  useEffect(() => {
    setProgress(0)
    const timer = setTimeout(() => setProgress(targetProgress), 100)
    return () => clearTimeout(timer)
  }, [targetProgress])

  const isComplete = currentStep === 'ready'
  const isFailed = currentStep === 'failed'

  return (
    <div className="px-6 py-8 space-y-8">
      {/* Progress Bar */}
      <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            isFailed ? 'bg-error' : isComplete ? 'bg-success' : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps
          .filter((s) => {
            // Always show current step
            if (s.key === currentStep) return true
            // Show completed steps (before current)
            const sIdx = steps.findIndex((x) => x.key === s.key)
            return sIdx < currentIndex && s.key !== 'fixing' && s.key !== 'failed'
          })
          .map((step) => {
            const isActive = step.key === currentStep
            const Icon = step.icon
            const isPast = steps.findIndex((s) => s.key === step.key) < currentIndex

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-[var(--radius-button)] transition-all ${
                  isActive
                    ? isFailed
                      ? 'bg-error/10 text-error'
                      : isComplete
                        ? 'bg-success/10 text-success'
                        : 'bg-primary/10 text-primary'
                    : isPast
                      ? 'text-success'
                      : 'text-text-secondary'
                }`}
              >
                {isPast ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : (
                  <Icon size={18} className={isActive && !isComplete && !isFailed ? 'animate-pulse' : ''} />
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </div>
            )
          })}
      </div>

      {/* Success Checkmark */}
      {isComplete && (
        <div className="flex justify-center">
          <div className="animate-checkmark w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-success" />
          </div>
        </div>
      )}
    </div>
  )
}
