import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ProgressView } from './ProgressView'
import { useFeatureStore } from '../../store/featureStore'
import { buildFeature } from '../../services/api'

const suggestions = [
  'Create a weekly sales report',
  'Add a calendar for follow-ups',
  'Create a monthly goals tracker',
  'Add email templates for leads',
]

export function FeatureBuilderModal() {
  const { isBuilderOpen, closeBuilder, currentStep, currentGenerationId } = useFeatureStore()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    try {
      await buildFeature(prompt.trim())
    } catch {
      // Error handled in buildFeature via store updates
    }
    setIsGenerating(false)
    setPrompt('')
  }

  const handleClose = () => {
    if (!isGenerating) {
      closeBuilder()
      setPrompt('')
      setIsGenerating(false)
    }
  }

  const handleSuggestion = (text: string) => {
    setPrompt(text)
  }

  const isShowingProgress = isGenerating && currentStep && currentGenerationId

  return (
    <Modal isOpen={isBuilderOpen} onClose={handleClose} className="max-w-xl">
      {!isShowingProgress ? (
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
              <Sparkles size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold">Build a Feature</h2>
            <p className="text-sm text-text-secondary">
              Describe what you want and AI will build it for you.
            </p>
          </div>

          {/* Textarea */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the feature you want to create..."
            className="w-full h-32 bg-surface-hover border border-border rounded-[var(--radius-card)] px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />

          {/* Suggestions */}
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-3 py-1.5 text-xs bg-surface-hover hover:bg-primary/10 hover:text-primary border border-border rounded-full text-text-secondary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={!prompt.trim()} className="w-full" size="lg">
            Create
          </Button>
        </div>
      ) : (
        <ProgressView currentStep={currentStep} />
      )}
    </Modal>
  )
}
