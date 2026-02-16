import { create } from 'zustand'
import type { InstalledFeature, FeatureGenerationStep } from '../types'

interface FeatureState {
  features: InstalledFeature[]
  isBuilderOpen: boolean
  currentGenerationId: string | null
  currentStep: FeatureGenerationStep | null
  highlightedFeatureSlug: string | null

  openBuilder: () => void
  closeBuilder: () => void
  setGenerationStep: (id: string, step: FeatureGenerationStep) => void
  addFeature: (feature: InstalledFeature) => void
  setHighlightedFeature: (slug: string | null) => void
  loadFeatures: (features: InstalledFeature[]) => void
}

export const useFeatureStore = create<FeatureState>((set) => ({
  features: [],
  isBuilderOpen: false,
  currentGenerationId: null,
  currentStep: null,
  highlightedFeatureSlug: null,

  openBuilder: () => set({ isBuilderOpen: true }),
  closeBuilder: () => set({ isBuilderOpen: false, currentGenerationId: null, currentStep: null }),

  setGenerationStep: (id, step) => set({ currentGenerationId: id, currentStep: step }),

  addFeature: (feature) =>
    set((state) => ({ features: [...state.features, feature] })),

  setHighlightedFeature: (slug) => {
    set({ highlightedFeatureSlug: slug })
    if (slug) {
      setTimeout(() => set({ highlightedFeatureSlug: null }), 4500)
    }
  },

  loadFeatures: (features) => set({ features }),
}))
