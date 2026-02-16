import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useFeatureStore, type GenerationJob } from '../../store/featureStore'
import type { FeatureGenerationStep } from '../../types'

const stepLabels: Record<FeatureGenerationStep, string> = {
  analyzing: 'Analyzing...',
  designing: 'Designing...',
  generating: 'Generating...',
  testing: 'Testing...',
  fixing: 'Fixing...',
  ready: 'Ready!',
  failed: 'Failed',
}

interface JobItemProps {
  job: GenerationJob
  onRemove: () => void
}

function JobItem({ job, onRemove }: JobItemProps) {
  const isComplete = job.step === 'ready'
  const isFailed = job.step === 'failed'
  const isActive = !isComplete && !isFailed
  
  // Truncate name to ~18 chars
  const displayName = job.name.length > 18 ? job.name.slice(0, 18) + '…' : job.name

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
        isFailed 
          ? 'bg-error/10 border border-error/30' 
          : isComplete 
            ? 'bg-success/10 border border-success/30'
            : 'bg-surface-hover border border-border'
      }`}
    >
      {/* Icon */}
      {isComplete ? (
        <CheckCircle2 size={14} className="text-success flex-shrink-0" />
      ) : isFailed ? (
        <XCircle size={14} className="text-error flex-shrink-0" />
      ) : (
        <Loader2 size={14} className="text-primary animate-spin flex-shrink-0" />
      )}
      
      {/* Name + Status */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-text-primary font-medium" title={job.name}>
          {displayName}
        </div>
        <div className={`text-[10px] ${isFailed ? 'text-error' : isComplete ? 'text-success' : 'text-text-secondary'}`}>
          {stepLabels[job.step]}
        </div>
      </div>
      
      {/* Close button - always visible for failed, hover for others */}
      <button
        onClick={onRemove}
        className={`p-0.5 rounded hover:bg-surface text-text-secondary hover:text-red-400 transition-colors flex-shrink-0 ${
          isFailed || isComplete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title={isActive ? 'Cancel' : 'Dismiss'}
      >
        <X size={12} />
      </button>
    </div>
  )
}

export function SidebarGenerationProgress() {
  const { generationJobs, removeGeneration } = useFeatureStore()

  if (generationJobs.length === 0) return null

  return (
    <div className="space-y-1 mb-1">
      {generationJobs.map((job) => (
        <div key={job.id} className="group">
          <JobItem 
            job={job} 
            onRemove={() => {
              // Emit cancel event if still active
              if (job.step !== 'ready' && job.step !== 'failed') {
                window.dispatchEvent(new CustomEvent('cancel-generation', { detail: { id: job.id } }))
              }
              removeGeneration(job.id)
            }} 
          />
        </div>
      ))}
    </div>
  )
}
