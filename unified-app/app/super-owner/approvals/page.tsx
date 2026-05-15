"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Download, 
  Search, 
  CheckCircle, 
  XCircle,
  Eye,
  Inbox,
  ChevronDown,
  Loader2,
  User,
  Building2,
  DollarSign,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

const filters = ['all', 'manager', 'finance'] as const
type Filter = typeof filters[number]

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
}

interface PendingApproval {
  id: string
  claimNumber: string
  type: 'manager' | 'finance'
  claimant: string
  claimantRole: string
  claimantId: string
  vendor: string
  amount: number
  date: string
  category: string
  reason: string
  status: string
  daysPending: number
}

export default function SuperOwnerApprovalsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set())
  const [claims, setClaims] = useState<PendingApproval[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPendingApprovals() {
      try {
        console.log('Fetching pending approvals...')
        
        // Fetch all claims
        const { data: allClaims, error } = await supabase
          .from('claims')
          .select('*')
          .order('created_at', { ascending: false })

        console.log('Claims fetched:', allClaims?.length, 'Error:', error)
        if (error) throw error

        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, employee_id, role')

        console.log('Profiles fetched:', profiles?.length, 'Error:', profilesError)
        console.log('All profiles:', profiles)
        if (profilesError) throw profilesError

        // Create a map of profiles by id
        const profileMap = new Map((profiles || []).map(p => [p.id, p]))
        console.log('Profile map size:', profileMap.size)

        // Filter claims that need Super Owner approval:
        // Show ALL manager/finance claims regardless of approval_tier
        // This includes both self-approvals and escalated claims
        const filteredClaims = (allClaims || []).filter((claim: any) => {
          const profile = profileMap.get(claim.employee_id)
          console.log('Checking claim:', claim.id, 'employee_id:', claim.employee_id, 'profile found:', !!profile, 'role:', profile?.role, 'approval_tier:', claim.approval_tier)
          const isManagerFinance = profile?.role === 'manager' || profile?.role === 'finance'
          // Show all manager/finance claims
          return isManagerFinance
        })

        console.log('Filtered claims:', filteredClaims.length)

        const transformedClaims = filteredClaims.map((claim: any): PendingApproval => {
          const createdDate = new Date(claim.created_at)
          const now = new Date()
          const daysPending = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
          
          const profile = profileMap.get(claim.employee_id)
          
          // Determine type based on employee role (no escalations here)
          let type: 'manager' | 'finance' = 'manager'
          let reason = 'Super Owner approval required'
          
          if (profile?.role === 'manager') {
            type = 'manager'
            reason = 'Manager self-approval'
          } else if (profile?.role === 'finance') {
            type = 'finance'
            reason = 'Finance self-approval'
          }
          
          // Map status to match filter values
          let mappedStatus = claim.status.toLowerCase()
          if (mappedStatus === 'submitted') {
            mappedStatus = 'pending'
          }
          
          return {
            id: claim.id,
            claimNumber: claim.claim_number,
            type: type,
            claimant: profile?.full_name || 'Unknown',
            claimantRole: profile?.role || 'Employee',
            claimantId: profile?.employee_id || 'N/A',
            vendor: claim.vendor_name || 'Unknown',
            amount: Number(claim.amount) || 0,
            date: claim.expense_date || claim.created_at,
            category: claim.category || 'Unknown',
            reason: reason,
            status: mappedStatus,
            daysPending: daysPending
          }
        })

        console.log('Setting claims:', transformedClaims.length)
        setClaims(transformedClaims)
      } catch (error) {
        console.error('Error fetching pending approvals:', error)
        setClaims([])
      } finally {
        setLoading(false)
      }
    }

    fetchPendingApprovals()
  }, [])

  const handleApprove = async (claimId: string) => {
    try {
      setProcessingId(claimId)
      await new Promise(resolve => setTimeout(resolve, 500))
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'approved' } : c))
      setSelectedClaims(new Set())
    } catch (err) {
      alert('Failed to approve claim')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (claimId: string) => {
    const reason = prompt("Enter rejection reason:")
    if (!reason) return
    try {
      setProcessingId(claimId)
      await new Promise(resolve => setTimeout(resolve, 500))
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'rejected' } : c))
      setSelectedClaims(new Set())
    } catch (err) {
      alert('Failed to reject claim')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredClaims = claims.filter(claim => {
    const matchesFilter = filter === 'all' || claim.type === filter
    const matchesSearch = claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.claimant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.vendor.toLowerCase().includes(searchTerm.toLowerCase())
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

  const totalAmount = claims.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
            Pending Approvals
          </h1>
          <p className="text-muted-foreground mt-1">Claims requiring Super Owner approval (Manager/Finance self-approvals)</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Pending</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500">{claims.filter(c => c.status === 'pending').length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Manager Claims</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-500">{claims.filter(c => c.type === 'manager' && c.status === 'pending').length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Finance Claims</span>
            <User className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-500">{claims.filter(c => c.type === 'finance' && c.status === 'pending').length}</div>
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
        
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary border-none rounded-lg text-sm focus:ring-0"
          />
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

      {/* Table Container */}
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
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Claimant</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Claim ID</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Days</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center">
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
                  const initials = claim.claimant.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
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
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                            claim.type === 'manager' ? "bg-blue-500" : "bg-purple-500"
                          )}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{claim.claimant}</p>
                            <p className="text-[10px] text-muted-foreground">{claim.claimantId} • {claim.claimantRole}</p>
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
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          claim.type === 'manager' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {claim.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{claim.reason}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold",
                          claim.daysPending > 3 ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"
                        )}>
                          {claim.daysPending}d
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
                                href={`/super-owner/approvals/${claim.id}`}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {claim.status === 'pending' && (
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
    </div>
  )
}
