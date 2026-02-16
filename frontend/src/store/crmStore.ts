import { create } from 'zustand'
import type { Contact, Deal, DealStage } from '../types'
import { contacts as initialContacts } from '../data/contacts'
import { deals as initialDeals } from '../data/deals'

interface CrmState {
  contacts: Contact[]
  deals: Deal[]
  searchQuery: string
  statusFilter: string | null

  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string | null) => void
  moveDeal: (dealId: string, newStage: DealStage) => void
}

export const useCrmStore = create<CrmState>((set) => ({
  contacts: initialContacts,
  deals: initialDeals,
  searchQuery: '',
  statusFilter: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  moveDeal: (dealId, newStage) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    })),
}))
