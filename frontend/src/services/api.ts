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
 * Delete a feature by slug.
 */
export async function deleteFeature(slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/features/${slug}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Failed to delete feature')
  }
}

/**
 * Start building a new AI feature.
 * Creates a generation job, connects via WebSocket for progress,
 * and resolves when the feature is installed.
 */
export async function buildFeature(prompt: string): Promise<void> {
  const store = useFeatureStore.getState()
  
  // Generate temp ID until we get real one
  const tempId = `temp-${Date.now()}`
  
  // Start generation immediately in sidebar
  store.startGeneration(tempId, prompt)

  const res = await fetch(`${API_BASE}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    store.updateGenerationStep(tempId, 'failed')
    throw new Error('Failed to start feature generation')
  }

  const { id } = await res.json()
  
  // Update temp ID to real ID
  store.removeGeneration(tempId)
  store.startGeneration(id, prompt)

  return new Promise<void>((resolve, reject) => {
    const ws = connectWebSocket(id, {
      onStep: (step) => {
        store.updateGenerationStep(id, step)
      },
      onComplete: (feature: InstalledFeature) => {
        store.addFeature(feature)
        store.updateGenerationStep(id, 'ready')

        setTimeout(() => {
          store.removeGeneration(id)
          store.setHighlightedFeature(feature.slug)
          window.dispatchEvent(
            new CustomEvent('feature-installed', { detail: { slug: feature.slug, route: feature.route } })
          )
          resolve()
        }, 1500)
      },
      onError: (error: string) => {
        console.error('Feature generation failed:', error)
        store.updateGenerationStep(id, 'failed')
        reject(new Error(error))
      },
    })

    // Listen for cancel event
    const handleCancel = (e: CustomEvent<{ id: string }>) => {
      if (e.detail.id === id || e.detail.id === tempId) {
        ws?.close?.()
        reject(new Error('Cancelled by user'))
      }
    }
    window.addEventListener('cancel-generation', handleCancel as EventListener)
  })
}

// ─── API Key Management ───────────────────────────────────────

/**
 * Check if the API key is configured on the backend.
 */
export async function checkApiKeyStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/config/api-key/status`)
    if (!res.ok) return false
    const data = await res.json()
    return data.configured === true
  } catch {
    return false
  }
}

/**
 * Set the API key on the backend (encrypted in memory).
 */
export async function setApiKey(
  apiKey: string, 
  provider: string = 'anthropic',
  model?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/config/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, provider, model }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, message: data.detail || 'Failed to set API key' }
    }
    return { success: true, message: data.message }
  } catch (err) {
    return { success: false, message: 'Backend not available' }
  }
}

/**
 * Clear the API key from the backend.
 */
export async function clearApiKey(): Promise<void> {
  try {
    await fetch(`${API_BASE}/config/api-key`, { method: 'DELETE' })
  } catch {
    // Ignore errors
  }
}
