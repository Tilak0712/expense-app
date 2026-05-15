"use client"

import { useState, useEffect } from "react"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Wallet, 
  ShieldCheck, 
  X,
  QrCode,
  Building2,
  Banknote,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Loader2
} from "lucide-react"
import { 
  fetchReadyForPayment,
  fetchClaimById,
  markClaimAsPaid,
  type FinanceClaim,
  AuthRequiredError
} from "@/lib/dashboard/finance-supabase-data"

export default function PaymentsPage() {
  const [claimIdFromQuery, setClaimIdFromQuery] = useState<string | null>(null)
  const [claims, setClaims] = useState<FinanceClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<FinanceClaim | null>(null)
  const [paymentMode, setPaymentMode] = useState<"upi" | "bank" | "cash">("bank")

  useEffect(() => {
    loadPaymentsData()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setClaimIdFromQuery(params.get("claimId"))
  }, [])

  useEffect(() => {
    if (!claimIdFromQuery || loading) return

    let active = true

    const ensureRedirectedClaimInList = async () => {
      const matchedClaim = claims.find((claim) => claim.id === claimIdFromQuery)
      if (matchedClaim) {
        return
      }

      try {
        const fetchedClaim = await fetchClaimById(claimIdFromQuery)
        if (!active) return
        setClaims((prev) => (prev.some((claim) => claim.id === fetchedClaim.id) ? prev : [fetchedClaim, ...prev]))
      } catch (err) {
        console.error("Unable to load redirected claim for payment:", err)
      }
    }

    void ensureRedirectedClaimInList()

    return () => {
      active = false
    }
  }, [claimIdFromQuery, claims, loading])

  const loadPaymentsData = async () => {
    try {
      const data = await fetchReadyForPayment()
      setClaims(data)
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuthRequired(true)
      } else {
        console.error('Failed to load payments data:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const openPaymentModal = (payment: FinanceClaim) => {
    setSelectedPayment(payment)
    setShowModal(true)
  }

  const handleProcessPayment = async (claimId: string) => {
    try {
      // Map payment mode from UI to database values
      const modeMap: Record<"upi" | "bank" | "cash", string> = {
        upi: "UPI",
        bank: "NEFT",
        cash: "Cash"
      }
      const financePaymentMode = modeMap[paymentMode]
      await markClaimAsPaid(claimId, financePaymentMode)
      await loadPaymentsData()
      setShowModal(false)
    } catch (err) {
      console.error('Failed to process payment:', err)
    }
  }

  const totalPayable = claims.reduce((acc, p) => acc + p.amount, 0)

  if (authRequired) {
    return (
      <FinanceLayout title="Payment Processing">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (loading) {
    return (
      <FinanceLayout title="Payment Processing">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Payment Processing">
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground mb-1">Payment Processing</h1>
            <p className="text-muted-foreground">Process verified claims and manage fund disbursements</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              Today
            </Button>
            <Button size="sm" className="gap-2 text-xs bg-primary">
              <Wallet className="w-3.5 h-3.5" />
              Batch Process
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-primary">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Ready</span>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                {claims.length}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Pending Payments</p>
            </div>
          </div>

          <div className="bg-secondary p-6 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-muted rounded-lg">
                <Wallet className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                INR {(totalPayable / 100000).toFixed(1)}L
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Total Payable</p>
            </div>
          </div>

          <div className="bg-secondary p-6 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">+8</span>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                24
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Processed Today</p>
            </div>
          </div>

          <div className="bg-secondary p-6 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground">
                INR 18.5K
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Avg. Disbursement</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Payments Table */}
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Pending Reimbursements</h3>
                <Badge variant="secondary" className="text-xs ml-2">{claims.length} claims</Badge>
              </div>
              <div className="text-sm font-bold text-foreground">
                Total: INR {totalPayable.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Claim</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {claims.map((claim, idx) => {
                    const initials = claim.employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <tr key={claim.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx % 2 === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{claim.employeeName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{claim.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-muted-foreground font-mono">{claim.claimNumber}</p>
                          <p className="text-xs text-muted-foreground">{claim.category}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-bold text-foreground">
                            INR {claim.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {claim.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="sm" 
                              className="h-8 text-xs bg-primary"
                              onClick={() => openPaymentModal(claim)}
                            >
                              Pay Now
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {claims.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                        No pending payments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Security Card */}
          <div className="bg-gradient-to-br from-primary to-indigo-600 p-6 rounded-2xl text-primary-foreground shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)]">Secure Treasury Protocol</h3>
            </div>
            <p className="text-xs text-primary-foreground/80 mb-6 leading-relaxed">
              All transactions are encrypted with 256-bit AES protocol and require multi-factor authentication. Payment confirmations are sent instantly to beneficiaries.
            </p>
            <div className="bg-primary-foreground/10 backdrop-blur-xl rounded-lg p-4 border border-primary-foreground/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
                <span className="text-xs font-medium">Security Status: Active</span>
              </div>
              <div className="space-y-2 text-xs text-primary-foreground/70">
                <div className="flex justify-between">
                  <span>Encryption</span>
                  <span className="text-primary-foreground">AES-256</span>
                </div>
                <div className="flex justify-between">
                  <span>Auth Level</span>
                  <span className="text-primary-foreground">Tier 1</span>
                </div>
                <div className="flex justify-between">
                  <span>Session</span>
                  <span className="text-primary-foreground">Valid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-2xl overflow-hidden border border-border">
            {/* Modal Header */}
            <div className="bg-sidebar px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h3 className="text-sm font-semibold">Process Payment</h3>
                <p className="text-xs text-sidebar-foreground/70">Transaction ID: TXN-{Date.now().toString().slice(-8)}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="hover:bg-white/10 p-1.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Payment Summary */}
              <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-xs text-muted-foreground">Payee</span>
                  <p className="text-sm font-bold text-foreground">{selectedPayment.employeeName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedPayment.employeeId}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <p className="text-lg font-bold text-primary">
                    INR {selectedPayment.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Payment Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "upi", icon: QrCode, label: "UPI" },
                    { id: "bank", icon: Building2, label: "NEFT/RTGS" },
                    { id: "cash", icon: Banknote, label: "Cash" },
                  ].map((mode) => (
                    <label key={mode.id} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value={mode.id}
                        checked={paymentMode === mode.id}
                        onChange={() => setPaymentMode(mode.id as "upi" | "bank" | "cash")}
                        className="peer sr-only"
                      />
                      <div className="bg-muted peer-checked:bg-primary/20 peer-checked:border-primary border-2 border-transparent p-3 rounded-lg text-center transition-all">
                        <mode.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground peer-checked:text-primary" />
                        <span className="text-xs font-medium">{mode.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* UTR Number */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  UTR Number / Transaction ID <span className="text-destructive">*</span>
                </Label>
                <Input 
                  placeholder="Enter unique transaction reference"
                  className="h-10 bg-muted border-none text-sm"
                  required
                />
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Payment Date</Label>
                <Input 
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="h-10 bg-muted border-none text-sm"
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="button"
                onClick={() => handleProcessPayment(selectedPayment.id)}
                className="w-full h-10 bg-primary text-sm font-semibold"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Confirm Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </FinanceLayout>
  )
}
