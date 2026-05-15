"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ManagerLayout } from "@/components/manager/manager-layout"
import { 
  Users, 
  Receipt, 
  Clock,
  Wallet,
  Loader2
} from "lucide-react"
import { AuthRequiredError, fetchAllClaims } from "@/lib/manager/manager-supabase-data"
import { fetchManagerTeam, type TeamMember } from "@/lib/manager/team-management-v2"

interface TeamMemberWithStats extends TeamMember {
  totalClaims: number
  pendingClaims: number
  totalAmount: number
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setAuthRequired(false)

        const members = await fetchManagerTeam()
        if (!active) return

        // Try to fetch claims, but don't fail if it errors
        let claims: any[] = []
        try {
          claims = await fetchAllClaims()
        } catch (claimError) {
          console.warn('Failed to load claims, continuing without claim stats:', claimError)
        }

        // Enrich members with claim stats
        const enrichedMembers = members.map(m => {
          // Match claims by employeeUserId (UUID) or employeeId (VARCHAR)
          const memberClaims = claims.filter(c => 
            c.employeeId === m.employeeUserId || 
            c.employeeId === m.employeeId
          )
          return {
            ...m,
            totalClaims: memberClaims.length,
            pendingClaims: memberClaims.filter(c => c.status === 'Pending' || c.status === 'Submitted').length,
            totalAmount: memberClaims.reduce((sum, c) => sum + c.amount, 0)
          }
        })

        setTeamMembers(enrichedMembers)
      } catch (err) {
        if (!active) return

        if (err instanceof AuthRequiredError) {
          setAuthRequired(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load team data')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  // Redirect to login if auth required
  useEffect(() => {
    if (authRequired && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authRequired])

  const stats = {
    size: teamMembers.length,
    activeClaims: teamMembers.reduce((sum, m) => sum + m.totalClaims, 0),
    pendingApprovals: teamMembers.reduce((sum, m) => sum + m.pendingClaims, 0),
    totalSpending: teamMembers.reduce((sum, m) => sum + m.totalAmount, 0)
  }

  return (
    <ManagerLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
              Team Members
            </h1>
            <p className="text-muted-foreground mt-1">View and manage your team expense activity</p>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Team Size</p>
            <p className="text-2xl font-black mt-1 text-foreground">{stats.size}</p>
          </div>
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Claims</p>
            <p className="text-2xl font-black mt-1 text-foreground">{stats.activeClaims}</p>
          </div>
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-black mt-1 text-accent">{stats.pendingApprovals}</p>
          </div>
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Spending (MTD)</p>
            <p className="text-2xl font-black mt-1 text-foreground">₹{(stats.totalSpending / 1000).toFixed(0)}K</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading team...</span>
          </div>
        )}

        {/* Error State */}
        {error && !authRequired && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 mb-6">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Team Grid */}
        {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div 
              key={member.id}
              className="bg-card rounded-xl shadow-sm border border-border p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  {member.employeeName ? member.employeeName.split(' ').map(n => n[0]).join('').toUpperCase() : '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">
                    {member.employeeName && member.employeeName.includes('(') 
                      ? member.employeeName.split('(')[0].trim() 
                      : member.employeeName || 'Unknown'}
                  </h3>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{member.employeeId}</p>
                  <p className="text-sm text-muted-foreground">{member.employeeEmail}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{member.totalClaims}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                    <Receipt className="w-3 h-3" /> Claims
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-accent">{member.pendingClaims}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> Pending
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">₹{(member.totalAmount / 1000).toFixed(0)}K</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                    <Wallet className="w-3 h-3" /> Total
                  </p>
                </div>
              </div>
              
              {member.pendingClaims > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-accent font-medium">
                      {member.pendingClaims} pending approval
                    </span>
                    <Link 
                      href="/manager/approvals"
                      className="px-3 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-lg hover:scale-105 transition-transform"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </div>
    </ManagerLayout>
  )
}
