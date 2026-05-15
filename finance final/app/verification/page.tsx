"use client"

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
  Clock,
  Wallet,
  AlertTriangle,
  Gauge,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  fetchPendingVerification,
  buildFinanceDashboardStats,
  type FinanceClaim,
  AuthRequiredError,
} from "@/lib/dashboard/finance-supabase-data"

const PAGE_SIZE = 5

type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc"
type StatusKey = "all" | "flagged" | "in_review"

export default function VerificationPage() {
  const [claims, setClaims] = useState<FinanceClaim[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortKey>("newest")
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    void loadVerificationData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortBy, statusFilter])

  const loadVerificationData = async () => {
    try {
      const [claimsData, statsData] = await Promise.all([
        fetchPendingVerification(),
        buildFinanceDashboardStats(),
      ])
      setClaims(claimsData)
      setStats(statsData)
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuthRequired(true)
      } else {
        console.error("Failed to load verification data:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredClaims = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()

    let next = claims.filter((claim) => {
      const matchesSearch =
        (claim.employeeName || "").toLowerCase().includes(lowerSearch) ||
        (claim.claimNumber || "").toLowerCase().includes(lowerSearch) ||
        (claim.category || "").toLowerCase().includes(lowerSearch)

      const isFlagged = claim.amount > 50000
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "flagged" && isFlagged) ||
        (statusFilter === "in_review" && !isFlagged)

      return matchesSearch && matchesStatus
    })

    next = [...next].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sortBy === "amount_desc") return b.amount - a.amount
      return a.amount - b.amount
    })

    return next
  }, [claims, searchTerm, sortBy, statusFilter])

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
    const header = ["Claim ID", "Employee", "Employee Ref", "Category", "Amount", "Date", "Status"]
    const rows = filteredClaims.map((claim) => [
      claim.claimNumber,
      claim.employeeName,
      claim.employeeId,
      claim.category,
      String(claim.amount),
      new Date(claim.date).toISOString(),
      claim.amount > 50000 ? "Flagged" : "In Review",
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `verification-queue-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (authRequired) {
    return (
      <FinanceLayout title="Claim Verification">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (loading) {
    return (
      <FinanceLayout title="Claim Verification">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Claim Verification">
      <div className="p-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight font-[family-name:var(--font-manrope)] text-foreground mb-1">Verification Queue</h1>
            <p className="text-muted-foreground">Review and verify employee expense claims with audit-ready workflow</p>
          </div>
          <Button size="sm" className="gap-2 text-xs bg-primary shadow-lg" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export Queue
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-border/70 border-l-4 border-l-primary">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Live</span>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">{stats?.pendingVerification || 0}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Pending Verification</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/70">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-muted rounded-lg">
                <Wallet className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                INR {(filteredClaims.reduce((sum, c) => sum + c.amount, 0) / 100000).toFixed(1)}L
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Queue Amount</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/70">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-xs font-bold text-destructive uppercase tracking-wider">High Risk</span>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                {filteredClaims.filter((c) => c.amount > 50000).length.toString().padStart(2, "0")}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Flagged Claims</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/70">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gauge className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">SLA</span>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">5.8 min</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Avg. Processing Time</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/70">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Claims Pending Review</h3>
              <Badge variant="secondary" className="text-xs ml-2">{filteredClaims.length} items</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64 max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
                  className="pl-9 h-9 bg-muted/60 border-border/70 text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(value: StatusKey) => setStatusFilter(value)}>
                  <SelectTrigger className="w-44 bg-muted/60 border-border/70">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value: SortKey) => setSortBy(value)}>
                  <SelectTrigger className="w-48 bg-muted/60 border-border/70">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="amount_desc">Amount high to low</SelectItem>
                    <SelectItem value="amount_asc">Amount low to high</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/60 border-b border-border/60">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Claim ID</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClaims.map((claim) => (
                  <tr key={claim.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {(claim.employeeName || "UN")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{claim.employeeName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{claim.employeeId || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-mono text-muted-foreground">{claim.claimNumber}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-bold text-foreground">{claim.currency} {claim.amount.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="text-xs h-6">{claim.category}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(claim.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant={claim.amount > 50000 ? "destructive" : "secondary"} className="text-xs h-6">
                        {claim.amount > 50000 ? "Flagged" : "In Review"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button asChild size="sm" className="text-xs h-8">
                        <Link href={`/verification/${claim.id}`}>Verify</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {paginatedClaims.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground text-sm">
                      No claims pending verification
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
        </div>
      </div>
    </FinanceLayout>
  )
}
