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

export interface Feature {
  id: string
  name: string
  icon: string
  description: string
  userPrompt: string
  code: string
  status: 'generating' | 'testing' | 'fixing' | 'ready' | 'failed'
  attempts: number
  createdAt: string
  sidebarOrder: number
}

export type FeatureGenerationStep =
  | 'analyzing'
  | 'designing'
  | 'generating'
  | 'testing'
  | 'fixing'
  | 'ready'
  | 'failed'
