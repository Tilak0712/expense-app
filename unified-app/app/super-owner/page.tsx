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
  XCircle
} from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function SuperOwnerDashboard() {
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingApprovals: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
    managers: 0,
    employees: 0,
    escalations: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch claims statistics - all claims
        const { data: claimsData } = await supabase
          .from('claims')
          .select('status, amount, approval_tier, policy_flags, manager_id')

        if (claimsData) {
          const totalClaims = claimsData.length
          
          // Claims pending Super Owner attention (approval_tier >= 2)
          const pendingSuperOwner = claimsData.filter(c => 
            c.approval_tier && c.approval_tier >= 2
          ).length
          
          const approvedClaims = claimsData.filter(c => c.status === 'Approved').length
          const rejectedClaims = claimsData.filter(c => c.status === 'Rejected').length
          const totalAmount = claimsData
            .filter(c => c.status === 'Approved')
            .reduce((sum, c) => sum + Number(c.amount), 0)
          
          const pendingAmount = claimsData
            .filter(c => c.approval_tier && c.approval_tier >= 2)
            .reduce((sum, c) => sum + Number(c.amount), 0)

          setStats(prev => ({
            ...prev,
            totalClaims,
            pendingApprovals: pendingSuperOwner,
            approvedClaims,
            rejectedClaims,
            totalAmount,
            pendingAmount,
            paidAmount: totalAmount
          }))
        }

        // Fetch profiles statistics
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('role')

        if (profilesData) {
          const managers = profilesData.filter(p => p.role === 'manager').length
          const employees = profilesData.filter(p => p.role === 'employee').length

          setStats(prev => ({
            ...prev,
            managers,
            employees
          }))
        }

        // Fetch escalations (claims without manager or with special flags)
        const { data: escalationData } = await supabase
          .from('claims')
          .select('id')
          .or('manager_id.is.null,policy_flags.cs.{\"escalated\":true}')

        if (escalationData) {
          setStats(prev => ({
            ...prev,
            escalations: escalationData.length
          }))
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Pending actions (critical for Super Owner)
  const pendingActions = [
    { type: 'escalation', title: 'Manager on Leave', desc: '3 claims auto-routed from Mike Wilson', time: '2h ago', priority: 'high' },
    { type: 'approval', title: 'Self-Approval Alert', desc: 'Finance manager approved own claim #FIN-892', time: '5h ago', priority: 'high' },
    { type: 'high_value', title: 'High Value Claim', desc: 'Claim EXP-2024-552 for ₹89,000 pending', time: '1d ago', priority: 'medium' },
    { type: 'escalation', title: 'Unassigned Team', desc: '2 claims from Engineering team need routing', time: '1d ago', priority: 'medium' },
  ]

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
          Global Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete visibility across all claims, managers, and employees
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claims</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClaims.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.totalAmount / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground mt-1">Current FY</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escalations</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.escalations}</div>
            <p className="text-xs text-muted-foreground mt-1">Auto-routed</p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Managers</p>
                    <p className="text-xs text-muted-foreground">Active approvers</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{stats.managers}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Employees</p>
                    <p className="text-xs text-muted-foreground">Across all teams</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{stats.employees}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Claims Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm">Approved</span>
                </div>
                <span className="font-semibold text-emerald-500">{stats.approvedClaims}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="font-semibold text-amber-500">{stats.pendingApprovals}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm">Rejected</span>
                </div>
                <span className="font-semibold text-destructive">{stats.rejectedClaims}</span>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Approval Rate</span>
                  <span className="font-bold text-emerald-500">
                    {((stats.approvedClaims / stats.totalClaims) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions - CRITICAL for Super Owner */}
      <Card className="border-l-4 border-l-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Zap className="w-5 h-5" />
            Pending Actions ({pendingActions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingActions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  action.type === 'escalation' && "bg-destructive/10 text-destructive",
                  action.type === 'approval' && "bg-amber-100 text-amber-600",
                  action.type === 'high_value' && "bg-purple-100 text-purple-600"
                )}>
                  {action.type === 'escalation' && <AlertTriangle className="w-4 h-4" />}
                  {action.type === 'approval' && <ShieldCheck className="w-4 h-4" />}
                  {action.type === 'high_value' && <DollarSign className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{action.title}</p>
                    <span className={cn(
                      "px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full",
                      action.priority === 'high' ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"
                    )}>
                      {action.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{action.time}</p>
                </div>
                <Link
                  href={action.type === 'escalation' ? '/super-owner/escalations' : action.type === 'approval' ? '/super-owner/approvals' : '/super-owner/all-claims'}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
          <Link href="/super-owner/escalations" className="mt-4 block text-center text-xs font-medium text-primary hover:underline">
            View all pending actions →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
