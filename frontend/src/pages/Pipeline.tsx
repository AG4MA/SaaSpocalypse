import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { useCrmStore } from '../store/crmStore'
import type { Deal, DealStage } from '../types'

const stages: { id: DealStage; label: string; color: string }[] = [
  { id: 'Prospect', label: 'Prospect', color: '#94a3b8' },
  { id: 'Qualified', label: 'Qualified', color: '#6366f1' },
  { id: 'Proposal', label: 'Proposal', color: '#f59e0b' },
  { id: 'Negotiation', label: 'Negotiation', color: '#10b981' },
  { id: 'Closed Won', label: 'Closed Won', color: '#22c55e' },
  { id: 'Closed Lost', label: 'Closed Lost', color: '#ef4444' },
]

function DealCard({ deal, isDragging }: { deal: Deal; isDragging?: boolean }) {
  return (
    <div
      className={`bg-surface-hover rounded-[var(--radius-card)] p-3 space-y-2 ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      <p className="text-sm font-medium">{deal.name}</p>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{deal.contactName}</span>
        <span className="font-semibold text-text-primary">
          €{deal.value.toLocaleString()}
        </span>
      </div>
      <p className="text-xs text-text-secondary">{deal.date}</p>
    </div>
  )
}

function SortableDeal({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', deal },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} isDragging={isDragging} />
    </div>
  )
}

function StageColumn({ stage, deals }: { stage: (typeof stages)[0]; deals: Deal[] }) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold">{stage.label}</h3>
        <span className="text-xs text-text-secondary bg-surface-hover rounded-full px-2 py-0.5">
          {deals.length}
        </span>
      </div>
      <p className="text-xs text-text-secondary mb-3">€{totalValue.toLocaleString()}</p>
      <div ref={setNodeRef} className="space-y-2 min-h-[100px] rounded-lg p-1">
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDeal key={deal.id} deal={deal} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export function Pipeline() {
  const { deals, moveDeal } = useCrmStore()
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id)
    if (deal) setActiveDeal(deal)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return

    const dealId = active.id as string
    const overId = over.id as string

    // Check if dropped on a stage column
    const targetStage = stages.find((s) => s.id === overId)
    if (targetStage) {
      moveDeal(dealId, targetStage.id)
      return
    }

    // Check if dropped on another deal — move to that deal's stage
    const targetDeal = deals.find((d) => d.id === overId)
    if (targetDeal && targetDeal.id !== dealId) {
      moveDeal(dealId, targetDeal.stage)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pipeline</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={deals.filter((d) => d.stage === stage.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
