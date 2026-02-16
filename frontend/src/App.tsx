import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { Pipeline } from './pages/Pipeline'
import { Settings } from './pages/Settings'
import { DynamicFeature } from './components/features/DynamicFeature'
import { ApiKeyModal } from './components/features/ApiKeyModal'
import { useFeatureStore } from './store/featureStore'
import { fetchFeatures, checkApiKeyStatus, clearApiKey } from './services/api'

function AppRoutes() {
  const navigate = useNavigate()
  const loadFeatures = useFeatureStore((s) => s.loadFeatures)
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null)
  const [isCheckingKey, setIsCheckingKey] = useState(true)

  // Check API key status on mount and set up cleanup on window close
  useEffect(() => {
    const checkKey = async () => {
      setIsCheckingKey(true)
      const configured = await checkApiKeyStatus()
      setApiKeyConfigured(configured)
      setIsCheckingKey(false)
    }
    checkKey()

    // Clean up API key when the page/tab is closed
    const handleBeforeUnload = () => {
      // Use fetch with keepalive for reliable cleanup on page close
      fetch('/api/config/api-key', { 
        method: 'DELETE',
        keepalive: true 
      }).catch(() => {})
    }

    // Also clean up when visibility changes (mobile/tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Session is ending, clear the key
        fetch('/api/config/api-key', { 
          method: 'DELETE',
          keepalive: true 
        }).catch(() => {})
        setApiKeyConfigured(false)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    // Note: uncomment below if you want key cleared on tab switch too
    // document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Load installed features from gateway on mount (only after API key is configured)
  useEffect(() => {
    if (apiKeyConfigured) {
      fetchFeatures()
        .then(loadFeatures)
        .catch(() => {
          // Backend not available — that's fine for frontend-only dev
        })
    }
  }, [loadFeatures, apiKeyConfigured])

  // Listen for new feature installs to auto-navigate
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.route) {
        navigate(detail.route)
      }
    }
    window.addEventListener('feature-installed', handler)
    return () => window.removeEventListener('feature-installed', handler)
  }, [navigate])

  // Show loading state while checking API key
  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  // Show API key modal if not configured
  if (!apiKeyConfigured) {
    return (
      <div className="min-h-screen bg-background">
        <ApiKeyModal 
          isOpen={true} 
          onSuccess={() => setApiKeyConfigured(true)} 
        />
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/settings" element={<Settings />} />
        {/* Dynamic route for all AI-generated features */}
        <Route path="/feature/:featureSlug" element={<DynamicFeature />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
