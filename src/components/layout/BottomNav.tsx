import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, Receipt, Calculator, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/planner', label: 'Planner', icon: Calculator },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
      <ul className="flex items-center justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
