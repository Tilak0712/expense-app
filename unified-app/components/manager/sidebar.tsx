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
import { fetchPendingClaims } from "@/lib/manager/manager-supabase-data"

const handleLogout = async () => {
  const supabase = getSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = 'http://localhost:3000/login.html'
}

const navItems = [
  { href: "/manager/approvals", label: "Approvals", icon: LayoutDashboard, badge: true },
  { href: "/manager/claims", label: "My Claims", icon: Receipt },
  { href: "/manager/create-claim", label: "Create Claim", icon: PlusCircle },
  { href: "/manager/team", label: "My Team", icon: Users },
  { href: "/manager/reports", label: "Reports", icon: BarChart3 },
  { href: "/manager/policy", label: "Policy Engine", icon: Shield },
  { href: "/manager/salary", label: "Salary Upload", icon: FileSpreadsheet },
]

const footerItems = [
  { href: "/manager/settings", label: "Settings", icon: Settings },
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
    <aside className="fixed left-0 top-0 h-[100dvh] w-[240px] bg-[#354a5f] flex flex-col text-sidebar-foreground z-50 overflow-hidden">
      {/* Brand Header */}
      <div className="px-4 py-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
            <Wallet className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">ExpensePro</h1>
            <p className="text-xs opacity-70 font-medium uppercase tracking-wider">Manager Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto min-h-0">
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
      <div className="p-2 space-y-1 mt-auto shrink-0">
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
