'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  CreditCard, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  Wallet
} from "lucide-react"

const handleLogout = async () => {
  const supabase = getSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/login.html'
}

const navItems = [
  { href: "/finance/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finance/verification", label: "Verification", icon: ClipboardCheck },
  { href: "/finance/payments", label: "Payments", icon: CreditCard },
  { href: "/finance/salary", label: "Salary", icon: DollarSign },
  { href: "/finance/tracking", label: "Tracking", icon: FileText },
  { href: "/finance/reports", label: "Reports", icon: BarChart3 },
]

const footerItems = [
  { href: "/finance/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)
  
  // Fetch real pending count for verification
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { count } = await supabase
          .from('finance_claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_verification')
        setPendingCount(count || 0)
      } catch {
        setPendingCount(0)
      }
    }
    loadPendingCount()
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="h-screen w-[240px] fixed left-0 top-0 bg-sidebar flex flex-col text-sidebar-foreground z-50">
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
      <nav className="flex-1 px-2 space-y-1">
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
              {item.href === '/finance/verification' && pendingCount > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                  {pendingCount}
                </span>
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
