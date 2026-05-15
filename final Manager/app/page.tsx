"use client"

import { useEffect, useState, useMemo } from "react"
import { ManagerLayout } from "@/components/manager/manager-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  BarChart3, 
  TrendingUp,
  Plus,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  Receipt,
  FileText,
  Shield,
  FileSpreadsheet
} from "lucide-react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { 
  fetchAllClaims, 
  buildDashboardStats,
  type ManagerClaim,
  type DashboardStats
} from "@/lib/dashboard/manager-supabase-data"

export default function ManagerDashboard() {
  const [data, setData] = useState<{
    claims: ManagerClaim[]
    stats: DashboardStats
    user: any
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const supabase = getSupabaseBrowserClient()
        const teamClaims = await fetchAllClaims()
        const user = await supabase.auth.getUser()
        const dashboardStats = buildDashboardStats(teamClaims, user.data.user?.id)
        
        setData({
          claims: teamClaims,
          stats: dashboardStats,
          user: user.data.user
        })
      } catch (err) {
        console.error("Failed to load manager dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Memoized derived data
  const dashboardData = useMemo(() => {
    if (!data) return null
    return {
      stats: data.stats,
      recentClaims: data.claims
        .filter(c => c.employee_id !== data.user?.id)
        .slice(0, 5)
    }
  }, [data])

  if (loading || !dashboardData) {
    return (
      <ManagerLayout title="Manager Dashboard">
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-72 bg-muted animate-pulse rounded opacity-70" />
            </div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-32 bg-muted/50 animate-pulse border-none shadow-none" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 h-96 bg-muted/50 animate-pulse border-none shadow-none" />
            <Card className="h-96 bg-muted/50 animate-pulse border-none shadow-none" />
          </div>
        </div>
      </ManagerLayout>
    )
  }

  const { stats, recentClaims } = dashboardData

  return (
    <ManagerLayout title="Manager Dashboard">
      <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight font-[family-name:var(--font-manrope)] text-foreground">Team Overview</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Manage team expenses, approvals, and budget compliance</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild className="shadow-lg bg-primary hover:bg-primary/90 font-bold transition-all hover:scale-105 active:scale-95">
              <Link href="/create-claim">
                <Plus className="w-4 h-4 mr-2" />
                New Claim
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Spend</CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">₹{stats.monthlySpend.toLocaleString('en-IN')}</div>
              <div className="flex items-center mt-2 text-[10px] text-emerald-600 font-bold">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                <span>On track for budget</span>
              </div>
            </CardContent>
          </Card>

          <Link href="/approvals" className="block group">
            <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all group-hover:border-amber-600 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Action</CardTitle>
                <CheckSquare className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-600">{stats.totalPending}</div>
                <div className="flex items-center mt-2 text-[10px] text-muted-foreground font-bold group-hover:text-amber-600 transition-colors">
                  <span>Approval queue</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Claim</CardTitle>
              <Receipt className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">₹{stats.averageClaimAmount.toLocaleString('en-IN')}</div>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">Per employee request</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Approval Rate</CardTitle>
              <BarChart3 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-600">{stats.approvalRate}%</div>
              <div className="flex items-center mt-2 text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">
                <span>Healthy compliance</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Team Activity */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-none bg-muted/20 overflow-hidden">
              <CardHeader className="border-b bg-card">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Recent Team Activity
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-primary hover:bg-primary/5">
                    <Link href="/team">Manage Team</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-card">
                <div className="divide-y divide-border/60">
                  {recentClaims.map((claim) => (
                    <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary group-hover:scale-105 transition-transform">
                          {claim.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{claim.employeeName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{claim.claimNumber} • {claim.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-foreground">₹{claim.amount.toLocaleString('en-IN')}</p>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-bold h-5 px-1.5 border-none",
                          claim.status === 'Approved' || claim.status === 'Paid' ? "bg-emerald-100 text-emerald-700" :
                          claim.status === 'Pending' || claim.status === 'Submitted' ? "bg-amber-100 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {claim.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {recentClaims.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground text-sm italic">
                      No team activity recorded yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manager Shortcuts */}
          <div className="space-y-6">
            <Card className="shadow-sm border-none bg-muted/20 overflow-hidden">
              <CardHeader className="border-b bg-card">
                <CardTitle className="text-lg font-bold">Quick Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 bg-card">
                <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
                  <Link href="/policy">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3 group-hover:rotate-6 transition-transform">
                      <Shield className="w-4 h-4 text-emerald-600" />
                    </div>
                    Policy Engine
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
                  <Link href="/salary">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-3 group-hover:rotate-6 transition-transform">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    </div>
                    Payroll Overview
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
                  <Link href="/reports">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 group-hover:rotate-6 transition-transform">
                      <BarChart3 className="w-4 h-4 text-primary" />
                    </div>
                    Departmental Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-black uppercase tracking-wider text-indigo-700">Audit Pulse</h4>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Compliance Score</span>
                  <span className={cn(
                    "text-xs font-black",
                    stats.approvalRate > 90 ? "text-emerald-600" : stats.approvalRate > 70 ? "text-amber-600" : "text-destructive"
                  )}>{stats.approvalRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Auto-Approvals</span>
                  <span className={cn(
                    "text-xs font-black",
                    stats.approvalRate > 85 ? "text-indigo-600" : "text-muted-foreground"
                  )}>{stats.approvalRate > 85 ? "Active" : "Standard"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ManagerLayout>
  )
}
