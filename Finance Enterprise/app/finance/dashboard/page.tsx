'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  FileText,
  BarChart3,
  TrendingUp,
  ArrowRight,
  DollarSign,
  CreditCard
} from 'lucide-react'
import {
  fetchClaims,
  fetchCurrentProfile,
  buildDashboardStats,
  type DashboardClaim,
  type DbProfile,
} from '@/lib/dashboard/supabase-data'
import { cn } from '@/lib/utils'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatCurrency(amount: number, currency: string = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    Submitted: 'bg-amber-100 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Paid: 'bg-blue-100 text-blue-700 border-blue-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function FinanceDashboard() {
  const [claims, setClaims] = useState<DashboardClaim[]>([])
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [claimsData, profileData] = await Promise.all([
          fetchClaims(),
          fetchCurrentProfile(),
        ])
        setClaims(claimsData)
        setProfile(profileData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const stats = buildDashboardStats(claims)
  const firstName = profile?.full_name?.split(' ')[0] || 'User'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const kpiCards = [
    {
      label: 'Total Submitted',
      value: stats.totalSubmitted,
      count: stats.totalCount,
      icon: Wallet,
      trend: '+12% this month',
      trendColor: 'text-emerald-600 bg-emerald-50',
      iconColor: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Approved',
      value: stats.approved,
      count: stats.approvedCount,
      icon: CheckCircle,
      trend: '95% success',
      trendColor: 'text-emerald-600 bg-emerald-50',
      iconColor: 'bg-emerald-50 text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Pending',
      value: stats.pending,
      count: stats.pendingCount,
      icon: Clock,
      trend: 'In progress',
      trendColor: 'text-amber-600 bg-amber-50',
      iconColor: 'bg-amber-50 text-amber-600',
      valueColor: 'text-amber-600',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      count: stats.rejectedCount,
      icon: XCircle,
      trend: 'Last: 2 weeks ago',
      trendColor: 'text-muted-foreground bg-muted',
      iconColor: 'bg-red-50 text-red-600',
      valueColor: 'text-red-600',
    },
  ]

  return (
    <div className="p-8">
      {/* Greeting Header */}
      <section className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-manrope tracking-tight text-foreground mb-2">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {"Here's the current financial overview for ExpensePro."}
            </p>
          </div>
          <Button variant="default" className="shadow-lg">
            <Link href="/finance/reports" className="flex items-center">
              <PlusCircleIcon className="w-4 h-4 mr-2" />
              New Report
            </Link>
          </Button>
        </div>
      </section>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="tile-shadow hover:shadow-md transition-shadow border-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('p-2 rounded-lg', kpi.iconColor)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full',
                      kpi.trendColor
                    )}
                  >
                    {kpi.trend}
                  </span>
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{kpi.label}</p>
                <div
                  className={cn(
                    'text-2xl font-bold font-manrope',
                    kpi.valueColor || 'text-foreground'
                  )}
                >
                  {formatCurrency(kpi.value)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-semibold">{kpi.count}</span> claims
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Claims Table */}
        <div className="lg:col-span-2">
          <Card className="tile-shadow border-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold font-manrope">
                Recent Claims
              </CardTitle>
              <Link
                href="/finance/verification"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Claim ID</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-border">
                    {claims.slice(0, 5).map((claim) => (
                      <tr
                        key={claim.id}
                        className="sap-table-row transition-colors cursor-pointer"
                        onClick={() => (window.location.href = `/finance/verification?id=${claim.id}`)}
                      >
                        <td className="px-5 py-4 text-muted-foreground">
                          {formatDate(claim.expenseDate)}
                        </td>
                        <td className="px-5 py-4 font-semibold">{claim.claimNumber}</td>
                        <td className="px-5 py-4 text-muted-foreground">{claim.category}</td>
                        <td className="px-5 py-4 text-right font-semibold">
                          {formatCurrency(claim.amount, claim.currency)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-semibold border',
                              getStatusColor(claim.status)
                            )}
                          >
                            {claim.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Overview */}
        <div className="space-y-6">
          <Card className="tile-shadow border-none">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-manrope">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Expenses</span>
                <span className="text-lg font-bold">
                  {formatCurrency(stats.monthlyTotal)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Approved</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">
                    {formatCurrency(stats.monthlyApproved)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-600">
                    {formatCurrency(stats.monthlyTotal - stats.monthlyApproved)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spending Trend */}
          <Card className="tile-shadow border-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold font-manrope">
                Spending Trend
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {[65, 72, 58, 85, 92, 78, 82, 88].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/20 rounded-t-sm relative"
                      style={{ height: `${height}%` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm"
                        style={{ height: `${Math.min(100, height + 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((month) => (
                  <span key={month} className="text-[10px] font-medium text-muted-foreground">
                    {month}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}
