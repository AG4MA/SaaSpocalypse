import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFeatureStore } from '../../store/featureStore'
import { loadFeatureComponent } from '../../services/featureLoader'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card } from '../ui/Card'

export function DynamicFeature() {
  const { featureId } = useParams<{ featureId: string }>()
  const feature = useFeatureStore((s) => s.features.find((f) => f.id === featureId))
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!feature?.code) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    loadFeatureComponent(feature.code)
      .then((Comp) => {
        setComponent(() => Comp)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load feature')
        setLoading(false)
      })
  }, [feature?.code])

  if (!feature) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Feature not found</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-error mt-0.5" />
          <div>
            <h3 className="font-semibold text-error">Error Loading Feature</h3>
            <p className="text-sm text-text-secondary mt-1">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  if (!Component) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{feature.icon}</span>
        <h1 className="text-2xl font-bold">{feature.name}</h1>
      </div>
      <Component />
    </div>
  )
}
