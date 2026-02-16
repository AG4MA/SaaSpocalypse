import { useFeatureStore } from '../store/featureStore'
import { connectWebSocket } from './websocket'
import type { InstalledFeature } from '../types'

const API_BASE = '/api'

/**
 * Fetch all installed features from the gateway (filesystem-based).
 */
export async function fetchFeatures(): Promise<InstalledFeature[]> {
  const res = await fetch(`${API_BASE}/features`)
  if (!res.ok) throw new Error('Failed to fetch features')
  return res.json()
}

/**
 * Fetch component source code for a feature by slug.
 * Code is loaded on demand, not stored in the frontend store.
 */
export async function fetchFeatureCode(slug: string): Promise<string> {
  const res = await fetch(`${API_BASE}/features/${slug}/code`)
  if (!res.ok) throw new Error('Failed to fetch feature code')
  const data = await res.json()
  return data.code
}

/**
 * Start building a new AI feature.
 * Creates a generation job, connects via WebSocket for progress,
 * and resolves when the feature is installed.
 */
export async function buildFeature(prompt: string): Promise<void> {
  const store = useFeatureStore.getState()

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

  return new Promise<void>((resolve, reject) => {
    connectWebSocket(id, {
      onStep: (step) => {
        store.setGenerationStep(id, step)
      },
      onComplete: (feature: InstalledFeature) => {
        store.addFeature(feature)
        store.setGenerationStep(id, 'ready')

        setTimeout(() => {
          store.closeBuilder()
          store.setHighlightedFeature(feature.slug)
          window.dispatchEvent(
            new CustomEvent('feature-installed', { detail: { slug: feature.slug, route: feature.route } })
          )
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
