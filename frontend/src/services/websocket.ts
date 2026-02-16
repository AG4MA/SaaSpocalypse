import type { Feature, FeatureGenerationStep } from '../types'

interface WebSocketCallbacks {
  onStep: (step: FeatureGenerationStep) => void
  onComplete: (feature: Feature) => void
  onError: (error: string) => void
}

export function connectWebSocket(featureId: string, callbacks: WebSocketCallbacks): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/features/${featureId}`)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'step':
          callbacks.onStep(data.step as FeatureGenerationStep)
          break
        case 'complete':
          callbacks.onComplete(data.feature as Feature)
          ws.close()
          break
        case 'error':
          callbacks.onError(data.message || 'Unknown error')
          ws.close()
          break
      }
    } catch (err) {
      console.error('WebSocket message parse error:', err)
    }
  }

  ws.onerror = () => {
    callbacks.onError('WebSocket connection error')
  }

  ws.onclose = () => {
    // Connection closed
  }

  return ws
}
