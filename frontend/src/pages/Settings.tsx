import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useFeatureStore } from '../store/featureStore'

export function Settings() {
  const features = useFeatureStore((s) => s.features.filter((f) => f.status === 'ready'))

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
                key={f.id}
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
    </div>
  )
}
