import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { Pipeline } from './pages/Pipeline'
import { Settings } from './pages/Settings'
import { DynamicFeature } from './components/features/DynamicFeature'
import { useFeatureStore } from './store/featureStore'
import { fetchFeatures } from './services/api'

function AppRoutes() {
  const navigate = useNavigate()
  const loadFeatures = useFeatureStore((s) => s.loadFeatures)

  // Load installed features from gateway on mount
  useEffect(() => {
    fetchFeatures()
      .then(loadFeatures)
      .catch(() => {
        // Backend not available — that's fine for frontend-only dev
      })
  }, [loadFeatures])

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
