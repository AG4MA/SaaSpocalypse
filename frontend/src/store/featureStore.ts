import { create } from 'zustand'
import type { Feature, FeatureGenerationStep } from '../types'

interface FeatureState {
  features: Feature[]
  isBuilderOpen: boolean
  currentGenerationId: string | null
  currentStep: FeatureGenerationStep | null
  highlightedFeatureId: string | null

  openBuilder: () => void
  closeBuilder: () => void
  setGenerationStep: (id: string, step: FeatureGenerationStep) => void
  addFeature: (feature: Feature) => void
  updateFeature: (id: string, updates: Partial<Feature>) => void
  setHighlightedFeature: (id: string | null) => void
  loadFeatures: (features: Feature[]) => void
}

export const useFeatureStore = create<FeatureState>((set) => ({
  features: [],
  isBuilderOpen: false,
  currentGenerationId: null,
  currentStep: null,
  highlightedFeatureId: null,

  openBuilder: () => set({ isBuilderOpen: true }),
  closeBuilder: () => set({ isBuilderOpen: false, currentGenerationId: null, currentStep: null }),

  setGenerationStep: (id, step) => set({ currentGenerationId: id, currentStep: step }),

  addFeature: (feature) =>
    set((state) => ({ features: [...state.features, feature] })),

  updateFeature: (id, updates) =>
    set((state) => ({
      features: state.features.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  setHighlightedFeature: (id) => {
    set({ highlightedFeatureId: id })
    if (id) {
      setTimeout(() => set({ highlightedFeatureId: null }), 4500)
    }
  },

  loadFeatures: (features) => set({ features }),
}))
