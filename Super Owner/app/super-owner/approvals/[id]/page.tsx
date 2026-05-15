"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, Clock, User, DollarSign, Calendar, FileText, Receipt, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"

export default function ClaimReviewPage() {
  const params = useParams()
  const id = params.id as string
  
  const [claim, setClaim] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    async function fetchClaim() {
      try {
        const { data: claimData, error } = await supabase
          .from('claims')
          .select(`
            *,
            profiles:employee_id (
              full_name,
              employee_id,
              email,
              department
            )
          `)
          .eq('id', id)
          .single()

        if (error) throw error
        setClaim(claimData)
      } catch (error) {
        console.error('Error fetching claim:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClaim()
  }, [id])

  const handleApprove = async () => {
    try {
      setIsProcessing(true)
      console.log('Approving claim with ID:', id)
      
      const { data, error } = await supabase
        .from('claims')
        .update({ 
          status: 'Approved',
          approved_by: 'super_owner',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      console.log('Update result:', data, 'Error:', error)

      if (error) throw error
      
      if (data && data.length > 0) {
        setClaim((p: any) => ({ ...p, status: 'Approved', approved_by: 'super_owner' }))
        alert("Claim approved. Routed to Finance for payment.")
      } else {
        throw new Error('No data returned from update')
      }
    } catch (error) {
      console.error('Error approving claim:', error)
      alert("Failed to approve claim: " + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason:")
    if (!reason) return
    
    try {
      setIsProcessing(true)
      const { error } = await supabase
        .from('claims')
        .update({ 
          status: 'Rejected',
          approved_by: 'super_owner',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      setClaim((p: any) => ({ ...p, status: 'Rejected', approved_by: 'super_owner' }))
      alert("Claim rejected. Reason: " + reason)
    } catch (error) {
      console.error('Error rejecting claim:', error)
      alert("Failed to reject claim")
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading claim data...</p>
        </div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Claim not found</p>
      </div>
    )
  }

  const claimantName = claim.profiles?.full_name || 'Unknown'
  const claimantId = claim.profiles?.employee_id || 'N/A'
  const department = claim.profiles?.department || 'N/A'
  const claimStatus = claim.status || 'Unknown'
  const claimNumber = claim.claim_number || 'N/A'
  const createdAt = claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'
  const isManagerClaim = claim.approved_by === 'manager' || claim.approved_by === 'super_owner'

  return (
    <div className="p-8">
      <Link href="/super-owner/approvals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Approvals
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">Claim Review</h1>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase",
              claimStatus === 'Pending' && "bg-amber-100 text-amber-700",
              claimStatus === 'Approved' && "bg-emerald-100 text-emerald-700",
              claimStatus === 'Rejected' && "bg-red-100 text-red-700"
            )}>
              {claimStatus}
            </span>
          </div>
          <p className="text-muted-foreground">{claimNumber} • Submitted on {createdAt}</p>
        </div>
        {claimStatus === 'Pending' && (
          <div className="flex gap-3">
            <button onClick={handleReject} disabled={isProcessing} className="px-6 py-3 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button onClick={handleApprove} disabled={isProcessing} className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {isProcessing ? "Processing..." : "Approve"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Claimant Information
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                {claimantName.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{claimantName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    Employee
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{claimantId} • {department}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              Review Reason
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-amber-900">Requires Super Owner Review</h3>
                <p className="text-sm text-amber-700 mb-2">Manager or Finance self-approval</p>
                <div className="bg-amber-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800">Claim requires Super Owner approval as it was created by a manager or finance role.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Expense Details
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Vendor</p><p className="font-semibold">{claim.vendor_name || 'N/A'}</p></div>
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Category</p><p className="font-semibold">{claim.category || 'N/A'}</p></div>
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Date</p><p className="font-semibold flex items-center gap-1"><Calendar className="w-4 h-4" />{claim.expense_date || 'N/A'}</p></div>
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">GSTIN</p><p className="font-semibold">{claim.gstin || 'N/A'}</p></div>
            </div>
            <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm">{claim.description || 'No description'}</p></div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Receipt
            </h2>
            <div className="bg-secondary/50 rounded-lg p-8 text-center">
              {claim.receipt_url ? (
                <div className="space-y-4">
                  <img 
                    src={claim.receipt_url} 
                    alt="Receipt" 
                    className="max-w-full max-h-96 mx-auto rounded-lg shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <a 
                    href={claim.receipt_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-block text-sm text-primary hover:underline font-medium"
                  >
                    Open Receipt in New Tab
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No receipt attached</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground mb-2">Claim Amount</p>
            <div className="text-3xl font-bold mb-4">₹{claim.amount?.toLocaleString('en-IN') || '0'}</div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{((claim.amount || 0) / 1.18).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST (18%)</span><span>₹{((claim.amount || 0) - (claim.amount || 0) / 1.18).toFixed(2)}</span></div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold"><span>Total</span><span>₹{(claim.amount || 0).toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Status</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
                <div><p className="text-sm font-medium">Submitted</p><p className="text-xs text-muted-foreground">{createdAt}</p></div>
              </div>
              <div className="w-px h-6 bg-border ml-4" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
                <div><p className="text-sm font-medium">Awaiting Super Owner</p><p className="text-xs text-muted-foreground">Requires review</p></div>
              </div>
              <div className="w-px h-6 bg-border ml-4" />
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", claimStatus === 'Pending' ? "bg-amber-100" : "bg-emerald-100")}>
                  <Clock className={cn("w-4 h-4", claimStatus === 'Pending' ? "text-amber-600" : "text-emerald-600")} />
                </div>
                <div>
                  <p className="text-sm font-medium">{claimStatus === 'Pending' ? 'Awaiting Approval' : 'Super Owner Approved'}</p>
                </div>
              </div>
              <div className="w-px h-6 bg-border ml-4" />
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><DollarSign className="w-4 h-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-medium">Finance Processing</p><p className="text-xs text-muted-foreground">Pending</p></div>
              </div>
              <div className="w-px h-6 bg-border ml-4" />
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><CheckCircle className="w-4 h-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-medium">Payment</p><p className="text-xs text-muted-foreground">Pending</p></div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Audit Trail</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Created by</span><span className="font-medium">{claimantName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Submitted on</span><span className="font-medium">{createdAt}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-medium">{department}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Requires Review</span><span className="font-medium text-primary">Yes</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
