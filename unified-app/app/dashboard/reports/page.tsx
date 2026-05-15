'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Landmark,
  Receipt,
  Calculator,
  AlertTriangle,
  TrendingUp,
  Download,
  ChevronRight,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import {
  fetchClaims,
  buildDashboardStats,
  buildMonthlySpendData,
  buildCategoryDistribution,
  type DashboardClaim,
  AuthRequiredError,
} from '@/lib/employee/supabase-data'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'

const dateRanges = ['This Month', 'Last Quarter', 'FY', 'Custom']
const statusFilters = ['Paid', 'Verified', 'Pending']

const categoryColors = ['#0070f2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

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

export default function ReportsPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<DashboardClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRange, setSelectedRange] = useState('This Month')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchClaims()
        setClaims(data)
      } catch (error) {
        if (error instanceof AuthRequiredError) {
          router.push('/login')
        } else {
          console.error('Failed to load claims:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const refreshData = async () => {
    try {
      setIsRefreshing(true)
      const data = await fetchClaims()
      setClaims(data)
    } catch (error) {
      console.error('Failed to refresh claims:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const filteredClaims = selectedStatuses.length > 0
    ? claims.filter(claim => {
        if (selectedStatuses.includes('Paid')) return claim.status === 'Paid'
        if (selectedStatuses.includes('Verified')) return claim.status === 'Approved'
        if (selectedStatuses.includes('Pending')) return claim.status === 'Pending' || claim.status === 'Submitted'
        return true
      })
    : claims

  const stats = buildDashboardStats(filteredClaims)
  const monthlyData = buildMonthlySpendData(filteredClaims)
  const categoryData = buildCategoryDistribution(filteredClaims)

  const kpiCards = [
    {
      label: 'Total Spending',
      value: stats.totalSubmitted,
      trend: '+12%',
      description: 'Monthly disbursement volume',
      icon: Landmark,
      color: 'border-l-primary',
      iconBg: 'bg-primary/10 text-primary',
      trendColor: 'text-emerald-600',
    },
    {
      label: 'Avg. Claim Value',
      value: claims.length > 0 ? Math.round(stats.totalSubmitted / claims.length) : 0,
      trend: 'Current',
      description: 'Mean per-request cost',
      icon: Calculator,
      color: 'border-l-slate-500',
      iconBg: 'bg-slate-100 text-slate-600',
      trendColor: 'text-muted-foreground',
    },
    {
      label: 'Pending Claims',
      value: stats.pendingCount,
      isText: true,
      description: 'Awaiting approval',
      icon: Clock,
      color: 'border-l-amber-500',
      iconBg: 'bg-amber-100 text-amber-600',
      trendColor: 'text-muted-foreground',
    },
    {
      label: 'Approved Claims',
      value: stats.approvedCount,
      isText: true,
      description: 'Successfully processed',
      icon: CheckCircle,
      color: 'border-l-emerald-500',
      iconBg: 'bg-emerald-100 text-emerald-600',
      trendColor: 'text-muted-foreground',
    },
  ]

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Reports" searchPlaceholder="Search reports...">
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const chartData = monthlyData.map((d, i) => ({
    month: d.month,
    current: d.amount,
    previous: d.amount * 0.8,
  }))

  const pieData = categoryData.map((d, i) => ({
    name: d.category,
    value: Math.round(d.percentage),
    color: categoryColors[i % categoryColors.length],
  }))

  return (
    <DashboardLayout title="Reports" searchPlaceholder="Search reports...">
      <div className="p-8 space-y-8">
        {/* Page Title & Actions */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-manrope)]">
              Intelligence Hub
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Audit-ready financial oversight and reporting ledger.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2 shadow-sm"
              onClick={refreshData}
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isRefreshing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button variant="outline" className="gap-2 shadow-sm">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-2">
          <CardContent className="p-0 flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-2 pl-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Date Range:
              </span>
              <div className="flex bg-muted p-1 rounded-lg">
                {dateRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-bold rounded transition-colors',
                      selectedRange === range
                        ? 'bg-card shadow-sm text-primary'
                        : 'text-muted-foreground hover:text-primary'
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-8 w-px bg-border" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Status:
              </span>
              <div className="flex gap-2">
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase transition-colors',
                      selectedStatuses.includes(status)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card
                key={kpi.label}
                className={cn('border-l-4 hover:shadow-md transition-shadow', kpi.color)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className={cn('p-2 rounded-lg', kpi.iconBg)}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold flex items-center gap-1',
                        kpi.trendColor
                      )}
                    >
                      {kpi.trend?.startsWith('+') && <TrendingUp className="w-3 h-3" />}
                      {kpi.trend}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {kpi.label}
                  </p>
                  <h3 className="text-2xl font-black mt-1 text-foreground">
                    {kpi.isText ? kpi.value : formatCurrency(kpi.value as number)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                    {kpi.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Spend Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold font-[family-name:var(--font-manrope)]">
                    Monthly Spend Trend
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Annual fluctuation tracking</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Current FY
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-muted" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Previous FY
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} barGap={4}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="previous" fill="var(--muted)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="current" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold font-[family-name:var(--font-manrope)]">
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mb-4">
                <span className="text-3xl font-black text-foreground">{pieData.length}</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter block">
                  Categories
                </span>
              </div>
              <div className="space-y-2">
                {pieData.map((cat) => (
                  <div key={cat.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">{cat.name}</span>
                    </div>
                    <span className="text-[10px] font-bold">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Ledger Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold font-[family-name:var(--font-manrope)]">
              Audit Ledger
            </CardTitle>
            <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {filteredClaims.length} Records
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-y border-border">
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/dashboard/claims/${claim.id}`)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-primary text-sm">
                          {claim.claimNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {formatDate(claim.expenseDate)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm">{claim.vendorName}</p>
                          <p className="text-xs text-muted-foreground">{claim.category}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-sm">
                          {formatCurrency(claim.amount, claim.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1',
                            getStatusColor(claim.status)
                          )}
                        >
                          {(claim.status === 'Approved' || claim.status === 'Paid') && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {(claim.status === 'Pending' || claim.status === 'Submitted') && (
                            <Clock className="w-3 h-3" />
                          )}
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
