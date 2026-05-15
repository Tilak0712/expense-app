"use client"

import { useEffect, useMemo, useState } from "react"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Wallet,
  Clock,
  Download,
  Search,
  Calendar,
  Filter,
  Tag,
  MoreVertical,
  Loader2,
  Sun,
  Moon,
  Sunset,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import {
  fetchAllClaims,
  buildFinanceDashboardStats,
  type FinanceClaim,
  AuthRequiredError,
} from "@/lib/dashboard/finance-supabase-data"

const PAGE_SIZE = 5

type PeriodKey = "7d" | "30d" | "90d" | "365d" | "all"
type StatusKey = "all" | "Paid" | "Approved" | "PaymentProcessing" | "Submitted" | "Pending" | "Rejected"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: "Good Morning", icon: Sun }
  if (hour < 17) return { text: "Good Afternoon", icon: Sunset }
  return { text: "Good Evening", icon: Moon }
}

const statusStyles = {
  Paid: { dot: "bg-primary", text: "text-primary" },
  Approved: { dot: "bg-positive", text: "text-positive" },
  PaymentProcessing: { dot: "bg-informative", text: "text-informative" },
  Pending: { dot: "bg-critical", text: "text-critical" },
  Submitted: { dot: "bg-critical", text: "text-critical" },
  Rejected: { dot: "bg-destructive", text: "text-destructive" },
}

function getPeriodCutoff(period: PeriodKey): Date | null {
  const now = new Date()
  if (period === "all") return null
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export default function ReportsPage() {
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  const [claims, setClaims] = useState<FinanceClaim[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>("30d")
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  useEffect(() => {
    void loadReportsData()

    const interval = setInterval(() => {
      void loadReportsData(true)
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, periodFilter, statusFilter, categoryFilter])

  const loadReportsData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)

      const [claimsData, statsData] = await Promise.all([
        fetchAllClaims(),
        buildFinanceDashboardStats(),
      ])
      setClaims(claimsData)
      setStats(statsData)
      setLastSyncedAt(new Date())
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuthRequired(true)
      } else {
        console.error("Failed to load reports data:", err)
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(claims.map((claim) => claim.category).filter(Boolean))).sort()
  }, [claims])

  const filteredClaims = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    const cutoff = getPeriodCutoff(periodFilter)

    return claims.filter((claim) => {
      const createdAt = new Date(claim.createdAt)
      const matchesPeriod = cutoff ? createdAt >= cutoff : true
      const matchesStatus = statusFilter === "all" ? true : claim.status === statusFilter
      const matchesCategory = categoryFilter === "all" ? true : claim.category === categoryFilter
      const matchesSearch =
        claim.employeeName.toLowerCase().includes(lowerSearch) ||
        claim.claimNumber.toLowerCase().includes(lowerSearch)

      return matchesPeriod && matchesStatus && matchesCategory && matchesSearch
    })
  }, [claims, searchTerm, periodFilter, statusFilter, categoryFilter])

  const paidAmount = filteredClaims
    .filter((claim) => claim.status === "Paid")
    .reduce((sum, claim) => sum + claim.amount, 0)

  const pendingAmount = filteredClaims
    .filter((claim) => claim.status !== "Paid")
    .reduce((sum, claim) => sum + claim.amount, 0)

  const approvedCount = filteredClaims.filter((claim) => claim.status === "Paid" || claim.status === "Approved").length
  const approvalRate = filteredClaims.length > 0 ? (approvedCount / filteredClaims.length) * 100 : 0

  const chartData = useMemo(() => {
    const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const sums = new Map<string, number>()

    for (const day of dayOrder) sums.set(day, 0)

    for (const claim of filteredClaims) {
      const day = dayOrder[new Date(claim.createdAt).getDay()]
      sums.set(day, (sums.get(day) || 0) + claim.amount)
    }

    return dayOrder.map((day) => ({ name: day, value: sums.get(day) || 0 }))
  }, [filteredClaims])

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredClaims.slice(start, start + PAGE_SIZE)
  }, [filteredClaims, currentPage])

  const resultStart = filteredClaims.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const resultEnd = Math.min(currentPage * PAGE_SIZE, filteredClaims.length)

  const pageWindow = useMemo(() => {
    const windowSize = 5
    const half = Math.floor(windowSize / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + windowSize - 1)
    if (end - start < windowSize - 1) {
      start = Math.max(1, end - windowSize + 1)
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages])

  const handleExport = () => {
    const header = ["Claim ID", "Employee", "Category", "Amount", "Status", "Created At"]
    const rows = filteredClaims.map((claim) => [
      claim.claimNumber,
      claim.employeeName,
      claim.category,
      String(claim.amount),
      claim.status,
      new Date(claim.createdAt).toISOString(),
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `finance-reports-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (authRequired) {
    return (
      <FinanceLayout title="Reports & Analytics">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (loading) {
    return (
      <FinanceLayout title="Reports & Analytics">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Reports & Analytics">
      <div className="p-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GreetingIcon className="w-7 h-7 text-primary" />
              <h1 className="text-3xl font-black font-[family-name:var(--font-manrope)] text-foreground tracking-tight">
                {greeting.text}, Finance Team
              </h1>
            </div>
            <p className="text-muted-foreground">Analytics and audit trail are synced with live claim data.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : "Not synced yet"}
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => void loadReportsData(true)}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button className="h-8 gap-2" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>

        <section className="bg-card rounded-2xl border border-border/70 p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Period</label>
              <Select value={periodFilter} onValueChange={(value: PeriodKey) => setPeriodFilter(value)}>
                <SelectTrigger className="w-full bg-muted/60 border-border/70">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="365d">Last 12 months</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(value: StatusKey) => setStatusFilter(value)}>
                <SelectTrigger className="w-full bg-muted/60 border-border/70">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="PaymentProcessing">Payment Processing</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full bg-muted/60 border-border/70">
                  <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Employee or claim ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-muted/60 border-border/70"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-3 bg-card p-6 rounded-2xl shadow-sm border border-border/70 border-l-4 border-l-primary">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Paid</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                INR {paidAmount.toLocaleString("en-IN")}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Disbursed Amount</p>
            </div>
          </div>

          <div className="md:col-span-3 bg-card p-6 rounded-2xl shadow-sm border border-border/70">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-critical/20 rounded-lg">
                <Clock className="w-5 h-5 text-critical" />
              </div>
              <span className="text-xs font-bold text-critical uppercase tracking-wider">Open</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                INR {pendingAmount.toLocaleString("en-IN")}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Open Liability</p>
            </div>
          </div>

          <div className="md:col-span-6 bg-card p-6 rounded-2xl shadow-sm border border-border/70">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Weekly Disbursement Trend</h4>
              <Badge variant="secondary">Approval {approvalRate.toFixed(1)}%</Badge>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number) => [`INR ${value.toLocaleString("en-IN")}`, "Amount"]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <section className="bg-card p-6 rounded-2xl shadow-sm border border-border/70">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Audit Transaction Log</h3>
            <Badge variant="secondary" className="text-xs">{filteredClaims.length} results</Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Claim ID</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedClaims.map((claim, idx) => {
                  const initials = claim.employeeName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)

                  const statusStyle =
                    statusStyles[claim.status as keyof typeof statusStyles] ||
                    ({ dot: "bg-muted", text: "text-muted-foreground" } as const)

                  return (
                    <tr key={claim.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                              idx % 3 === 0
                                ? "bg-primary/10 text-primary"
                                : idx % 3 === 1
                                  ? "bg-positive/20 text-positive"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{claim.employeeName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{claim.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{claim.claimNumber}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="text-xs font-bold">
                          {claim.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">INR {claim.amount.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}

                {paginatedClaims.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No records match current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{resultStart}-{resultEnd}</span> of {filteredClaims.length} results
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              {pageWindow.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  size="sm"
                  variant={pageNumber === currentPage ? "default" : "outline"}
                  className="h-8 w-8 p-0 text-[11px]"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </section>

        <div className="text-xs text-muted-foreground">
          Global stats: Processed this month INR {(stats?.processedThisMonth || 0).toLocaleString("en-IN")}, Pending payments {stats?.pendingPayments || 0}
        </div>
      </div>
    </FinanceLayout>
  )
}
