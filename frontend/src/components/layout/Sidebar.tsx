import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, GitBranch, Settings, Bot } from 'lucide-react'
import { useFeatureStore } from '../../store/featureStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { features, highlightedFeatureId, openBuilder } = useFeatureStore()
  const readyFeatures = features.filter((f) => f.status === 'ready')

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

        {/* AI Features Section */}
        {readyFeatures.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                AI Features
              </span>
            </div>
            {readyFeatures.map((feature) => (
              <NavLink
                key={feature.id}
                to={`/feature/${feature.id}`}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active' : ''} ${
                    highlightedFeatureId === feature.id ? 'feature-highlight' : ''
                  }`
                }
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="truncate">{feature.name}</span>
              </NavLink>
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
    </aside>
  )
}
