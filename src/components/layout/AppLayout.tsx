import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, Receipt, PiggyBank, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import BottomNav from './BottomNav'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout() {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <span className="text-lg font-bold text-primary">£</span>
          <span className="text-lg font-bold text-foreground">BudgetFlow</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
