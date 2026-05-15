"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
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
  await supabase.auth.signOut()
  window.location.href = '/login'
}

const navItems = [
  { href: "/super-owner", label: "Global Dashboard", icon: LayoutDashboard },
  { href: "/super-owner/managers", label: "Managers", icon: Building2 },
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
  
  const [badgeCounts, setBadgeCounts] = useState({
    escalation: 0,
    approvals: 0,
    managers: 0,
  })

  useEffect(() => {
    async function fetchCounts() {
      try {
        // 1. Fetch profiles to identify manager/finance roles and on-leave status
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, role, on_leave')

        const profileByIdMap = new Map((profiles || []).map(p => [p.id, p]))
        const profileByUserIdMap = new Map((profiles || []).map(p => p.user_id ? [p.user_id, p] : [p.id, p]))
        
        const managerFinanceIds = (profiles || [])
          .filter(p => p.role === 'manager' || p.role === 'finance')
          .map(p => p.id)

        const onLeaveManagerIds = (profiles || [])
          .filter(p => p.on_leave === true)
          .map(p => p.id)

        const managerCount = (profiles || []).filter(p => p.role === 'manager').length

        // 2. Pending Approvals: Manager/Finance self-submitted claims
        const { count: approvalCount } = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .gte('approval_tier', 2)
          .in('status', ['Submitted', 'Pending'])

        // 3. Escalations: Manager is on leave (excluding those that are already in approvals)
        let escalationCount = 0
        if (onLeaveManagerIds.length > 0) {
          const { data: escalated } = await supabase
            .from('claims')
            .select('id, employee_id')
            .in('manager_id', onLeaveManagerIds)
            .not('approved_by', 'eq', 'manager')
            .in('status', ['Submitted', 'Pending'])
          
          if (escalated) {
            // Only count if the employee isn't a manager/finance (to avoid double counting with approvals)
            escalationCount = escalated.filter(c => {
              const prof = profileByUserIdMap.get(c.employee_id) || profileByIdMap.get(c.employee_id)
              return prof?.role !== 'manager' && prof?.role !== 'finance'
            }).length
          }
        }

        setBadgeCounts({
          escalation: escalationCount,
          approvals: approvalCount || 0,
          managers: managerCount,
        })
      } catch (err) {
        console.error('Failed to fetch sidebar counts:', err)
      }
    }

    fetchCounts()

    // Realtime subscription to claims table
    const channel = supabase
      .channel('claims_count_updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'claims'
        },
        () => {
          console.log('Claims changed, updating sidebar counts...')
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-sidebar flex flex-col text-sidebar-foreground z-50">
      {/* Brand Header */}
      <Link href="/super-owner" className="px-4 py-6 hover:bg-white/5 transition-colors cursor-pointer block">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
            <Wallet className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">ExpensePro</h1>
            <p className="text-xs opacity-70 font-medium uppercase tracking-wider">Super Owner Portal</p>
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          let badgeCount = 0
          if (item.href === "/super-owner/managers") badgeCount = badgeCounts.managers
          if (item.href === "/super-owner/escalations") badgeCount = badgeCounts.escalation
          if (item.href === "/super-owner/approvals") badgeCount = badgeCounts.approvals
          
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
