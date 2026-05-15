"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, Clock, User, DollarSign, Calendar, FileText, Receipt, AlertTriangle } from "lucide-react"
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
        // Fetch claim with employee profile
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
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 500))
    setClaim((p: any) => ({ ...p, status: 'Approved' }))
    setIsProcessing(false)
    alert("Claim approved.")
  }

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason:")
    if (!reason) return
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 500))
    setClaim((p: any) => ({ ...p, status: 'Rejected' }))
    setIsProcessing(false)
    alert("Claim rejected. Reason: " + reason)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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

  const employeeName = claim.profiles?.full_name || 'Unknown'
  const employeeId = claim.profiles?.employee_id || 'N/A'
  const department = claim.profiles?.department || 'N/A'
  const claimStatus = claim.status || 'Unknown'
  const claimNumber = claim.claim_number || 'N/A'
  const createdAt = claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'

  return (
    <div className="p-8">
      <Link href="/super-owner/all-claims" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to All Claims
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">Claim Review</h1>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase",
              claimStatus === 'Pending' && "bg-amber-100 text-amber-700",
              claimStatus === 'Approved' && "bg-emerald-100 text-emerald-700",
              claimStatus === 'Rejected' && "bg-red-100 text-red-700",
              claimStatus === 'Paid' && "bg-purple-100 text-purple-700"
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
              Employee Information
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                {employeeName.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{employeeName}</h3>
                <p className="text-sm text-muted-foreground">{employeeId} • {department}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Expense Details
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Vendor</p><p className="font-semibold">{claim.vendor_name}</p></div>
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Category</p><p className="font-semibold">{claim.category}</p></div>
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Date</p><p className="font-semibold flex items-center gap-1"><Calendar className="w-4 h-4" />{claim.expense_date}</p></div>
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">GSTIN</p><p className="font-semibold">{claim.gstin || 'N/A'}</p></div>
              <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Currency</p><p className="font-semibold">{claim.currency || 'INR'}</p></div>
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
            <div className="text-3xl font-bold mb-4">₹{claim.amount.toLocaleString('en-IN')}</div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{(claim.amount / 1.18).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST (18%)</span><span>₹{(claim.amount - claim.amount / 1.18).toFixed(2)}</span></div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold"><span>Total</span><span>₹{claim.amount.toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Status Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
                <div><p className="text-sm font-medium">Submitted</p><p className="text-xs text-muted-foreground">{claim.submittedDate}</p></div>
              </div>
              <div className="w-px h-6 bg-border ml-4" />
              {claim.status === 'Rejected' ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><XCircle className="w-4 h-4 text-red-600" /></div>
                    <div><p className="text-sm font-medium">Rejected</p><p className="text-xs text-muted-foreground">{claim.approvedDate || claim.submittedDate}</p></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", claim.status === 'Pending' ? "bg-amber-100" : "bg-emerald-100")}>
                      <Clock className={cn("w-4 h-4", claim.status === 'Pending' ? "text-amber-600" : "text-emerald-600")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{claim.status === 'Pending' ? 'Awaiting Approval' : 'Manager Approved'}</p>
                      {claim.approvedBy && <p className="text-xs text-muted-foreground">by {claim.approvedBy} on {claim.approvedDate}</p>}
                    </div>
                  </div>
                  {claim.status !== 'Pending' && (
                    <>
                      <div className="w-px h-6 bg-border ml-4" />
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", claim.status === 'Approved' ? "bg-amber-100" : "bg-emerald-100")}>
                          <DollarSign className={cn("w-4 h-4", claim.status === 'Approved' ? "text-amber-600" : "text-emerald-600")} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{claim.status === 'Approved' ? 'Finance Processing' : 'Paid'}</p>
                          <p className="text-xs text-muted-foreground">{claim.status === 'Approved' ? 'Pending' : 'Completed'}</p>
                        </div>
                      </div>
                      {claim.status === 'Paid' && (
                        <>
                          <div className="w-px h-6 bg-border ml-4" />
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
                            <div><p className="text-sm font-medium">Payment Complete</p></div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Audit Trail</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Created by</span><span className="font-medium">{employeeName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created on</span><span className="font-medium">{new Date(claim.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-medium">{department}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Claim Number</span><span className="font-medium">{claim.claim_number}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
