"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, DollarSign, Users, Receipt, Calendar, Loader2 } from "lucide-react"

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalClaims: 0,
    totalAmount: 0,
    avgClaimValue: 0,
    activeEmployees: 0,
    approvedRate: 0
  })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true)
        
        // 1. Fetch claims for stats and trends
        const { data: claims, error: claimsError } = await supabase
          .from('claims')
          .select('status, amount, category, created_at')
        
        if (claimsError) throw claimsError

        // 2. Fetch employee count
        const { count: empCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'employee')

        if (claims) {
          const total = claims.length
          const approved = claims.filter(c => c.status === 'Approved')
          const totalAmount = approved.reduce((sum, c) => sum + Number(c.amount), 0)
          const avgValue = total > 0 ? totalAmount / approved.length : 0
          const rate = total > 0 ? (approved.length / total) * 100 : 0

          setStats({
            totalClaims: total,
            totalAmount: totalAmount,
            avgClaimValue: Math.round(avgValue),
            activeEmployees: empCount || 0,
            approvedRate: Math.round(rate)
          })

          // Calculate Monthly Data (Last 6 months)
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const monthlyMap = new Map()
          
          // Initialize last 6 months
          for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const monthName = months[d.getMonth()]
            monthlyMap.set(monthName, { month: monthName, claims: 0, amount: 0 })
          }

          claims.forEach(c => {
            const date = new Date(c.created_at)
            const monthName = months[date.getMonth()]
            if (monthlyMap.has(monthName)) {
              const data = monthlyMap.get(monthName)
              data.claims++
              if (c.status === 'Approved') data.amount += Number(c.amount)
            }
          })
          setMonthlyData(Array.from(monthlyMap.values()))

          // Calculate Category Breakdown
          const catMap = new Map()
          claims.forEach(c => {
            const cat = c.category || 'Other'
            const amount = Number(c.amount)
            if (catMap.has(cat)) {
              catMap.set(cat, catMap.get(cat) + amount)
            } else {
              catMap.set(cat, amount)
            }
          })

          const categories = Array.from(catMap.entries()).map(([name, amount]) => ({
            name,
            amount,
            percentage: Math.round((amount / (totalAmount || 1)) * 100)
          })).sort((a, b) => b.amount - a.amount)
          
          setCategoryData(categories)
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organization-wide expense analytics and trends
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claims</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClaims}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{stats.approvedRate}% approved</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Approved</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.totalAmount / 100000).toFixed(1)}L</div>
            <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Paid this FY</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Claim Value</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.avgClaimValue.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>Per approved claim</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEmployees}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Registered users</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((item) => (
                <div key={item.month} className="flex items-center gap-4">
                  <div className="w-12 text-sm font-medium">{item.month}</div>
                  <div className="flex-1 h-8 bg-secondary rounded-md overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-md flex items-center justify-end px-2"
                      style={{ width: `${Math.min((item.claims / 50) * 100, 100)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{item.claims}</span>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-right text-muted-foreground">
                    ₹{(item.amount / 1000).toFixed(0)}k
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">₹{(cat.amount / 1000).toFixed(0)}k ({cat.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
