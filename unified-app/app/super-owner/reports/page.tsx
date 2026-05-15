import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, DollarSign, Users, Receipt, Calendar } from "lucide-react"

export default function ReportsPage() {
  const monthlyData = [
    { month: "Jul", claims: 89, amount: 320000 },
    { month: "Aug", claims: 102, amount: 410000 },
    { month: "Sep", claims: 95, amount: 380000 },
    { month: "Oct", claims: 110, amount: 520000 },
    { month: "Nov", claims: 98, amount: 450000 },
    { month: "Dec", claims: 85, amount: 390000 },
  ]

  const categoryData = [
    { name: "Travel", amount: 890000, percentage: 35 },
    { name: "Software", amount: 620000, percentage: 24 },
    { name: "Meals", amount: 340000, percentage: 13 },
    { name: "Accommodation", amount: 450000, percentage: 18 },
    { name: "Other", amount: 250000, percentage: 10 },
  ]

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claims (FY)</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+12% vs last FY</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹45.7L</div>
            <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+8% vs last FY</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Claim Value</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹3,667</div>
            <div className="flex items-center gap-1 text-xs text-destructive mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>-3% vs last FY</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+5 new this month</span>
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
                      style={{ width: `${(item.claims / 120) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">{item.claims}</span>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-right text-muted-foreground">
                    ₹{(item.amount / 100000).toFixed(1)}L
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
                    <span className="text-muted-foreground">₹{(cat.amount / 100000).toFixed(1)}L ({cat.percentage}%)</span>
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
