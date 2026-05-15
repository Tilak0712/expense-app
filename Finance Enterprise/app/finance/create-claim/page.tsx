'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ScanLine,
  Upload,
  FileEdit,
  CreditCard,
  Folder,
  PlusCircle,
  Sparkles,
  Save,
  Send,
  Loader2,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { performOCR, preloadOCRWorker } from '@/lib/ocr'

type ClaimFormState = {
  vendorName: string
  expenseDate: string
  amount: string
  category: string
  paymentMode: string
  currency: string
  description: string
  city: string
  gstin: string
  projectName: string
  projectDetails: string
  receiptFile: File | null
}

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

export default function CreateClaimPage() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [ocrAmount, setOcrAmount] = useState<string | null>(null)
  const [showAmountWarning, setShowAmountWarning] = useState(false)

  // Preload OCR worker on component mount to avoid timeout on first upload
  useEffect(() => {
    preloadOCRWorker().catch(console.error)
  }, [])

  const [formData, setFormData] = useState<ClaimFormState>({
    vendorName: '',
    expenseDate: getTodayDate(),
    amount: '',
    category: 'Hotel & Lodging',
    paymentMode: 'Corporate Card',
    currency: 'INR',
    description: '',
    city: '',
    gstin: '',
    projectName: 'General',
    projectDetails: 'Default internal expense allocation',
    receiptFile: null,
  })

  const previewAmount = useMemo(() => {
    const parsed = Number.parseFloat(formData.amount)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return 4200
  }, [formData.amount])

  const updateField = <K extends keyof ClaimFormState>(field: K, value: ClaimFormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsScanning(true)
      setScanProgress(0)
      // Create object URL for preview
      const imageUrl = URL.createObjectURL(file)
      setReceiptImage(imageUrl)
      
      // Store the file object for upload
      setFormData((prev) => ({
        ...prev,
        receiptFile: file,
      }))
      
      try {
        // Perform real OCR on the receipt image with progress callback
        const ocrResult = await performOCR(file, (progress) => {
          setScanProgress(progress)
        })
        
        // Update form with extracted data
        setFormData((prev) => ({
          ...prev,
          vendorName: ocrResult.vendorName || prev.vendorName,
          amount: ocrResult.amount || prev.amount,
          expenseDate: ocrResult.date ? ocrResult.date.replace(/\//g, '-') : prev.expenseDate,
          description: prev.description || `Receipt scanned via OCR - Confidence: ${Math.round(ocrResult.confidence)}%`,
        }))
        
        // Store OCR amount for validation
        if (ocrResult.amount) {
          setOcrAmount(ocrResult.amount)
        }
        
        console.log('OCR Result:', ocrResult)
      } catch (error) {
        console.error('OCR failed:', error)
        // Fallback to manual entry if OCR fails
        setSubmitError(error instanceof Error ? error.message : 'OCR failed - Please enter details manually')
      } finally {
        setIsScanning(false)
        setScanProgress(0)
      }
    }
  }

  const handleAddLineItem = () => {
    alert('Add Another Line Item functionality - multiple line items would be added here')
  }

  const validateForm = () => {
    if (!formData.vendorName.trim()) return 'Vendor name is required.'
    if (!formData.expenseDate) return 'Expense date is required.'

    const amount = Number.parseFloat(formData.amount)
    if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid amount greater than 0.'

    if (!formData.description.trim()) return 'Description is required.'

    // Strict validation against OCR amount if available
    if (ocrAmount && formData.amount) {
      const ocrValue = Number.parseFloat(ocrAmount)
      const enteredValue = amount
      const difference = Math.abs(enteredValue - ocrValue)
      
      // Allow only 1% tolerance for OCR rounding errors
      const percentageDiff = (difference / ocrValue) * 100

      if (percentageDiff > 1) {
        setShowAmountWarning(true)
        return `Amount mismatch! Receipt shows ₹${ocrAmount}, but you entered ₹${formData.amount}. You must enter the exact amount from the receipt.`
      }
    }

    return null
  }

  const handleSubmit = async (isDraft: boolean) => {
    setSubmitError(null)
    setSubmitSuccess(null)

    const validationError = validateForm()
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    const amount = Number.parseFloat(formData.amount)

    try {
      setIsSubmitting(true)

      let receiptUrl: string | undefined = undefined
      
      // Upload file to Supabase Storage if present
      if (formData.receiptFile) {
        const supabase = getSupabaseBrowserClient()
        
        const fileName = `${Date.now()}-${formData.receiptFile.name}`
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('receipts')
          .upload(fileName, formData.receiptFile)
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          // Continue without receipt if upload fails
        } else {
          const { data: publicUrlData } = supabase
            .storage
            .from('receipts')
            .getPublicUrl(fileName)
          receiptUrl = publicUrlData.publicUrl
        }
      }

      // Create claim in database
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSubmitError('You must be signed in to create a claim.')
        return
      }

      const { error: insertError } = await supabase
        .from('claims')
        .insert({
          user_id: user.id,
          vendor_name: formData.vendorName,
          expense_date: formData.expenseDate,
          amount,
          category: formData.category,
          payment_mode: formData.paymentMode,
          currency: formData.currency,
          description: formData.description,
          city: formData.city,
          gstin: formData.gstin,
          project_name: formData.projectName,
          status: isDraft ? 'Draft' : 'Submitted',
          receipt_url: receiptUrl,
        })

      if (insertError) {
        throw insertError
      }

      setSubmitSuccess(
        isDraft
          ? 'Draft saved successfully.'
          : 'Claim submitted successfully.'
      )

      router.push(isDraft ? '/finance/dashboard' : '/finance/dashboard')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save claim right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-[240px] pt-12 min-h-screen">
        <div className="px-6 py-4 bg-card border-b">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
            Create Expense Claim
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit your expenses for reimbursement with OCR-assisted entry.
          </p>
        </div>

        <div className="px-6 pt-4 space-y-3">
          {(submitError || submitSuccess) && (
            <Card className={cn('border', submitSuccess ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50')}>
              <CardContent className="p-4 text-sm">
                {submitSuccess || submitError}
              </CardContent>
            </Card>
          )}
        </div>

        <section className="flex-1 flex p-4 gap-4 overflow-hidden">
          <div className="w-[45%] overflow-y-auto space-y-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-primary" />
                  Receipt Scan (OCR)
                </CardTitle>
                <span className="text-[10px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Powered
                </span>
              </CardHeader>
              <CardContent>
                <div
                  onClick={handleFileUploadClick}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all group',
                    isScanning
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                  />
                  <div
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors',
                      isScanning
                        ? 'bg-primary/20 animate-pulse'
                        : 'bg-primary/10 group-hover:bg-primary/20'
                    )}
                  >
                    <Upload className="w-8 h-8 text-primary" />
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
                      <p className="text-sm font-semibold text-foreground mb-1">
                        Upload receipt image
                      </p>
                      <p className="text-xs text-muted-foreground">Drag and drop or click to browse</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-2">
                        Supports: JPG, PNG, PDF - Max 10MB
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

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
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Vendor Name
                    </Label>
                    <Input
                      placeholder="Enter vendor name"
                      value={formData.vendorName}
                      onChange={(e) => updateField('vendorName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => updateField('expenseDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Amount
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="font-bold"
                      value={formData.amount}
                      onChange={(e) => updateField('amount', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Category
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
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
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Payment Mode
                    </Label>
                    <Select value={formData.paymentMode} onValueChange={(value) => updateField('paymentMode', value)}>
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
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Currency
                    </Label>
                    <Select value={formData.currency} onValueChange={(value) => updateField('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Description
                  </Label>
                  <Textarea
                    placeholder="Enter expense description..."
                    rows={2}
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      City
                    </Label>
                    <Input
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      GSTIN (Optional)
                    </Label>
                    <Input
                      placeholder="27AABCU9603R1ZM"
                      value={formData.gstin}
                      onChange={(e) => updateField('gstin', e.target.value)}
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
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Project Name
                    </Label>
                    <Input
                      placeholder="Enter project name"
                      value={formData.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Project Details
                    </Label>
                    <Input
                      placeholder="Enter project details"
                      value={formData.projectDetails}
                      onChange={(e) => updateField('projectDetails', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full py-6 border-dashed border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
              onClick={handleAddLineItem}
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add Another Line Item
            </Button>
          </div>

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
                        <p>DATE: {formData.expenseDate || '2026-03-12'}</p>
                      </div>
                    </div>

                    <div className="border-y border-dashed border-border/60 py-6 flex flex-col gap-4">
                      <div className="flex justify-between text-base">
                        <span className="text-muted-foreground">Primary Expense</span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(previewAmount * 0.86, formData.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base">
                        <span className="text-muted-foreground">Tax and service fees</span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(previewAmount * 0.14, formData.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <span className="text-2xl font-bold">TOTAL</span>
                      <span className="text-4xl font-extrabold font-[family-name:var(--font-manrope)]">
                        {formatCurrency(previewAmount, formData.currency)}
                      </span>
                    </div>

                    <div className="mt-auto pt-6 border-t border-dashed border-border/60">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            GSTIN
                          </p>
                          <p className="font-mono">{formData.gstin || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            PAYMENT
                          </p>
                          <p>{formData.paymentMode}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => void handleSubmit(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save as Draft
              </Button>
              <Button
                className="flex-1 gap-2 shadow-lg"
                onClick={() => void handleSubmit(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Claim
              </Button>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%,
          100% {
            top: 5%;
          }
          50% {
            top: 95%;
          }
        }
      `}</style>
    </div>
  )
}
