"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Receipt,
  Clock,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Zap,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Loader2
} from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { initializeSessionFromUrl } from "@/lib/auth/session-manager"

export default function SuperOwnerDashboard() {
  const [data, setData] = useState<{
    claims: any[]
    profiles: any[]
    escalationsCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeSessionFromUrl()

    async function fetchDashboardData() {
      try {
        setLoading(true)
        const [claimsRes, profilesRes, escalationsRes] = await Promise.all([
          supabase.from('claims').select('status, amount, approval_tier, policy_flags, manager_id'),
          supabase.from('profiles').select('role'),
          supabase.from('claims').select('id').or('manager_id.is.null,policy_flags.cs.{"escalated":true}')
        ])

        setData({
          claims: claimsRes.data || [],
          profiles: profilesRes.data || [],
          escalationsCount: escalationsRes.data?.length || 0
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchDashboardData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Optimized derived stats
  const stats = useMemo(() => {
    if (!data) return null

    const pendingSuperOwner = data.claims.filter(c => 
      (c.approval_tier && c.approval_tier >= 2) && (c.status === 'Submitted' || c.status === 'Pending')
    )
    
    const approved = data.claims.filter(c => c.status === 'Approved')
    const rejected = data.claims.filter(c => c.status === 'Rejected')
    
    const totalAmount = approved.reduce((sum, c) => sum + Number(c.amount), 0)
    const pendingAmount = pendingSuperOwner.reduce((sum, c) => sum + Number(c.amount), 0)

    const managers = data.profiles.filter(p => p.role === 'manager').length
    const employees = data.profiles.filter(p => p.role === 'employee').length

    // Generate real-time actionable alerts
    const alerts = []
    
    // 1. Escalations (missing manager)
    const unassignedCount = data.claims.filter(c => !c.manager_id && (c.status === 'Submitted' || c.status === 'Pending')).length
    if (unassignedCount > 0) {
      alerts.push({
        type: 'escalation',
        title: 'Unassigned Claims',
        desc: `${unassignedCount} claims need manager routing`,
        time: 'Live',
        priority: 'high'
      })
    }

    // 2. High Value Alerts
    const highValueClaims = data.claims.filter(c => Number(c.amount) > 50000 && (c.status === 'Submitted' || c.status === 'Pending'))
    if (highValueClaims.length > 0) {
      alerts.push({
        type: 'high_value',
        title: 'High Value Threshold',
        desc: `Review ${highValueClaims.length} claims over ₹50,000`,
        time: 'Immediate',
        priority: 'high'
      })
    }

    // 3. System Health
    alerts.push({
      type: 'approval',
      title: 'Compliance Pulse',
      desc: `Global approval rate at ${((approved.length / (data.claims.length || 1)) * 100).toFixed(0)}%`,
      time: 'Real-time',
      priority: 'medium'
    })

    // Fill with placeholders if empty to maintain UI structure
    if (alerts.length < 4) {
      alerts.push({
        type: 'escalation',
        title: 'System Audit',
        desc: 'Global expense policies are active',
        time: 'Stable',
        priority: 'medium'
      })
    }

    return {
      totalClaims: data.claims.length,
      pendingApprovals: pendingSuperOwner.length,
      approvedClaims: approved.length,
      rejectedClaims: rejected.length,
      totalAmount,
      pendingAmount,
      managers,
      employees,
      escalations: data.escalationsCount,
      approvalRate: data.claims.length > 0 ? (approved.length / data.claims.length) * 100 : 0,
      alerts: alerts.slice(0, 4)
    }
  }, [data])

  if (loading || !stats) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded opacity-70" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32 bg-muted/50 animate-pulse border-none" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="h-64 bg-muted/50 animate-pulse border-none" />
          <Card className="h-64 bg-muted/50 animate-pulse border-none" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-[family-name:var(--font-manrope)] text-foreground">Global Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Complete oversight across all departments and hierarchies</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          Super Owner Access
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Volume</CardTitle>
            <Receipt className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{stats.totalClaims.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium tracking-wide">Total requests processed</p>
          </CardContent>
        </Card>

        <Link href="/super-owner/approvals" className="block group">
          <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all group-hover:border-amber-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Critical Approvals</CardTitle>
              <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-amber-600">{stats.pendingApprovals}</div>
              <div className="flex items-center mt-2 text-[10px] text-muted-foreground font-bold group-hover:text-amber-600 transition-colors">
                <span>Direct intervention needed</span>
                <ChevronRight className="w-3 h-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Payout</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">₹{(stats.totalAmount / 100000).toFixed(1)}L</div>
            <div className="flex items-center mt-2 text-[10px] text-emerald-600 font-bold">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              <span>Net approved liquidity</span>
            </div>
          </CardContent>
        </Card>

        <Link href="/super-owner/escalations" className="block group">
          <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-all group-hover:border-destructive/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escalations</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-destructive">{stats.escalations}</div>
              <div className="flex items-center mt-2 text-[10px] text-destructive font-bold group-hover:underline">
                <span>Anomalies detected</span>
                <ChevronRight className="w-3 h-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Org Overview */}
        <Card className="border-none shadow-sm bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Human Capital
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-black">{stats.managers}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Managers</p>
            </div>
            <div className="p-4 bg-card rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-black">{stats.employees}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Employees</p>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border-none shadow-sm bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Compliance Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Approved Requests</span>
              </div>
              <span className="font-black text-emerald-600">{stats.approvedClaims}</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium">Under Review</span>
              </div>
              <span className="font-black text-amber-600">{stats.pendingApprovals}</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-sm font-medium">Rejected</span>
              </div>
              <span className="font-black text-destructive">{stats.rejectedClaims}</span>
            </div>
            <div className="pt-4 border-t flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">Efficiency Score</span>
              <span className="text-lg font-black text-emerald-500">{stats.approvalRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Alerts */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-card to-muted/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5 fill-primary/20" />
            Priority Action Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.alerts.map((action: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border bg-card/50 hover:bg-card transition-all cursor-pointer group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:rotate-6 transition-transform",
                  action.type === 'escalation' && "bg-destructive/10 text-destructive",
                  action.type === 'approval' && "bg-amber-100 text-amber-600",
                  action.type === 'high_value' && "bg-purple-100 text-purple-600"
                )}>
                  {action.type === 'escalation' && <AlertTriangle className="w-5 h-5" />}
                  {action.type === 'approval' && <ShieldCheck className="w-5 h-5" />}
                  {action.type === 'high_value' && <DollarSign className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-foreground">{action.title}</p>
                    <span className={cn(
                      "px-2 py-0.5 text-[8px] font-black uppercase rounded-full tracking-widest",
                      action.priority === 'high' ? "bg-destructive text-white" : "bg-amber-500 text-white"
                    )}>
                      {action.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 font-medium">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
