"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { 
  LayoutDashboard, 
  Receipt, 
  PlusCircle, 
  ScanText, 
  CheckSquare, 
  Users, 
  BarChart3, 
  Shield, 
  Settings, 
  LogOut,
  ChevronRight,
  Wallet,
  FileSpreadsheet
} from "lucide-react"
import { fetchPendingClaims } from "@/lib/dashboard/manager-supabase-data"

const handleLogout = async () => {
  const supabase = getSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/login'
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/claims", label: "My Claims", icon: Receipt },
  { href: "/create-claim", label: "Create Claim", icon: PlusCircle },
  { href: "/approvals", label: "Approvals", icon: CheckSquare, badge: true },
  { href: "/team", label: "My Team", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/policy", label: "Policy Engine", icon: Shield },
  { href: "/salary", label: "Salary Upload", icon: FileSpreadsheet },
]

const footerItems = [
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)
  
  // Fetch real pending count
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const claims = await fetchPendingClaims()
        setPendingCount(claims.length)
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
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-sidebar flex flex-col text-sidebar-foreground z-50">
      {/* Brand Header */}
      <Link href="/" className="px-4 py-6 hover:bg-white/5 transition-colors cursor-pointer block">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
            <Wallet className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">ExpensePro</h1>
            <p className="text-xs opacity-70 font-medium uppercase tracking-wider">Manager Portal</p>
          </div>
        </div>
      </Link>

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
              {item.badge && pendingCount > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                  {pendingCount}
                </span>
              )}
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
