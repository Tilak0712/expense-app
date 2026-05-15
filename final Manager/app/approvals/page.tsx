"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { ManagerLayout } from "@/components/manager/manager-layout"
import { 
  Download, 
  Search, 
  CheckCircle, 
  XCircle,
  Eye,
  Inbox,
  ChevronDown,
  Loader2
} from "lucide-react"
import { 
  AuthRequiredError,
  fetchAllClaims,
  approveClaim,
  rejectClaim,
  type ManagerClaim
} from "@/lib/dashboard/manager-supabase-data"
import { cn } from "@/lib/utils"

const filters = ['Pending', 'Approved', 'Rejected'] as const
type Filter = typeof filters[number]

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  Submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Submitted' },
  Approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  Paid: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paid' },
  Rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  Draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
}

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<Filter>('Pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set())
  const [claims, setClaims] = useState<ManagerClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setAuthRequired(false)

        const records = await fetchAllClaims()
        if (!active) return

        setClaims(records)
      } catch (err) {
        if (!active) return

        if (err instanceof AuthRequiredError) {
          setAuthRequired(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load claims')
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

  // Redirect to login if auth required
  useEffect(() => {
    if (authRequired && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authRequired])

  const handleApprove = async (claimId: string) => {
    try {
      setProcessingId(claimId)
      await approveClaim(claimId)
      // Refresh claims
      const records = await fetchAllClaims()
      setClaims(records)
      setSelectedClaims(new Set())
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as any)?.message === 'string'
            ? (err as any).message
            : 'Failed to approve claim'
      console.error('Failed to approve:', message)
      alert(message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (claimId: string) => {
    try {
      setProcessingId(claimId)
      await rejectClaim(claimId)
      // Refresh claims
      const records = await fetchAllClaims()
      setClaims(records)
      setSelectedClaims(new Set())
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as any)?.message === 'string'
            ? (err as any).message
            : 'Failed to reject claim'
      console.error('Failed to reject:', message)
      alert(message)
    } finally {
      setProcessingId(null)
    }
  }

  const pendingClaims = useMemo(() => 
    claims.filter(c => c.status === 'Pending' || c.status === 'Submitted'),
    [claims]
  )

  const filteredClaims = claims.filter(claim => {
    // Exclude manager's own claims that are routed to Super Owner (approval_tier >= 2)
    // We check both employee_id and approval_tier for absolute safety
    if (claim.approval_tier && claim.approval_tier >= 2) return false

    const matchesFilter = 
      (filter === 'Pending' && (claim.status === 'Pending' || claim.status === 'Submitted')) ||
      (filter === 'Approved' && (claim.status === 'Approved' || claim.status === 'Paid')) ||
      (filter === 'Rejected' && claim.status === 'Rejected')
    const matchesSearch = claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.category.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const toggleClaim = (id: string) => {
    const newSelected = new Set(selectedClaims)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedClaims(newSelected)
  }

  const toggleAll = () => {
    if (selectedClaims.size === filteredClaims.length) {
      setSelectedClaims(new Set())
    } else {
      setSelectedClaims(new Set(filteredClaims.map(c => c.id)))
    }
  }

  const getDaysPending = (date: string) => {
    const created = new Date(date)
    const now = new Date()
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <ManagerLayout>
      <div className="p-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
              Pending Approvals
            </h1>
            <p className="text-muted-foreground mt-1">Review and approve team expense claims</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-secondary text-secondary-foreground font-semibold text-sm rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              className={cn(
                "px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg",
                selectedClaims.size === 0 ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] transition-transform"
              )}
              disabled={selectedClaims.size === 0}
            >
              Bulk Approve ({selectedClaims.size})
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-secondary rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f)
                  setSelectedClaims(new Set())
                }}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  filter === f 
                    ? "bg-card text-primary shadow-sm font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <select className="appearance-none pl-4 pr-10 py-2 bg-secondary border-none rounded-lg text-sm font-medium focus:ring-0 cursor-pointer">
              <option>This Month</option>
              <option>Last 3 Months</option>
              <option>This Year</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading claims...</span>
          </div>
        )}

        {/* Error State */}
        {error && !authRequired && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 mb-6">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Table Container */}
        {!isLoading && !error && (
          <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary border-none">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary"
                        checked={selectedClaims.size === filteredClaims.length && filteredClaims.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Claim ID</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Days Pending</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                          <Inbox className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">No claims found</h3>
                        <p className="text-sm text-muted-foreground">No claims match your current filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim) => {
                      const status = statusStyles[claim.status] || statusStyles.pending
                      const date = new Date(claim.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      const daysPending = getDaysPending(claim.createdAt)
                      const initials = claim.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      const isProcessing = processingId === claim.id
                      
                      return (
                        <tr key={claim.id} className="hover:bg-secondary/30 transition-colors group">
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-border text-primary focus:ring-primary"
                              checked={selectedClaims.has(claim.id)}
                              onChange={() => toggleClaim(claim.id)}
                              disabled={isProcessing}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{claim.employeeName}</p>
                                <p className="text-[10px] text-muted-foreground">{claim.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-primary text-sm">{claim.claimNumber}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-bold text-foreground">₹{claim.amount.toLocaleString('en-IN')}</span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{claim.category}</td>
                          <td className="p-4 text-sm text-muted-foreground">{date}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold",
                              daysPending > 3 ? "bg-amber-100 text-amber-700" : "bg-secondary text-secondary-foreground"
                            )}>
                              {daysPending} days
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                              status.bg,
                              status.text
                            )}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              ) : (
                                <>
                                  <Link 
                                    href={`/approvals/${claim.id}`}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                  {(claim.status === 'Pending' || claim.status === 'Submitted') && (
                                    <>
                                      <button 
                                        onClick={() => handleApprove(claim.id)}
                                        className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleReject(claim.id)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ManagerLayout>
  )
}
