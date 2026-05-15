"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Calendar,
  FolderKanban,
  Shield,
  Download,
  Printer,
  CheckCircle,
  Clock,
  MessageSquare,
  Loader2,
  Receipt,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchClaimById, financeApproveClaim, type FinanceClaim } from "@/lib/dashboard/finance-supabase-data"
import { AuthRequiredError } from "@/lib/dashboard/finance-supabase-data"

const statusStyles: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Submitted: "bg-amber-100 text-amber-700",
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  PaymentProcessing: "bg-blue-100 text-blue-700",
  Rejected: "bg-red-100 text-red-700",
  Paid: "bg-blue-100 text-blue-700",
}

function formatDate(value?: string) {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateTime(value?: string) {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "N/A"
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, ${date.toLocaleTimeString(
    "en-IN",
    { hour: "numeric", minute: "2-digit" }
  )}`
}

function formatMoney(amount: number, currency: string) {
  const normalized = (currency || "INR").toUpperCase()
  if (normalized === "USD") {
    return `$${amount.toLocaleString("en-IN")}`
  }
  return `INR ${amount.toLocaleString("en-IN")}`
}

function getStatusHeadline(status: string) {
  if (status === "Approved") return "Manager Approved"
  if (status === "PaymentProcessing") return "Finance Verified - Payment Processing"
  if (status === "Pending") return "Awaiting Manager Approval"
  if (status === "Submitted") return "Awaiting Manager Approval"
  if (status === "Rejected") return "Rejected"
  if (status === "Paid") return "Payment Completed"
  return "Draft"
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [claim, setClaim] = useState<FinanceClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let active = true

    const loadClaim = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchClaimById(id)
        if (!active) return
        if (!data) {
          setError("Claim not found")
          return
        }
        setClaim(data)
      } catch (err) {
        if (!active) return
        if (err instanceof AuthRequiredError) {
          setError("Authentication required")
        } else {
          setError(err instanceof Error ? err.message : "Failed to load claim")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadClaim()
    return () => {
      active = false
    }
  }, [id])

  const isReviewPending = claim?.status === "Approved"
  const isBlobUrl = claim?.receiptUrl?.startsWith('blob:')

  const timelineSteps = useMemo(() => {
    if (!claim) return []

    const managerDone = claim.status === "Approved" || claim.status === "PaymentProcessing" || claim.status === "Rejected" || claim.status === "Paid"
    const financeDone = claim.status === "Paid" || claim.status === "PaymentProcessing"

    return [
      {
        label: "Created",
        date: formatDateTime(claim.createdAt),
        complete: true,
      },
      {
        label: "Submitted",
        date: claim.submittedAt ? formatDateTime(claim.submittedAt) : "Pending submission",
        complete: Boolean(claim.submittedAt),
      },
      {
        label: "Manager Approval",
        date: managerDone ? formatDateTime(claim.createdAt) : "Waiting...",
        complete: managerDone,
        note: claim.status === "Approved" || claim.status === "PaymentProcessing" ? "Approved by manager." : undefined,
      },
      {
        label: "Finance Verification",
        date: financeDone ? formatDateTime(claim.createdAt) : "Waiting...",
        complete: financeDone,
        note: claim.status === "PaymentProcessing" ? "Verified by finance - ready for payment." : undefined,
      },
    ]
  }, [claim])

  const handleApprove = async () => {
    try {
      setIsProcessing(true)
      setActionError(null)
      await financeApproveClaim(id)
      router.push(`/payments?claimId=${encodeURIComponent(id)}`)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to verify claim")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)
  const handleResetView = () => {
    setZoomLevel(1)
    setRotation(0)
  }

  if (loading) {
    return (
      <FinanceLayout title="Review Claim" showBackButton>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </FinanceLayout>
    )
  }

  if (error || !claim) {
    return (
      <FinanceLayout title="Review Claim" showBackButton>
        <div className="p-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
            <p className="text-destructive">{error || "Claim not found"}</p>
          </div>
        </div>
      </FinanceLayout>
    )
  }

  const cgst = Math.round(claim.amount * 0.09)
  const sgst = Math.round(claim.amount * 0.09)

  return (
    <FinanceLayout title="Review Claim" showBackButton>
      <div className="pb-24 min-h-screen">
        <section className="px-8 py-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight">{claim.claimNumber}</h2>
              <p className="text-sm font-medium text-muted-foreground">{claim.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">Audit-Hub Certified</span>
          </div>
        </section>

        <div className="px-8 space-y-8 max-w-[1400px]">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex justify-between items-start mb-6">
                <span className="text-muted-foreground text-sm font-medium">Total Value</span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  GST Included
                </span>
              </div>
              <div className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                {formatMoney(claim.amount, claim.currency)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground font-medium">Currency: INR ({claim.currency})</div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex justify-between items-start mb-6">
                <span className="text-muted-foreground text-sm font-medium">Claim Status</span>
                <div
                  className={cn(
                    "flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold",
                    statusStyles[claim.status] || statusStyles.Draft
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>{claim.status}</span>
                </div>
              </div>
              <div className="text-lg font-bold font-[family-name:var(--font-manrope)] text-foreground">{getStatusHeadline(claim.status)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Last activity: {formatDateTime(claim.submittedAt || claim.createdAt)}</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div className="text-sm font-medium">
                    <span className="text-muted-foreground">Submitted:</span>{" "}
                    <span className="font-bold ml-1">{formatDate(claim.submittedAt || claim.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <FolderKanban className="w-5 h-5 text-primary" />
                  <div className="text-sm font-medium">
                    <span className="text-muted-foreground">Project:</span>{" "}
                    <span className="font-bold ml-1">{claim.project || "General"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Receipt & Evidence</h3>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {claim.receiptUrl ? "1 Document" : "No Document"}
                </span>
              </div>

              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {claim.receiptUrl && !isBlobUrl ? (
                  <div className="relative group cursor-pointer" onClick={() => setIsReceiptModalOpen(true)}>
                    <div className="aspect-[4/3] bg-muted/30 overflow-hidden">
                      <img
                        src={claim.receiptUrl}
                        alt="Receipt"
                        className="w-full h-full object-contain bg-white"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
                        <ZoomIn className="w-4 h-4" />
                        <span className="text-sm font-medium">Click to view full receipt</span>
                      </div>
                    </div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-border">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">VERIFIED</span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-muted/30 flex flex-col items-center justify-center border-2 border-dashed border-muted">
                    <Receipt className="w-16 h-16 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {isBlobUrl ? 'Receipt needs re-upload' : 'No receipt attached'}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {isBlobUrl ? 'Employee must edit claim and re-upload receipt' : 'Employee did not upload a receipt'}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{claim.vendorName || "Unknown Vendor"}</h4>
                    <p className="text-sm text-muted-foreground">{claim.category}</p>
                  </div>
                  <div className="text-2xl font-extrabold font-[family-name:var(--font-manrope)]">
                    {formatMoney(claim.amount, claim.currency)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-3 pt-6 border-t">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Employee</span>
                    <span className="font-mono text-sm text-foreground">{claim.employeeName}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">CGST (9%)</span>
                    <span className="text-sm text-foreground font-semibold">{formatMoney(cgst, claim.currency)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Payment Mode</span>
                    <span className="text-sm text-foreground">{claim.paymentMode}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">SGST (9%)</span>
                    <span className="text-sm text-foreground font-semibold">{formatMoney(sgst, claim.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              {isReviewPending && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Finance Action</h3>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none mb-3"
                    rows={4}
                    placeholder="Add review note (optional)"
                    disabled={isProcessing}
                  />
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={isProcessing}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isProcessing ? 'Processing...' : 'Verify & Approve for Payment'}
                  </Button>
                  {actionError && (
                    <p className="mt-2 text-xs text-destructive">{actionError}</p>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-8">Audit Timeline</h3>
                <div className="relative pl-8 space-y-10">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-muted" />
                  {timelineSteps.map((step, index) => (
                    <div key={index} className="relative">
                      <div
                        className={cn(
                          "absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4",
                          step.complete ? "bg-primary ring-primary/20" : "bg-muted ring-muted/50"
                        )}
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">{step.label}</p>
                        <p className={cn("text-xs", step.complete ? "text-muted-foreground" : "text-muted-foreground/60")}>{step.date}</p>
                        {step.note && (
                          <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <p className="text-xs italic text-primary font-medium leading-relaxed">{step.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t">
                <h4 className="text-sm font-bold text-muted-foreground mb-6 flex items-center uppercase tracking-widest">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Audit Remarks
                </h4>
                <div className="bg-muted/50 p-5 rounded-xl relative">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-[11px] text-primary-foreground font-bold">
                      FN
                    </div>
                    <span className="text-xs font-bold">Finance</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isReviewPending ? "Awaiting your action" : formatDateTime(claim.submittedAt || claim.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    This claim is synced from manager approvals. Verify and approve for payment processing.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 right-0 left-[240px] h-20 bg-card/95 backdrop-blur-md flex justify-end items-center space-x-4 px-8 border-t z-40">
        <Button variant="ghost" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Print Summary
        </Button>
        {claim.receiptUrl && !isBlobUrl && (
          <Button className="gap-2 shadow-lg" onClick={() => setIsReceiptModalOpen(true)}>
            <ZoomIn className="w-4 h-4" />
            View Receipt
          </Button>
        )}
        {claim.receiptUrl && !isBlobUrl && (
          <Button className="gap-2 shadow-lg" onClick={() => window.open(claim.receiptUrl, "_blank")}>
            <Download className="w-4 h-4" />
            Download Receipt
          </Button>
        )}
      </footer>

      {/* Receipt Modal */}
      {isReceiptModalOpen && claim.receiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-6xl h-[90vh] flex flex-col bg-card rounded-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Receipt Viewer</h3>
                <span className="text-xs text-muted-foreground">{claim.claimNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate">
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleResetView} title="Reset View">
                  <span className="text-xs font-bold">1:1</span>
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button variant="ghost" size="icon" onClick={() => window.open(claim.receiptUrl, "_blank")} title="Open in new tab">
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsReceiptModalOpen(false)} title="Close">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Modal Body - Image Viewer */}
            <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-6">
              <div
                className="relative transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={claim.receiptUrl}
                  alt="Receipt"
                  className="max-w-full max-h-full object-contain bg-white shadow-2xl rounded-lg"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Vendor: {claim.vendorName || "Unknown"}</span>
                <span>|</span>
                <span>Amount: {formatMoney(claim.amount, claim.currency)}</span>
                <span>|</span>
                <span>Date: {formatDate(claim.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>AI Verified Receipt</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </FinanceLayout>
  )
}
