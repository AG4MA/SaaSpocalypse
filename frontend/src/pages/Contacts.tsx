import { useState } from 'react'
import { Search, X, Mail, Phone, Building2, Calendar } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { useCrmStore } from '../store/crmStore'
import type { Contact } from '../types'

const statusVariant = {
  New: 'info' as const,
  Contacted: 'warning' as const,
  Qualified: 'success' as const,
  Lost: 'error' as const,
}

const statuses = ['All', 'New', 'Contacted', 'Qualified', 'Lost']

export function Contacts() {
  const { contacts, searchQuery, statusFilter, setSearchQuery, setStatusFilter } = useCrmStore()
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = !statusFilter || statusFilter === 'All' || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contacts</h1>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === 'All' ? null : s)}
              className={`px-3 py-1.5 text-xs rounded-[var(--radius-button)] transition-colors ${
                (s === 'All' && !statusFilter) || statusFilter === s
                  ? 'bg-primary text-white'
                  : 'bg-surface hover:bg-surface-hover text-text-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Company</th>
              <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => (
              <tr
                key={contact.id}
                className="border-b border-border last:border-0 hover:bg-surface-hover cursor-pointer transition-colors"
                onClick={() => setSelectedContact(contact)}
              >
                <td className="px-4 py-3 text-sm font-medium">{contact.name}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{contact.email}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{contact.company}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[contact.status]}>{contact.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{contact.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-text-secondary text-sm">No contacts found</div>
        )}
      </Card>

      {/* Contact Detail Sidebar */}
      {selectedContact && (
        <div className="fixed inset-y-0 right-0 w-96 bg-surface border-l border-border shadow-2xl z-40 animate-fade-in-up">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contact Details</h2>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-xl font-bold">
                  {selectedContact.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{selectedContact.name}</h3>
                <Badge variant={statusVariant[selectedContact.status]}>{selectedContact.status}</Badge>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-text-secondary" />
                <span className="text-text-secondary">{selectedContact.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-text-secondary" />
                <span className="text-text-secondary">{selectedContact.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 size={16} className="text-text-secondary" />
                <span className="text-text-secondary">{selectedContact.company}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-text-secondary" />
                <span className="text-text-secondary">Created {selectedContact.createdAt}</span>
              </div>
            </div>

            {selectedContact.notes && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Notes</h4>
                <p className="text-sm bg-surface-hover rounded-[var(--radius-input)] p-3">
                  {selectedContact.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
