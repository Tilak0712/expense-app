"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ManagerLayout } from "@/components/manager/manager-layout"
import { 
  AuthRequiredError,
  fetchClaimById,
  createManagerClaim,
  type CreateClaimInput
} from "@/lib/manager/manager-supabase-data"
import { performOCR, preloadOCRWorker } from "@/lib/ocr"
import { 
  Upload,
  ScanText,
  Sparkles,
  FolderKanban,
  Plus,
  Loader2,
  FileEdit,
  CreditCard,
  Save,
  Send
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const categories = [
  'Hotel & Lodging',
  'Travel & Transport',
  'Meals & Entertainment',
  'Office Supplies',
  'Fuel',
]

const paymentModes = ['Corporate Card', 'Personal Card', 'Cash', 'UPI']
const currencies = [
  { value: 'INR', label: 'INR (Indian Rupee)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
]

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
  }
  const symbol = symbols[currency] || currency
  return `${symbol}${amount.toLocaleString()}`
}

function CreateClaimInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editClaimId = searchParams.get('edit')
  const isEditMode = Boolean(editClaimId)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocrAmount, setOcrAmount] = useState<string | null>(null)
  const [showAmountWarning, setShowAmountWarning] = useState(false)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    vendorName: '',
    date: getTodayDate(),
    amount: '',
    category: categories[0],
    paymentMode: paymentModes[0],
    currency: 'INR',
    description: '',
    city: '',
    gstin: '',
    projectName: 'General',
    projectDetails: 'Default internal expense allocation',
  })

  const previewAmount = useMemo(() => {
    const parsed = Number.parseFloat(formData.amount)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return 4200
  }, [formData.amount])

  // Preload OCR worker on component mount to avoid timeout on first upload
  useEffect(() => {
    preloadOCRWorker().catch(console.error)
  }, [])

  useEffect(() => {
    if (!editClaimId) {
      return
    }

    const loadClaim = async () => {
      try {
        setIsLoading(true)
        const claim = await fetchClaimById(editClaimId)
        if (!claim) {
          setError('Claim not found')
          return
        }
        setFormData({
          vendorName: claim.vendorName,
          date: claim.date,
          amount: claim.amount.toString(),
          category: claim.category,
          paymentMode: claim.paymentMode,
          currency: claim.currency,
          description: claim.description,
          city: claim.city || '',
          gstin: '',
          projectName: 'General',
          projectDetails: 'Default internal expense allocation',
        })
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          setAuthRequired(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load claim')
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadClaim()
  }, [editClaimId])

  // Redirect to login if auth required
  useEffect(() => {
    if (authRequired && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authRequired])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsScanning(true)
      setScanProgress(0)
      // Create object URL for preview
      const imageUrl = URL.createObjectURL(file)
      setReceiptImage(imageUrl)
      
      try {
        // Perform real OCR on the receipt image with progress callback
        const ocrResult = await performOCR(file, (progress) => {
          setScanProgress(progress)
        })
        
        // Update form with extracted data
        setFormData({
          ...formData,
          vendorName: ocrResult.vendorName || formData.vendorName,
          date: ocrResult.date ? ocrResult.date.replace(/\//g, '-') : formData.date,
          amount: ocrResult.amount || formData.amount,
          category: ocrResult.amount && parseFloat(ocrResult.amount) > 1000 ? 'Hotel & Lodging' : formData.category,
          city: formData.city
        })
        
        // Store OCR amount for validation
        if (ocrResult.amount) {
          setOcrAmount(ocrResult.amount)
        }
        
        console.log('OCR Result:', ocrResult)
      } catch (error) {
        console.error('OCR failed:', error)
        // Fallback to manual entry if OCR fails
        setError(error instanceof Error ? error.message : 'OCR failed - Please enter details manually')
      } finally {
        setIsScanning(false)
        setScanProgress(0)
      }
    }
  }

  const handleSubmit = async (isDraft: boolean = false) => {
    // Strict validation against OCR amount if available
    if (ocrAmount && formData.amount) {
      const ocrValue = Number.parseFloat(ocrAmount)
      const enteredValue = Number.parseFloat(formData.amount)
      const difference = Math.abs(enteredValue - ocrValue)
      
      // Allow only 1% tolerance for OCR rounding errors
      const percentageDiff = (difference / ocrValue) * 100

      if (percentageDiff > 1) {
        alert(`Amount mismatch! Receipt shows ₹${ocrAmount}, but you entered ₹${formData.amount}. You must enter the exact amount from the receipt.`)
        return
      }
    }
    
    try {
      setIsSaving(true)
      
      const input: CreateClaimInput = {
        vendorName: formData.vendorName,
        expenseDate: formData.date,
        amount: parseFloat(formData.amount) || 0,
        currency: formData.currency,
        category: formData.category,
        paymentMode: formData.paymentMode,
        description: formData.description,
        city: formData.city,
        gstin: formData.gstin,
        status: isDraft ? 'draft' : 'submitted'
      }
      
      await createManagerClaim(input)
      
      alert(isEditMode ? 'Claim updated successfully!' : (isDraft ? 'Draft saved successfully!' : 'Claim submitted successfully!'))
      router.push(isEditMode ? '/manager/approvals' : '/manager/claims')
    } catch (err) {
      console.error('Failed to save claim:', err)
      alert(err instanceof Error ? err.message : 'Failed to save claim')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void handleSubmit(false)
  }

  return (
    <ManagerLayout>
      <div className="min-h-screen flex flex-col">
        {/* Page Title */}
        <div className="px-6 py-4 bg-card border-b border-border">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
            {isEditMode ? 'Edit Expense Claim' : 'Create Expense Claim'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditMode
              ? 'Update claim details before resubmitting for approval'
              : 'Submit your expenses for reimbursement with AI-powered receipt scanning'}
          </p>
        </div>

        <section className="flex-1 flex p-4 gap-4 overflow-hidden">
          {/* Left Panel: Form */}
          <div className="w-[45%] overflow-y-auto space-y-3">
            {/* OCR Upload Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ScanText className="w-5 h-5 text-primary" />
                  Receipt Scan (OCR)
                </CardTitle>
                <span className="text-[10px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Powered
                </span>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <input
                    ref={useRef<HTMLInputElement>(null)}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isScanning}
                  />
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all group ${isScanning ? 'border-primary bg-primary/5' : 'border-border hover:border-primary hover:bg-primary/5'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isScanning ? 'bg-primary/20 animate-pulse' : 'bg-primary/10 group-hover:bg-primary/20'}`}>
                      {isScanning ? (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    {isScanning ? (
                      <>
                        <p className="text-sm font-semibold text-primary mb-1">Scanning receipt... {scanProgress}%</p>
                        <p className="text-xs text-muted-foreground">Extracting fields from document</p>
                        <div className="w-full bg-secondary rounded-full h-2 mt-3 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-300 ease-out"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground mb-1">Upload receipt image</p>
                        <p className="text-xs text-muted-foreground">Drag and drop or click to browse</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-2">Supports: JPG, PNG, PDF - Max 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Details Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-primary" />
                    Expense Details
                  </CardTitle>
                  <span className="text-[10px] font-bold text-muted-foreground px-2 py-1 bg-muted rounded uppercase tracking-wider">
                    Manual Entry
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Vendor Name</Label>
                      <Input
                        placeholder="Enter vendor name"
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Amount</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="font-bold"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Payment Mode</Label>
                      <Select value={formData.paymentMode} onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentModes.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Currency</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((curr) => (
                            <SelectItem key={curr.value} value={curr.value}>
                              {curr.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Description</Label>
                    <Textarea
                      placeholder="Enter expense description..."
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">City</Label>
                      <Input
                        placeholder="Enter city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">GSTIN (Optional)</Label>
                      <Input
                        placeholder="27AABCU9603R1ZM"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Project Attribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Project Name</Label>
                      <Input
                        placeholder="Enter project name"
                        value={formData.projectName}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Project Details</Label>
                      <Input
                        placeholder="Enter project details"
                        value={formData.projectDetails}
                        onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="w-full py-6 border-dashed border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
                type="button"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Another Line Item
              </Button>

              {/* Error Display */}
              {error && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4 text-sm">
                    {error}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  type="button"
                  onClick={() => void handleSubmit(true)}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save as Draft
                </Button>
                <Button
                  className="flex-1 gap-2 shadow-lg"
                  type="submit"
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Claim
                </Button>
              </div>
            </form>
          </div>

          {/* Right Panel: OCR Preview */}
          <div className="w-[55%] flex flex-col gap-3">
            <div className="flex-1 bg-muted/30 rounded-xl relative overflow-hidden border shadow-inner min-h-[600px]">
              {isScanning && (
                <div className="absolute inset-0 overflow-hidden z-10">
                  <div
                    className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-lg shadow-primary animate-pulse"
                    style={{
                      animation: 'scan 2.5s ease-in-out infinite',
                    }}
                  />
                </div>
              )}

              {receiptImage ? (
                <div className="w-full h-full p-4 flex items-center justify-center">
                  <img 
                    src={receiptImage} 
                    alt="Uploaded receipt" 
                    className="w-full h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="relative w-full h-full bg-card shadow-2xl rounded-lg p-8 flex flex-col gap-6 transform rotate-1 scale-[0.98] hover:rotate-0 hover:scale-100 transition-transform">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <h1 className="font-[family-name:var(--font-manrope)] font-extrabold text-3xl tracking-tight text-foreground">
                          {formData.vendorName || 'STAR HOTELS'}
                        </h1>
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">
                          Premium Hospitality Group
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground font-medium">
                        <p className="mb-1">INV #2026-8812</p>
                        <p>DATE: {formData.date || '12/03/2026'}</p>
                      </div>
                    </div>
                    
                    <div className="border-y border-dashed border-border py-4 flex flex-col gap-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Deluxe Suite - 1 Night</span>
                        <span className="font-mono font-semibold">{formatCurrency(previewAmount * 0.86, formData.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Breakfast Buffet</span>
                        <span className="font-mono font-semibold">{formatCurrency(previewAmount * 0.14, formData.currency)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">TOTAL</span>
                      <span className="font-black text-2xl text-primary">
                        {formatCurrency(previewAmount, formData.currency)}
                      </span>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-dashed border-border text-center">
                      <p className="text-[10px] text-muted-foreground">Thank you for your stay!</p>
                      <p className="text-[9px] text-muted-foreground/70 mt-1">{formData.city || 'Mumbai'} - {formData.gstin || 'GSTIN: 27AAACC1234D1ZM'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </ManagerLayout>
  )
}

export default function CreateClaimPage() {
  // `useSearchParams()` must be inside a Suspense boundary to avoid build-time CSR bailout errors.
  return (
    <Suspense
      fallback={
        <ManagerLayout title="Create Claim">
          <div className="p-8 text-sm text-muted-foreground">Loading...</div>
        </ManagerLayout>
      }
    >
      <CreateClaimInner />
    </Suspense>
  )
}
