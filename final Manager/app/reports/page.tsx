"use client"

import { useEffect, useState } from "react"
import { ManagerLayout } from "@/components/manager/manager-layout"
import { 
  Download, 
  Wallet,
  Receipt,
  Calculator,
  AlertTriangle,
  TrendingUp,
  Eye,
  Loader2
} from "lucide-react"
import { 
  AuthRequiredError,
  fetchAllClaims,
  fetchTeamMembers,
  type ManagerClaim,
  type TeamMember
} from "@/lib/dashboard/manager-supabase-data"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Pie, PieChart } from "recharts"

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function buildMonthlyData(claims: ManagerClaim[]) {
  const data = months.map(month => ({ name: month, amount: 0 }))
  claims.forEach(claim => {
    const date = new Date(claim.date)
    const monthIndex = date.getMonth()
    if (monthIndex >= 0 && monthIndex < 12) {
      data[monthIndex].amount += claim.amount
    }
  })
  return data.filter(d => d.amount > 0).slice(-6)
}

export default function ReportsPage() {
  const [claims, setClaims] = useState<ManagerClaim[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setAuthRequired(false)

        const [claimsData, membersData] = await Promise.all([
          fetchAllClaims(),
          fetchTeamMembers()
        ])
        if (!active) return

        setClaims(claimsData)
        setTeamMembers(membersData)
      } catch (err) {
        if (!active) return

        if (err instanceof AuthRequiredError) {
          setAuthRequired(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load reports')
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

  const refreshData = async () => {
    try {
      setIsRefreshing(true)
      const [claimsData, membersData] = await Promise.all([
        fetchAllClaims(),
        fetchTeamMembers()
      ])
      setClaims(claimsData)
      setTeamMembers(membersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh reports')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Redirect to login if auth required
  useEffect(() => {
    if (authRequired && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authRequired])

  const handleExport = () => {
    alert('Exporting report...')
  }

  // Calculate category data from real claims
  const categoryCounts: Record<string, number> = {}
  claims.forEach(claim => {
    categoryCounts[claim.category] = (categoryCounts[claim.category] || 0) + 1
  })
  const totalClaims = claims.length || 1
  const categoryData = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    value: Math.round((count / totalClaims) * 100),
    color: name === 'Travel' ? 'var(--primary)' : 
           name === 'Fuel' ? 'var(--accent)' : 
           name === 'Meals' ? 'var(--muted-foreground)' : 'var(--chart-3)'
  }))

  // Compute real KPIs from claims
  const totalSpending = claims.reduce((sum, c) => sum + c.amount, 0)
  const gstRecoverable = Math.round(totalSpending * 0.18)
  const avgClaimValue = claims.length > 0 ? Math.round(totalSpending / claims.length) : 0
  const policyViolations = claims.filter(c => c.amount > 50000).length
  const monthlyData = buildMonthlyData(claims)

  return (
    <ManagerLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
              Team Expense Reports
            </h1>
            <p className="text-muted-foreground mt-1">{"Analytics and insights for your team's expenses"}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={refreshData}
              disabled={isRefreshing}
              className="px-4 py-2 bg-card text-foreground font-semibold text-sm rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 shadow-sm border border-border"
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isRefreshing ? 'Syncing...' : 'Sync'}
            </button>
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-card text-foreground font-semibold text-sm rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 shadow-sm border border-border"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-start mb-4">
              <Wallet className="w-6 h-6 text-primary" />
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 12%
              </span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Spending</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">₹{totalSpending.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-muted-foreground mt-1">All claims</p>
          </div>
          
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-start mb-4">
              <Receipt className="w-6 h-6 text-accent" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">FY 25</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GST Recoverable</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">₹{gstRecoverable.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-muted-foreground mt-1">Input tax credit</p>
          </div>
          
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-start mb-4">
              <Calculator className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Avg</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg. Claim Value</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">₹{avgClaimValue.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-muted-foreground mt-1">Per claim</p>
          </div>
          
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-start mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <span className="px-2 py-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded">ACTION</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Policy Violations</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">{policyViolations}</h3>
            <p className="text-xs text-muted-foreground mt-1">Claims over ₹50K</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-card p-6 rounded-xl shadow-sm border border-border">
            <h4 className="text-lg font-bold text-foreground mb-6 font-[family-name:var(--font-manrope)]">Monthly Spend Trend</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickFormatter={(value) => `₹${value/1000}K`}
                />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="var(--primary)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <h4 className="text-lg font-bold text-foreground mb-6 font-[family-name:var(--font-manrope)]">Category Distribution</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Share']}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {categoryData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }}></div>
                    <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading reports...</span>
          </div>
        )}

        {/* Error State */}
        {error && !authRequired && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 mb-6">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
        <>
        {/* Team Claims Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-lg font-[family-name:var(--font-manrope)]">Team Claims</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-right">Total Claims</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-center">Avg. Processing</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {teamMembers.slice(0, 5).map((member: TeamMember, idx: number) => (
                  <tr key={member.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? 'bg-primary/10 text-primary' : 
                          idx === 1 ? 'bg-accent/10 text-accent' : 
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {member.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-xs">{member.name}</p>
                          <p className="text-[9px] text-muted-foreground">{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold">{member.totalClaims}</td>
                    <td className="px-6 py-4 text-right font-bold">₹{member.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                        {member.totalClaims > 0 ? 'Active' : 'No claims'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 hover:bg-card rounded-lg text-primary transition-all shadow-sm">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </ManagerLayout>
  )
}
