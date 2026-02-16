import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { FeatureBuilderModal } from '../features/FeatureBuilderModal'

export function Layout() {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-60 p-6">
        <Outlet />
      </main>
      <FeatureBuilderModal />
    </div>
  )
}
