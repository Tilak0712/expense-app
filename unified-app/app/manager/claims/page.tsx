"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ManagerLayout } from "@/components/manager/manager-layout"
import { 
  Plus, 
  Search, 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Plane,
  Utensils,
  Building,
  Fuel,
  Package,
  Inbox,
  Loader2
} from "lucide-react"
import { 
  AuthRequiredError,
  fetchAllClaims,
  fetchManagerCreatedClaims,
  type ManagerClaim
} from "@/lib/manager/manager-supabase-data"
import { cn } from "@/lib/utils"

const categoryIcons: Record<string, React.ElementType> = {
  Travel: Plane,
  Meals: Utensils,
  Hotel: Building,
  Fuel: Fuel,
  Supplies: Package
}

const filters = ['all', 'Pending', 'Approved', 'Rejected'] as const
type Filter = typeof filters[number]

const claimSourceFilters = ['team', 'manager'] as const
type ClaimSourceFilter = typeof claimSourceFilters[number]

const statusStyles: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  Submitted: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  Approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  Paid: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
  Rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  Draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Receipt },
}

const getStatusStyle = (status: string) => {
  return statusStyles[status] || statusStyles.Pending
}

export default function ClaimsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [claimSourceFilter, setClaimSourceFilter] = useState<ClaimSourceFilter>('team')
  const [searchTerm, setSearchTerm] = useState('')
  const [claims, setClaims] = useState<ManagerClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setAuthRequired(false)

        const records = claimSourceFilter === 'manager' 
          ? await fetchManagerCreatedClaims()
          : await fetchAllClaims()
        
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
  }, [claimSourceFilter])

  // Redirect to login if auth required
  useEffect(() => {
    if (authRequired && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authRequired])

  const filteredClaims = claims.filter(claim => {
    const matchesFilter = filter === 'all' || claim.status === filter
    const matchesSearch = claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const statusCounts = {
    all: claims.length,
    Pending: claims.filter(c => c.status === 'Pending' || c.status === 'Submitted').length,
    Approved: claims.filter(c => c.status === 'Approved' || c.status === 'Paid').length,
    Rejected: claims.filter(c => c.status === 'Rejected').length,
  }

  return (
    <ManagerLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
              My Expense Claims
            </h1>
            <p className="text-muted-foreground mt-1">View and track your personal expense submissions</p>
          </div>
          <Link 
            href="/manager/create-claim"
            className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Claim
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-5 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Claims</span>
            </div>
            <p className="text-3xl font-black text-foreground">{statusCounts.all}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
          
          <div className="bg-card p-5 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-3xl font-black text-foreground">{statusCounts.Pending}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </div>
          
          <div className="bg-card p-5 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approved</span>
            </div>
            <p className="text-3xl font-black text-foreground">{statusCounts.Approved}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved claims</p>
          </div>
          
          <div className="bg-card p-5 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rejected</span>
            </div>
            <p className="text-3xl font-black text-foreground">{statusCounts.Rejected}</p>
            <p className="text-xs text-muted-foreground mt-1">Rejected claims</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex bg-secondary rounded-lg p-1">
            {claimSourceFilters.map((f) => (
              <button
                key={f}
                onClick={() => setClaimSourceFilter(f)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  claimSourceFilter === f 
                    ? "bg-card text-primary shadow-sm font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === 'team' ? 'Team Claims' : 'My Claims'}
              </button>
            ))}
          </div>
          
          <div className="flex bg-secondary rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none"
            />
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

        {/* Claims Table */}
        {!isLoading && !error && (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">No claims found</h3>
                      <p className="text-sm text-muted-foreground">No claims match your search</p>
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => {
                    const CategoryIcon = categoryIcons[claim.category] || Receipt
                    const status = getStatusStyle(claim.status)
                    const date = new Date(claim.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    
                    return (
                      <tr key={claim.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{claim.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{claim.employeeId}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{date}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="w-4 h-4 text-primary" />
                            <span className="text-sm text-foreground">{claim.category}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-bold text-foreground">₹{claim.amount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                            status.bg,
                            status.text
                          )}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link 
                            href={`/manager/approvals/${claim.id}`}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors inline-flex"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
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
