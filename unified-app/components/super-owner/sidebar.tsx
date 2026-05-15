"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Receipt, 
  ShieldCheck, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronRight,
  Wallet,
  AlertTriangle
} from "lucide-react"

const handleLogout = async () => {
  window.location.href = 'http://localhost:3000/login.html'
}

const navItems = [
  { href: "/super-owner", label: "Global Overview", icon: LayoutDashboard },
  { href: "/super-owner/managers", label: "Managers", icon: Building2, badge: true },
  { href: "/super-owner/escalations", label: "Escalations", icon: AlertTriangle, badge: true },
  { href: "/super-owner/all-claims", label: "All Claims", icon: Receipt },
  { href: "/super-owner/approvals", label: "Pending Approvals", icon: ShieldCheck, badge: true },
  { href: "/super-owner/reports", label: "Analytics", icon: BarChart3 },
]

const footerItems = [
  { href: "/super-owner/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  
  // Mock pending counts for Super Owner
  const escalationCount = 3
  const approvalCount = 5
  const managerCount = 8

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
            <p className="text-xs opacity-70 font-medium uppercase tracking-wider">Super Owner Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          let badgeCount = 0
          if (item.href === "/managers") badgeCount = managerCount
          if (item.href === "/escalations") badgeCount = escalationCount
          if (item.href === "/approvals") badgeCount = approvalCount
          
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
              {item.badge && badgeCount > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                  {badgeCount}
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
