export interface Contact {
  id: string
  name: string
  email: string
  company: string
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost'
  createdAt: string
  phone: string
  notes?: string
}

export interface Deal {
  id: string
  name: string
  value: number
  contactId: string
  contactName: string
  stage: DealStage
  date: string
}

export type DealStage =
  | 'Prospect'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost'

export interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'deal'
  description: string
  date: string
  contactName?: string
}

/**
 * An installed feature — derived from manifest.json on the filesystem.
 * This is the source of truth for what features are available.
 * Code is NOT stored here — it's loaded on demand from the gateway API.
 */
export interface InstalledFeature {
  slug: string
  name: string
  icon: string
  description: string
  route: string
  sidebarEntry: {
    label: string
    icon: string
    order: number
  }
  version?: string
}

export type FeatureGenerationStep =
  | 'analyzing'
  | 'designing'
  | 'generating'
  | 'testing'
  | 'fixing'
  | 'ready'
  | 'failed'
