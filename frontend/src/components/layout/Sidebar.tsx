import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, GitBranch, Settings, Bot, X } from 'lucide-react'
import { useFeatureStore } from '../../store/featureStore'
import { deleteFeature } from '../../services/api'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SidebarGenerationProgress } from './SidebarGenerationProgress'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { features, highlightedFeatureSlug, openBuilder, removeFeature, generationJobs } = useFeatureStore()
  const [deleteConfirm, setDeleteConfirm] = useState<{ slug: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleDeleteClick = (e: React.MouseEvent, slug: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteConfirm({ slug, name })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    
    setIsDeleting(true)
    try {
      await deleteFeature(deleteConfirm.slug)
      removeFeature(deleteConfirm.slug)
      
      // If we're on the deleted feature's page, navigate to dashboard
      if (location.pathname === `/feature/${deleteConfirm.slug}`) {
        navigate('/')
      }
    } catch (err) {
      console.error('Failed to delete feature:', err)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  return (
    <aside className="w-60 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-lg text-text-primary">MorphCRM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* AI Features Section — driven by manifest data from the gateway */}
        {(features.length > 0 || generationJobs.length > 0) && (
          <>
            <div className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                AI Features
              </span>
            </div>
            
            {/* Generation jobs in progress (inline) */}
            <SidebarGenerationProgress />
            
            {features.map((feature) => (
              <div key={feature.slug} className="group relative">
                <NavLink
                  to={feature.route}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? 'active' : ''} ${
                      highlightedFeatureSlug === feature.slug ? 'feature-highlight' : ''
                    } pr-8`
                  }
                >
                  <span className="text-lg">{feature.icon}</span>
                  <span className="truncate">{feature.name}</span>
                </NavLink>
                <button
                  onClick={(e) => handleDeleteClick(e, feature.slug, feature.name)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-all"
                  title="Delete feature"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </>
        )}
      </nav>

      {/* Build Feature Button */}
      <div className="p-3 border-t border-border">
        <button
          onClick={openBuilder}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-[var(--radius-button)] font-medium text-sm transition-colors"
        >
          <Bot size={18} />
          <span>Build Feature</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirm !== null} 
        onClose={() => setDeleteConfirm(null)}
        title="Conferma eliminazione"
        className="max-w-sm"
      >
        <div className="p-6">
          <p className="text-text-secondary mb-6">
            Sei sicuro di voler eliminare <span className="text-text-primary font-medium">"{deleteConfirm?.name}"</span>?
            <br />
            <span className="text-sm text-red-400">Questa azione non può essere annullata.</span>
          </p>
          <div className="flex gap-3 justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Eliminando...' : 'Elimina'}
            </Button>
          </div>
        </div>
      </Modal>
    </aside>
  )
}
