import { create } from 'zustand'
import type { InstalledFeature, FeatureGenerationStep } from '../types'

export interface GenerationJob {
  id: string
  name: string
  step: FeatureGenerationStep
}

interface FeatureState {
  features: InstalledFeature[]
  isBuilderOpen: boolean
  generationJobs: GenerationJob[]
  highlightedFeatureSlug: string | null

  openBuilder: () => void
  closeBuilder: () => void
  startGeneration: (id: string, name: string) => void
  updateGenerationStep: (id: string, step: FeatureGenerationStep) => void
  removeGeneration: (id: string) => void
  addFeature: (feature: InstalledFeature) => void
  removeFeature: (slug: string) => void
  setHighlightedFeature: (slug: string | null) => void
  loadFeatures: (features: InstalledFeature[]) => void
}

export const useFeatureStore = create<FeatureState>((set) => ({
  features: [],
  isBuilderOpen: false,
  generationJobs: [],
  highlightedFeatureSlug: null,

  openBuilder: () => set({ isBuilderOpen: true }),
  closeBuilder: () => set({ isBuilderOpen: false }),

  startGeneration: (id, name) => set((state) => ({
    generationJobs: [...state.generationJobs, { id, name, step: 'analyzing' }],
    isBuilderOpen: false,
  })),

  updateGenerationStep: (id, step) => set((state) => ({
    generationJobs: state.generationJobs.map((job) =>
      job.id === id ? { ...job, step } : job
    ),
  })),

  removeGeneration: (id) => set((state) => ({
    generationJobs: state.generationJobs.filter((job) => job.id !== id),
  })),

  addFeature: (feature) =>
    set((state) => ({ features: [...state.features, feature] })),

  removeFeature: (slug) =>
    set((state) => ({ features: state.features.filter((f) => f.slug !== slug) })),

  setHighlightedFeature: (slug) => {
    set({ highlightedFeatureSlug: slug })
    if (slug) {
      setTimeout(() => set({ highlightedFeatureSlug: null }), 4500)
    }
  },

  loadFeatures: (features) => set({ features }),
}))
