'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Receipt, 
  PlusCircle, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronRight,
  Wallet,
  DollarSign
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const handleLogout = async () => {
  const supabase = getSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/login'
}

const navItems = [
  { href: '/finance/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/finance/verification', label: 'Verification', icon: Receipt },
  { href: '/finance/payments', label: 'Payments', icon: Wallet },
  { href: '/finance/salary', label: 'Salary', icon: DollarSign },
  { href: '/finance/reports', label: 'Reports', icon: BarChart3 },
]

const footerItems = [
  { href: '/finance/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-sidebar flex flex-col text-sidebar-foreground z-50">
      {/* Brand Header */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
            <Wallet className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">ExpensePro</h1>
            <p className="text-xs opacity-70 font-medium uppercase tracking-wider">Finance Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm",
                isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-sidebar-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-white" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-2 space-y-1">
        {footerItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm",
                isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-sidebar-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-white" />
              )}
            </Link>
          )
        })}
        
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm text-sidebar-foreground hover:text-white hover:bg-white/5 w-full">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
