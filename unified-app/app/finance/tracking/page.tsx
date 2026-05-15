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
  TrendingUp,
  Download,
  Building2,
  CreditCard,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Filter,
  Loader2,
  Sun,
  Moon,
  Sunset,
  RefreshCw,
} from "lucide-react"
import {
  fetchTransactions,
  type Transaction,
  AuthRequiredError,
} from "@/lib/finance/finance-supabase-data"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: "Good Morning", icon: Sun }
  if (hour < 17) return { text: "Good Afternoon", icon: Sunset }
  return { text: "Good Evening", icon: Moon }
}

const methodIcons = {
  NEFT: Building2,
  IMPS: CreditCard,
  UPI: Smartphone,
  RTGS: Building2,
}

const PAGE_SIZE = 5

type PeriodKey = "30d" | "90d" | "365d" | "all"
type MethodKey = "all" | "NEFT" | "IMPS" | "UPI" | "RTGS"

function getCutoff(period: PeriodKey): Date | null {
  const now = new Date()
  if (period === "all") return null
  const days = period === "30d" ? 30 : period === "90d" ? 90 : 365
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export default function TrackingPage() {
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>("30d")
  const [methodFilter, setMethodFilter] = useState<MethodKey>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  useEffect(() => {
    void loadTransactions()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, periodFilter, methodFilter])

  const loadTransactions = async () => {
    try {
      const data = await fetchTransactions()
      setTransactions(data)
      setLastSyncedAt(new Date())
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuthRequired(true)
      } else {
        console.error("Failed to load transactions:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = useMemo(() => {
    const cutoff = getCutoff(periodFilter)
    const lowerSearch = searchTerm.toLowerCase()

    return transactions.filter((t) => {
      const matchesSearch =
        t.employeeName.toLowerCase().includes(lowerSearch) ||
        t.claimNumber.toLowerCase().includes(lowerSearch)

      const matchesMethod = methodFilter === "all" || t.paymentMode === methodFilter
      const txDate = new Date(t.date)
      const matchesPeriod = cutoff ? txDate >= cutoff : true

      return matchesSearch && matchesMethod && matchesPeriod
    })
  }, [transactions, searchTerm, periodFilter, methodFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredTransactions.slice(start, start + PAGE_SIZE)
  }, [filteredTransactions, currentPage])

  const totalDisbursed = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const resultStart = filteredTransactions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const resultEnd = Math.min(currentPage * PAGE_SIZE, filteredTransactions.length)

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

  if (authRequired) {
    return (
      <FinanceLayout title="Transaction Ledger">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (loading) {
    return (
      <FinanceLayout title="Transaction Ledger">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Transaction Ledger">
      <div className="p-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GreetingIcon className="w-7 h-7 text-primary" />
              <h1 className="text-3xl font-black font-[family-name:var(--font-manrope)] text-foreground">{greeting.text}, Finance Team</h1>
            </div>
            <p className="text-muted-foreground">Transaction ledger with synced payment activity and searchable audit trail.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : "Not synced"}</span>
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => void loadTransactions()}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => window.print()}>
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-primary to-indigo-600 p-6 rounded-2xl text-primary-foreground shadow-xl">
            <p className="text-xs text-primary-foreground/80 mb-1">Total Disbursements</p>
            <h2 className="text-3xl font-bold font-[family-name:var(--font-manrope)] tracking-tight">INR {totalDisbursed.toLocaleString("en-IN")}</h2>
            <p className="text-xs text-primary-foreground/80 mt-2">{filteredTransactions.length} transactions in current filter</p>
            <Badge className="mt-4 bg-primary-foreground/20 text-primary-foreground border-0 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Avg INR {filteredTransactions.length > 0 ? Math.round(totalDisbursed / filteredTransactions.length).toLocaleString("en-IN") : 0}
            </Badge>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-sm border border-border/70 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Period</label>
              <Select value={periodFilter} onValueChange={(value: PeriodKey) => setPeriodFilter(value)}>
                <SelectTrigger className="w-full mt-1 bg-muted/60 border-border/70">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="365d">Last 12 months</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Payment Method</label>
              <Select value={methodFilter} onValueChange={(value: MethodKey) => setMethodFilter(value)}>
                <SelectTrigger className="w-full mt-1 bg-muted/60 border-border/70">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="IMPS">IMPS</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Payment Records</h3>
              <Badge variant="secondary" className="text-xs ml-2">{filteredTransactions.length} records</Badge>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employee or claim ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-muted/60 border-border/70 text-sm w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Claim ID</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTransactions.map((tx, idx) => {
                  const MethodIcon = methodIcons[tx.paymentMode as keyof typeof methodIcons] || Building2
                  const initials = tx.employeeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${idx % 2 === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{tx.employeeName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{tx.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><span className="text-sm text-muted-foreground font-mono">{tx.claimNumber}</span></td>
                      <td className="px-4 py-4 text-right"><span className="text-sm font-bold text-foreground">INR {tx.amount.toLocaleString("en-IN")}</span></td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground">{new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center items-center gap-2">
                          <MethodIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{tx.paymentMode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary">Paid</Badge>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {paginatedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Showing <span className="font-medium text-foreground">{resultStart}-{resultEnd}</span> of {filteredTransactions.length} transactions</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              {pageWindow.map((pageNumber) => (
                <Button key={pageNumber} size="sm" variant={pageNumber === currentPage ? "default" : "outline"} className="h-8 w-8 p-0 text-[11px]" onClick={() => setCurrentPage(pageNumber)}>
                  {pageNumber}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </FinanceLayout>
  )
}
