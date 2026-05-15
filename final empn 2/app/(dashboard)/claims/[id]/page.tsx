'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Calendar,
  Folder,
  Shield,
  ZoomIn,
  Download,
  Printer,
  CheckCircle,
  Clock,
  MessageSquare,
  Loader2,
  Receipt,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchClaimById, type DashboardClaim } from '@/lib/dashboard/supabase-data'

const statusStyles: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Submitted: 'bg-amber-100 text-amber-700',
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Paid: 'bg-blue-100 text-blue-700',
}

function formatDate(value?: string) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(value?: string) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString(
    'en-IN',
    { hour: 'numeric', minute: '2-digit' }
  )}`
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'inr' || currency === 'INR' || currency === '₹' ? '₹' : currency === 'usd' ? '$' : currency
  return `${symbol}${amount.toLocaleString('en-IN')}`
}

function getStatusHeadline(status: string) {
  if (status === 'Approved') return 'Manager Approved'
  if (status === 'Pending') return 'Awaiting Approval'
  if (status === 'Submitted') return 'Under Review'
  if (status === 'Rejected') return 'Claim Rejected'
  if (status === 'Paid') return 'Payment Processed'
  return 'Draft Saved'
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [claim, setClaim] = useState<DashboardClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchClaimById(id)
        if (!active) return
        setClaim(data)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load claim')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [id])

  const timelineSteps = useMemo(() => {
    if (!claim) return []

    const managerDone = claim.status === 'Approved' || claim.status === 'Rejected' || claim.status === 'Paid'
    const financeDone = claim.status === 'Paid'

    return [
      {
        label: 'Created',
        date: formatDateTime(claim.createdAt),
        complete: true,
      },
      {
        label: 'Submitted',
        date: claim.submittedAt ? formatDateTime(claim.submittedAt) : 'Pending submission',
        complete: Boolean(claim.submittedAt),
      },
      {
        label: 'Manager Approval',
        date: managerDone ? formatDateTime(claim.createdAt) : 'Pending',
        complete: managerDone,
        note: claim.status === 'Approved' ? 'Approved by manager after review.' : undefined,
      },
      {
        label: 'Finance Verification',
        date: financeDone ? formatDateTime(claim.createdAt) : 'Pending',
        complete: financeDone,
      },
    ]
  }, [claim])

  if (loading) {
    return (
      <DashboardLayout title="Claim Detail" showSearch={false}>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !claim) {
    return (
      <DashboardLayout title="Claim Detail" showSearch={false}>
        <div className="p-8">
          <Card className="p-12 text-center">
            <h2 className="text-xl font-bold mb-2">Claim Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || 'The claim you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/claims')}>Back to Claims</Button>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const cgst = Math.round(claim.amount * 0.09)
  const sgst = Math.round(claim.amount * 0.09)

  return (
    <DashboardLayout title="Claim Detail" showSearch={false}>
      <div className="pb-24 min-h-screen">
        <section className="px-12 py-8 flex items-center justify-between">
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

        <div className="px-12 space-y-8 max-w-[1400px]">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-8">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-muted-foreground text-sm font-medium">Claim Status</span>
                  <div
                    className={cn(
                      'flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold',
                      statusStyles[claim.status] || statusStyles.Draft
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{claim.status}</span>
                  </div>
                </div>
                <div className="text-lg font-bold font-[family-name:var(--font-manrope)] text-foreground">{getStatusHeadline(claim.status)}</div>
                <p className="mt-1 text-xs text-muted-foreground">Last activity: {formatDateTime(claim.submittedAt || claim.createdAt)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 flex flex-col justify-between h-full">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div className="text-sm font-medium">
                      <span className="text-muted-foreground">Submitted:</span>{' '}
                      <span className="font-bold ml-1">{formatDate(claim.submittedAt || claim.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Folder className="w-5 h-5 text-primary" />
                    <div className="text-sm font-medium">
                      <span className="text-muted-foreground">Project:</span>{' '}
                      <span className="font-bold ml-1">{claim.project || 'General'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Evidence Section</h3>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {claim.receiptUrl ? '1 Item Attached' : '0 Item Attached'}
                </span>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div 
                      className="w-40 h-52 bg-gradient-to-br from-muted to-muted/50 rounded-lg overflow-hidden relative group cursor-pointer flex items-center justify-center"
                      onClick={() => claim.receiptUrl && setIsReceiptModalOpen(true)}
                    >
                      {claim.receiptUrl ? (
                        <img src={claim.receiptUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Receipt className="w-10 h-10 mx-auto text-muted-foreground" />
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-2">No Receipt</p>
                        </div>
                      )}
                      {claim.receiptUrl && (
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-8 h-8 text-primary" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center space-x-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-emerald-700 border border-emerald-100">
                        <CheckCircle className="w-3 h-3" />
                        <span>{claim.receiptUrl ? 'AI VERIFIED' : 'MISSING'}</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h4 className="font-bold text-lg text-foreground">{claim.vendorName || 'Unknown Vendor'}</h4>
                          <p className="text-sm text-muted-foreground">{claim.category}</p>
                        </div>
                        <div className="text-2xl font-extrabold font-[family-name:var(--font-manrope)]">
                          {formatMoney(claim.amount, claim.currency)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 pt-6 border-t">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">GSTIN</span>
                          <span className="font-mono text-sm text-foreground">N/A</span>
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
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-10">
              <div>
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-8">Audit Timeline</h3>
                <div className="relative pl-8 space-y-10">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-muted" />

                  {timelineSteps.map((step, index) => (
                    <div key={index} className="relative">
                      <div
                        className={cn(
                          'absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4',
                          step.complete ? 'bg-primary ring-primary/20' : 'bg-muted ring-muted/50'
                        )}
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">{step.label}</p>
                        <p className={cn('text-xs', step.complete ? 'text-muted-foreground' : 'text-muted-foreground/60')}>{step.date}</p>
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
                      SYS
                    </div>
                    <span className="text-xs font-bold">System</span>
                    <span className="text-[10px] text-muted-foreground">{formatDateTime(claim.submittedAt || claim.createdAt)}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    Claim synchronized from live records. Status and timeline reflect your current workflow stage.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 right-0 left-[240px] h-20 bg-card/95 backdrop-blur-md flex justify-end items-center space-x-4 px-12 border-t z-40">
        <Button variant="ghost" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Print Summary
        </Button>
        <Button className="gap-2 shadow-lg" onClick={() => (claim.receiptUrl ? window.open(claim.receiptUrl, '_blank') : undefined)}>
          <Download className="w-4 h-4" />
          Download PDF Report
        </Button>
      </footer>

      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Receipt</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsReceiptModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            {claim?.receiptUrl && (
              <img src={claim.receiptUrl} alt="Receipt" className="max-w-full max-h-[70vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
