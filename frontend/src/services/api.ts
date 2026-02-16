import { useFeatureStore } from '../store/featureStore'
import { connectWebSocket } from './websocket'
import type { Feature } from '../types'

const API_BASE = '/api'

export async function fetchFeatures(): Promise<Feature[]> {
  const res = await fetch(`${API_BASE}/features`)
  if (!res.ok) throw new Error('Failed to fetch features')
  return res.json()
}

export async function fetchFeatureCode(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/features/${id}/code`)
  if (!res.ok) throw new Error('Failed to fetch feature code')
  const data = await res.json()
  return data.code
}

export async function buildFeature(prompt: string): Promise<void> {
  const store = useFeatureStore.getState()

  // Start the feature creation on the backend
  const res = await fetch(`${API_BASE}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    store.setGenerationStep('', 'failed')
    throw new Error('Failed to start feature generation')
  }

  const { id } = await res.json()

  // Connect WebSocket for progress updates
  return new Promise<void>((resolve, reject) => {
    connectWebSocket(id, {
      onStep: (step) => {
        store.setGenerationStep(id, step)
      },
      onComplete: (feature: Feature) => {
        store.addFeature(feature)
        store.setGenerationStep(id, 'ready')

        // Auto-close after a brief moment
        setTimeout(() => {
          store.closeBuilder()
          store.setHighlightedFeature(feature.id)
          // Navigate will be handled by the component
          window.dispatchEvent(new CustomEvent('feature-installed', { detail: { featureId: feature.id } }))
          resolve()
        }, 1500)
      },
      onError: (error: string) => {
        console.error('Feature generation failed:', error)
        store.setGenerationStep(id, 'failed')
        reject(new Error(error))
      },
    })
  })
}
