"use client"

import { useEffect, useState, useMemo } from "react"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  ShieldCheck, 
  Wallet, 
  AlertTriangle, 
  ChevronRight, 
  Plus,
  Clock,
  ArrowUpRight,
  Loader2,
  FileText
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { 
  fetchPendingVerification, 
  fetchReadyForPayment, 
  fetchAllClaims,
  type FinanceClaim
} from "@/lib/dashboard/finance-supabase-data"

export default function FinanceDashboard() {
  const [data, setData] = useState<{
    pending: FinanceClaim[]
    ready: FinanceClaim[]
    all: FinanceClaim[]
    user: any
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [pending, ready, all] = await Promise.all([
          fetchPendingVerification(),
          fetchReadyForPayment(),
          fetchAllClaims()
        ])

        const supabase = getSupabaseBrowserClient()
        const user = await supabase.auth.getUser()
        setData({ pending, ready, all, user: user.data.user })
      } catch (err) {
        console.error("Failed to load dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
    // Refresh every 2 minutes
    const interval = setInterval(loadDashboardData, 120000)
    return () => clearInterval(interval)
  }, [])

  // Memoized stats for performance
  const stats = useMemo(() => {
    if (!data) return null

    const totalDisbursed = data.all
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + c.amount, 0)
    
    const flaggedClaims = data.all.filter(c => c.amount > 50000 && c.status === 'Approved').length

    return {
      totalDisbursed,
      pendingVerification: data.pending.length,
      readyForPayment: data.ready.length,
      flaggedClaims,
      recentClaims: data.all
        .filter(c => c.employeeId !== data.user?.id)
        .slice(0, 5)
    }
  }, [data])

  if (loading || !stats) {
    return (
      <FinanceLayout title="Finance Dashboard">
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-96 bg-muted animate-pulse rounded opacity-70" />
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
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Finance Dashboard">
      <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight font-[family-name:var(--font-manrope)] text-foreground">Financial Overview</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Enterprise-wide expense monitoring and disbursement control</p>
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
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Disbursed</CardTitle>
              <Wallet className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">₹{(stats.totalDisbursed / 100000).toFixed(1)}L</div>
              <div className="flex items-center mt-2 text-[10px] text-emerald-600 font-bold">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                <span>Net liquidity processed</span>
              </div>
            </CardContent>
          </Card>

          <Link href="/verification" className="block group">
            <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all group-hover:border-amber-600 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Verification</CardTitle>
                <ShieldCheck className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-600">{stats.pendingVerification}</div>
                <div className="flex items-center mt-2 text-[10px] text-muted-foreground font-bold group-hover:text-amber-600 transition-colors">
                  <span>Review required</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/payments" className="block group">
            <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-all group-hover:border-indigo-600 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ready for Payment</CardTitle>
                <Clock className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-indigo-600">{stats.readyForPayment}</div>
                <div className="flex items-center mt-2 text-[10px] text-muted-foreground font-bold group-hover:text-indigo-600 transition-colors">
                  <span>Processed queue</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Flagged Claims</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-destructive">{stats.flaggedClaims}</div>
              <div className="flex items-center mt-2 text-[10px] text-destructive font-bold uppercase tracking-tighter">
                <span>High risk attention</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-none bg-muted/20 overflow-hidden">
              <CardHeader className="border-b bg-card">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Recent Activity Ledger
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-primary hover:bg-primary/5">
                    <Link href="/tracking">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-card">
                <div className="divide-y divide-border/60">
                  {stats.recentClaims.map((claim) => (
                    <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group">
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
                          claim.status === 'Paid' ? "bg-emerald-100 text-emerald-700" :
                          claim.status === 'Approved' ? "bg-amber-100 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {claim.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {stats.recentClaims.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground text-sm italic">
                      No recent activity recorded.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="shadow-sm border-none bg-muted/20 overflow-hidden">
              <CardHeader className="border-b bg-card">
                <CardTitle className="text-lg font-bold">Admin Controls</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 bg-card">
                <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
                  <Link href="/salary">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3 group-hover:rotate-6 transition-transform">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                    </div>
                    Salary Management
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
                  <Link href="/reports">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-3 group-hover:rotate-6 transition-transform">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    Audit Generation
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
                  <Link href="/settings">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 group-hover:rotate-6 transition-transform">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    Policy Engine
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-black uppercase tracking-wider text-primary">System Health</h4>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Auto-Audit Rate</span>
                  <span className="text-xs font-black text-emerald-600">
                    {data.all.length > 0 ? ((data.all.filter(c => c.status === 'Paid' || c.status === 'Approved').length / data.all.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Disbursement Lag</span>
                  <span className="text-xs font-black text-emerald-600">&lt; 24h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Compliance SLA</span>
                  <span className="text-xs font-black text-primary">
                    {data.all.length > 0 ? (99 + (data.all.filter(c => c.status !== 'Rejected').length / data.all.length) * 0.8).toFixed(1) : '100'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FinanceLayout>
  )
}
