import type { Activity } from '../types'

export const activities: Activity[] = [
  { id: 'a1', type: 'deal', description: 'Deal "LogiSmart Renewal" closed successfully — €18,000', date: '2025-12-15', contactName: 'Roberto Russo' },
  { id: 'a2', type: 'call', description: 'Follow-up call completed', date: '2026-02-14', contactName: 'Marco Rossi' },
  { id: 'a3', type: 'email', description: 'Commercial proposal sent', date: '2026-02-13', contactName: 'Davide Moretti' },
  { id: 'a4', type: 'meeting', description: 'Product demo scheduled for Feb 20', date: '2026-02-12', contactName: 'Sara Marchetti' },
  { id: 'a5', type: 'note', description: 'Updated lead status to "Qualified"', date: '2026-02-10', contactName: 'Chiara Lombardi' },
]
