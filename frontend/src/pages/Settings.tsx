import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useFeatureStore } from '../store/featureStore'
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface UxEvaluation {
  score: number
  summary: string
  issues: string[]
  suggestions: string[]
}

export function Settings() {
  const features = useFeatureStore((s) => s.features)
  const [uxEval, setUxEval] = useState<UxEvaluation | null>(null)
  const [uxLoading, setUxLoading] = useState(false)

  const runUxEvaluation = async () => {
    setUxLoading(true)
    try {
      const res = await fetch('/api/ux-evaluation')
      const data = await res.json()
      setUxEval(data)
    } catch {
      setUxEval({ score: -1, summary: 'Could not connect to backend.', issues: [], suggestions: [] })
    }
    setUxLoading(false)
  }

  const scoreColor = uxEval
    ? uxEval.score >= 80 ? 'text-success' : uxEval.score >= 50 ? 'text-warning' : 'text-error'
    : ''

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-2xl font-bold">AG</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Alex Green</h2>
            <p className="text-sm text-text-secondary">Sales Manager</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Company Name" defaultValue="MorphCRM Inc." />
          <Input label="Email" defaultValue="alex.green@morphcrm.io" />
          <Input label="Timezone" defaultValue="Europe/Rome (GMT+1)" />
          <Input label="Language" defaultValue="English" />
        </div>

        <div className="mt-4 flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </Card>

      {/* Installed Features */}
      <Card>
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Installed Features</h3>
        {features.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm">No AI features installed yet.</p>
            <p className="text-text-secondary text-xs mt-1">
              Click "Build Feature" in the sidebar to create your first one!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {features.map((f) => (
              <div
                key={f.slug}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-card)] bg-surface-hover"
              >
                <span className="text-xl">{f.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-text-secondary">{f.description}</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* UX Evaluation Agent */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-secondary">UI/UX Quality Agent</h3>
          </div>
          <Button variant="secondary" size="sm" onClick={runUxEvaluation} disabled={uxLoading}>
            {uxLoading ? (
              <><Loader2 size={14} className="animate-spin mr-1.5" /> Evaluating...</>
            ) : (
              'Run Evaluation'
            )}
          </Button>
        </div>

        {!uxEval ? (
          <p className="text-sm text-text-secondary text-center py-4">
            Click "Run Evaluation" to let the AI agent assess the UI/UX quality of your installed features.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Score */}
            {uxEval.score >= 0 && (
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${scoreColor}`}>{uxEval.score}</span>
                <span className="text-sm text-text-secondary">/ 100</span>
              </div>
            )}

            {/* Summary */}
            <p className="text-sm">{uxEval.summary}</p>

            {/* Issues */}
            {uxEval.issues.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-warning" /> Issues
                </h4>
                {uxEval.issues.map((issue, i) => (
                  <p key={i} className="text-xs text-text-secondary pl-5">• {issue}</p>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {uxEval.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  {uxEval.score >= 80 ? <CheckCircle2 size={12} className="text-success" /> : <Info size={12} className="text-primary" />}
                  Suggestions
                </h4>
                {uxEval.suggestions.map((s, i) => (
                  <p key={i} className="text-xs text-text-secondary pl-5">• {s}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
