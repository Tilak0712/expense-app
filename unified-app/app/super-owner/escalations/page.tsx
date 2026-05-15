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
  AlertTriangle,
  Calendar,
  UserMinus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

const filters = ['pending', 'approved', 'rejected'] as const
type Filter = typeof filters[number]

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
}

interface EscalatedClaim {
  id: string
  claimNumber: string
  employeeName: string
  employeeId: string
  managerName: string
  managerStatus: string
  vendor: string
  amount: number
  category: string
  date: string
  status: string
  escalationReason: string
  escalatedDate: string
  daysPending: number
}

export default function EscalationsPage() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set())
  const [claims, setClaims] = useState<EscalatedClaim[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEscalatedClaims() {
      try {
        console.log('Fetching escalated claims...')
        console.log('Supabase client:', supabase)
        
        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        console.log('Auth user:', user, 'Error:', authError)
        
        // Fetch all claims
        const { data: allClaims, error } = await supabase
          .from('claims')
          .select('*')
          .order('created_at', { ascending: false })

        console.log('Claims fetched:', allClaims?.length, 'Error:', error)
        console.log('Sample claim:', allClaims?.[0])
        
        if (error) throw error

        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, employee_id, on_leave')

        console.log('Profiles fetched:', profiles?.length, 'Error:', profilesError)
        console.log('All profiles:', profiles)
        if (profilesError) throw profilesError

        // Create a map of profiles by id
        const profileMap = new Map((profiles || []).map(p => [p.id, p]))
        console.log('Profile map size:', profileMap.size)

        // Filter for escalated claims (manager is on leave AND not already approved by manager)
        const escalatedClaims = (allClaims || []).filter((claim: any) => {
          const managerProfile = claim.manager_id ? profileMap.get(claim.manager_id) : null
          const isManagerOnLeave = managerProfile?.on_leave === true
          const notApprovedByManager = claim.approved_by !== 'manager'
          console.log('Checking claim:', claim.id, 'manager_id:', claim.manager_id, 'manager on leave:', isManagerOnLeave, 'approved_by:', claim.approved_by)
          return isManagerOnLeave && notApprovedByManager
        })

        console.log('Escalated claims:', escalatedClaims.length)

        const transformedClaims = escalatedClaims.map((claim: any) => {
          const createdDate = new Date(claim.created_at)
          const now = new Date()
          const daysPending = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
          
          const employeeProfile = profileMap.get(claim.employee_id)
          const managerProfile = claim.manager_id ? profileMap.get(claim.manager_id) : null
          
          // Map status to match filter values
          let mappedStatus = claim.status.toLowerCase()
          if (mappedStatus === 'submitted') {
            mappedStatus = 'pending'
          }
          
          return {
            id: claim.id,
            claimNumber: claim.claim_number,
            employeeName: employeeProfile?.full_name || 'Unknown',
            employeeId: employeeProfile?.employee_id || 'N/A',
            managerName: managerProfile?.full_name || 'Unknown',
            managerStatus: managerProfile?.on_leave ? 'on_leave' : 'active',
            vendor: claim.vendor_name || 'Unknown',
            amount: Number(claim.amount) || 0,
            category: claim.category || 'Unknown',
            date: claim.expense_date || claim.created_at,
            status: mappedStatus,
            escalationReason: claim.policy_flags?.[0]?.reason || 'Escalated',
            escalatedDate: claim.created_at,
            daysPending: daysPending
          }
        })

        console.log('Setting escalated claims:', transformedClaims.length)
        setClaims(transformedClaims)
      } catch (error) {
        console.error('Error fetching escalated claims:', error)
        setClaims([])
      } finally {
        setLoading(false)
      }
    }

    fetchEscalatedClaims()
  }, [])

  const handleApprove = async (claimId: string) => {
    try {
      setProcessingId(claimId)
      
      // Update claim in database
      const { error } = await supabase
        .from('claims')
        .update({ 
          status: 'Approved',
          approved_by: 'super_owner'
        })
        .eq('id', claimId)
      
      if (error) throw error
      
      // Update local state
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'approved' } : c))
      setSelectedClaims(new Set())
      
      alert('Claim approved successfully')
    } catch (err) {
      console.error('Error approving claim:', err)
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
    const matchesFilter = claim.status === filter
    const matchesSearch = claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.managerName.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading escalated claims...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
            Escalations
          </h1>
          <p className="text-muted-foreground mt-1">Claims auto-routed due to manager unavailability</p>
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
            <span className="text-sm font-medium text-muted-foreground">Total Escalations</span>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold">{claims.length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Pending Amount</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500">₹{totalAmount.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Affected Managers</span>
            <UserMinus className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{new Set(claims.map(c => c.managerName)).size}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">On Leave</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500">
            {claims.filter(c => c.managerStatus === 'on_leave').length}
          </div>
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
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Claim ID</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Manager</th>
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
                  const date = new Date(claim.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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
                      <td className="p-4 text-sm text-muted-foreground">
                        <div>
                          <p>{claim.managerName}</p>
                          <span className="text-[10px] text-amber-500">{claim.managerStatus.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-destructive font-medium">{claim.escalationReason}</span>
                      </td>
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
                                href={`/super-owner/escalations/${claim.id}`}
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
