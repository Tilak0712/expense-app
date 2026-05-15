import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getSessionFromStorage, validateSession, redirectToLogin } from '@/lib/auth/session-manager'

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required')
    this.name = 'AuthRequiredError'
  }
}

// Types
export interface FinanceClaim {
  id: string
  claimNumber: string
  employeeId: string
  employeeName: string
  category: string
  amount: number
  currency: string
  status: 'Draft' | 'Submitted' | 'Pending' | 'Approved' | 'PaymentProcessing' | 'FinanceApproved' | 'Rejected' | 'Paid'
  description: string
  date: string
  createdAt: string
  submittedAt?: string
  paymentMode: string
  financePaymentMode?: string
  project: string
  vendorName: string
  city?: string
  receiptUrl?: string
  managerId?: string
  approvedBy?: string
}

export interface FinanceProfile {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: string
  avatar: string
  joinDate: string
}

export interface FinanceDashboardStats {
  pendingVerification: number
  pendingPayments: number
  processedThisMonth: number
  totalPaidAmount: number
  claimsCompleted: number
  totalPendingAmount: number
  avgProcessingTime: number
  approvalRate: number
  activeClaimants: number
}

export interface CreateClaimInput {
  vendorName: string
  expenseDate: string
  amount: number
  currency: string
  category: string
  paymentMode: string
  description: string
  city?: string
  gstin?: string
  projectName?: string
  status: 'draft' | 'submitted'
}

// Database interfaces
interface DbClaim {
  id: string
  claim_number: string | null
  employee_id: string
  manager_id: string | null
  vendor_name: string
  expense_date: string
  amount: number
  currency: string
  category: string
  payment_mode: string
  finance_payment_mode: string | null
  description: string
  city: string | null
  gstin: string | null
  project_name: string | null
  project_details: string | null
  receipt_url: string | null
  policy_flags: any
  clarification_notes: string | null
  approval_tier: number | null
  status: 'Draft' | 'Submitted' | 'Pending' | 'Approved' | 'PaymentProcessing' | 'FinanceApproved' | 'Rejected' | 'Paid'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

interface DbProfile {
  id: string
  user_id: string
  employee_id: string
  full_name: string
  email: string
  phone?: string | null
  manager_name?: string | null
  role: string
  department: string
  designation: string
  location: string
  created_at: string
  updated_at: string
}

// Mapping functions
function mapClaim(data: DbClaim): FinanceClaim {
  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
  const finalAmount = isNaN(amount) ? 0 : amount
  const currencyCode = (data.currency || 'INR').toUpperCase()
  
  return {
    id: data.id,
    claimNumber: data.claim_number || data.id.slice(0, 8).toUpperCase(),
    employeeId: data.employee_id,
    employeeName: 'Unknown',
    category: data.category,
    amount: finalAmount,
    currency: currencyCode,
    status: data.status,
    description: data.description,
    date: data.expense_date,
    createdAt: data.created_at,
    submittedAt: data.submitted_at || undefined,
    paymentMode: data.payment_mode,
    financePaymentMode: data.finance_payment_mode || undefined,
    project: data.project_name || 'General',
    vendorName: data.vendor_name,
    city: data.city || undefined,
    receiptUrl: data.receipt_url || undefined,
    managerId: data.manager_id || undefined,
    approvedBy: data.approved_by || undefined,
  }
}

interface TeamDirectoryRow {
  employee_user_id: string | null
  employee_id: string | null
  employee_name: string | null
}

type EmployeeLookup = Map<string, { employeeId: string; employeeName: string }>

function applyEmployeeLookup(
  claim: FinanceClaim,
  claimEmployeeKey: string,
  lookup: EmployeeLookup
): FinanceClaim {
  const match = lookup.get(claimEmployeeKey)
  
  if (!match) {
    // If no match in lookup, we keep the existing claim but ensure it doesn't just say 'Unknown'
    // if we can at least show the ID. The UI already defaults to 'Unknown' in mapClaim.
    return claim
  }

  return {
    ...claim,
    employeeId: match.employeeId || claim.employeeId,
    employeeName: match.employeeName || 'Unknown',
  }
}

async function loadEmployeeLookupForClaims(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  claims: DbClaim[]
): Promise<EmployeeLookup> {
  const lookup: EmployeeLookup = new Map()
  const employeeUserIds = Array.from(new Set(claims.map((claim) => claim.employee_id).filter(Boolean)))

  if (employeeUserIds.length === 0) {
    return lookup
  }

  // 1. Try to load from profiles table (most reliable for name/ID)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, id, employee_id, full_name')
    .or(`user_id.in.(${employeeUserIds.join(',')}),id.in.(${employeeUserIds.join(',')})`)

  if (profileData) {
    for (const row of profileData) {
      const entry = {
        employeeId: row.employee_id || row.id || row.user_id,
        employeeName: row.full_name || 'Employee'
      }
      if (row.user_id) lookup.set(row.user_id, entry)
      if (row.id) lookup.set(row.id, entry)
    }
  }

  // 2. Try to load from manager_teams as fallback for name mapping
  const missingUserIds = employeeUserIds.filter(id => !lookup.has(id))
  if (missingUserIds.length > 0) {
    const { data: teamData, error: teamError } = await supabase
      .from('manager_teams')
      .select('employee_user_id, employee_id, employee_name')
      .in('employee_user_id', missingUserIds)

    if (teamData) {
      for (const row of teamData as TeamDirectoryRow[]) {
        if (!row.employee_user_id) continue
        lookup.set(row.employee_user_id, {
          employeeId: row.employee_id || row.employee_user_id,
          employeeName: row.employee_name || 'Unknown'
        })
      }
    }
  }

  return lookup
}

function mapProfile(data: DbProfile): FinanceProfile {
  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    phone: data.phone || '',
    role: data.role,
    department: data.department,
    avatar: '',
    joinDate: new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}

// Auth check
async function requireUser() {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) {
    throw new AuthRequiredError()
  }

  return user
}

// Fetch all claims for finance (finance users can see all claims)
export async function fetchAllClaims(): Promise<FinanceClaim[]> {
  await requireUser()
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  if (!data) return []

  const dbClaims = data as DbClaim[]
  const lookup = await loadEmployeeLookupForClaims(supabase, dbClaims)
  return dbClaims.map((claim) => applyEmployeeLookup(mapClaim(claim), claim.employee_id, lookup))
}

// Fetch claims by status
export async function fetchClaimsByStatus(status: string): Promise<FinanceClaim[]> {
  const allClaims = await fetchAllClaims()
  return allClaims.filter(c => c.status === status)
}

// Fetch pending verification claims (Submitted/Pending status)
export async function fetchPendingVerification(): Promise<FinanceClaim[]> {
  const user = await requireUser()
  const allClaims = await fetchAllClaims()
  // Show claims that are approved by a manager (to be verified by finance)
  // or approved by super owner (even if it's the finance user's own claim)
  return allClaims.filter(c => 
    c.status === 'Approved' && 
    (c.employeeId !== user.id || c.approvedBy === 'super_owner')
  )
}

// Fetch approved claims ready for payment
export async function fetchReadyForPayment(): Promise<FinanceClaim[]> {
  const user = await requireUser()
  const allClaims = await fetchAllClaims()
  // Only show claims that have been explicitly verified (PaymentProcessing)
  // Allow self-submitted claims if they were approved by the super owner
  return allClaims.filter(c => 
    c.status === 'PaymentProcessing' && 
    (c.employeeId !== user.id || c.approvedBy === 'super_owner')
  )
}

// Fetch finance profile
export async function fetchFinanceProfile(): Promise<FinanceProfile> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const userIdMsg = (error as any)?.message?.toLowerCase?.() || ''
  const userIdColumnMissing =
    userIdMsg.includes('user_id') && (userIdMsg.includes('does not exist') || userIdMsg.includes('column'))

  const byIdResult =
    userIdColumnMissing || !data
      ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      : null

  const finalData = (data || byIdResult?.data) as any
  const finalError = (error && !userIdColumnMissing ? error : byIdResult?.error) as any

  if (finalError) {
    console.error('Profile fetch error:', finalError)
    throw new Error(`Failed to fetch profile: ${finalError.message}`)
  }
  if (!finalData) throw new Error('Profile not found')

  return mapProfile(finalData as DbProfile)
}

// Build dashboard stats
export async function buildFinanceDashboardStats(currentUserUuid?: string): Promise<FinanceDashboardStats> {
  const allClaims = await fetchAllClaims()
  const pendingVerification = allClaims.filter((claim) => 
    claim.status === 'Approved' && 
    claim.employeeId !== currentUserUuid &&
    claim.approvedBy !== 'super_owner'
  )
  const readyForPayment = allClaims.filter((claim) => claim.status === 'PaymentProcessing' || claim.status === 'Approved')
  const paidClaims = allClaims.filter(c => c.status === 'Paid')
  
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const processedThisMonth = allClaims.filter(c => {
    const date = new Date(c.createdAt)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })
  
  const processedThisMonthAmount = processedThisMonth.reduce((sum, c) => sum + c.amount, 0)
  
  const completedClaims = allClaims.filter(c => c.status === 'Paid' || c.status === 'Approved')
  
  const totalPendingAmount = readyForPayment.reduce((sum, c) => sum + c.amount, 0)
  const totalPaidAmount = paidClaims.reduce((sum, c) => sum + c.amount, 0)
  
  const approvalRate = allClaims.length > 0 
    ? ((completedClaims.length / allClaims.length) * 100)
    : 0
  
  // Get unique claimants
  const uniqueClaimants = new Set(allClaims.map(c => c.employeeId))
  
  return {
    pendingVerification: pendingVerification.length,
    pendingPayments: readyForPayment.length,
    processedThisMonth: processedThisMonthAmount,
    totalPaidAmount,
    claimsCompleted: completedClaims.length,
    totalPendingAmount,
    avgProcessingTime: 1.2, // This would need actual calculation based on timestamps
    approvalRate,
    activeClaimants: uniqueClaimants.size,
  }
}

// Approve claim
export async function approveClaim(claimId: string): Promise<void> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()
  
  // Verify ownership
  const { data: claim } = await supabase.from('claims').select('employee_id').eq('id', claimId).single()
  if (claim && claim.employee_id === user.id) {
    throw new Error('You cannot approve your own claim. It must be approved by a Super Owner.')
  }

  const { error } = await supabase
    .from('claims')
    .update({ status: 'Approved' })
    .eq('id', claimId)
  
  if (error) throw error
}

// Reject claim
export async function rejectClaim(claimId: string, reason?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  const { error } = await supabase
    .from('claims')
    .update({ 
      status: 'Rejected',
      clarification_notes: reason || null
    })
    .eq('id', claimId)
  
  if (error) throw error
}

// Mark claim as paid
export async function markClaimAsPaid(claimId: string, financePaymentMode: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('claims')
    .update({ 
      status: 'Paid', 
      updated_at: new Date().toISOString(),
      finance_payment_mode: financePaymentMode
    })
    .eq('id', claimId)
    .select('id')
    .maybeSingle()
  
  if (error) throw error
  if (!data) {
    throw new Error('Payment update was blocked by Supabase RLS. Please apply the latest claims policy migration.')
  }
}

// Finance approves a claim (moves from Approved to PaymentProcessing)
export async function financeApproveClaim(claimId: string): Promise<void> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()

  // Verify ownership
  const { data: claim } = await supabase.from('claims').select('employee_id').eq('id', claimId).single()
  if (claim && claim.employee_id === user.id) {
    throw new Error('Security Alert: You cannot process payment for your own claim.')
  }

  const { data, error } = await supabase
    .from('claims')
    .update({ status: 'PaymentProcessing', updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select('id')
    .maybeSingle()
  
  if (error) {
    const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
    const isStatusConstraintError =
      error.code === '23514' ||
      message.includes('check constraint') ||
      message.includes('status')

    if (isStatusConstraintError) {
      // Backward-compatible fallback
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('claims')
        .update({ status: 'Approved', updated_at: new Date().toISOString() })
        .eq('id', claimId)
        .select('id')
        .maybeSingle()

      if (fallbackError) throw fallbackError
      if (!fallbackData) {
        throw new Error('Claim update was blocked by Supabase RLS.')
      }
      return
    }
    throw error
  }
  if (!data) {
    throw new Error('Claim update was blocked by Supabase RLS.')
  }
}

// Finance rejects a claim (moves from Approved to Rejected)
export async function financeRejectClaim(claimId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('claims')
    .update({ status: 'Rejected', updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select('id')
    .maybeSingle()
  
  if (error) throw error
  if (!data) {
    throw new Error('Claim update was blocked by Supabase RLS. Please apply the latest claims policy migration.')
  }
}

// Fetch a single claim by ID
export async function fetchClaimById(claimId: string): Promise<FinanceClaim> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .single()

  if (error) throw error
  if (!data) throw new Error('Claim not found')
  
  const claimData = data as DbClaim
  const lookup = await loadEmployeeLookupForClaims(supabase, [claimData])
  return applyEmployeeLookup(mapClaim(claimData), claimData.employee_id, lookup)
}

// Salary upload types
export interface SalaryUpload {
  id: string
  managerId: string
  fileName: string
  filePath: string
  fileSize: number
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  financeNotes: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
  updatedAt: string
}

// Fetch all salary uploads for finance review
export async function fetchSalaryUploads(): Promise<SalaryUpload[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('salary_uploads')
    .select('*')
    .order('submitted_at', { ascending: false })
  
  if (error) throw error
  if (!data) return []
  
  return data.map((upload: any) => ({
    id: upload.id,
    managerId: upload.manager_id,
    fileName: upload.file_name,
    filePath: upload.file_path,
    fileSize: upload.file_size || 0,
    status: upload.status,
    financeNotes: upload.finance_notes,
    submittedAt: upload.submitted_at,
    reviewedAt: upload.reviewed_at,
    reviewedBy: upload.reviewed_by,
    createdAt: upload.created_at,
    updatedAt: upload.updated_at,
  }))
}

// Fetch manager's own salary uploads
export async function fetchManagerSalaryUploads(managerId: string): Promise<SalaryUpload[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('salary_uploads')
    .select('*')
    .eq('manager_id', managerId)
    .order('submitted_at', { ascending: false })
  
  if (error) throw error
  if (!data) return []
  
  return data.map((upload: any) => ({
    id: upload.id,
    managerId: upload.manager_id,
    fileName: upload.file_name,
    filePath: upload.file_path,
    fileSize: upload.file_size || 0,
    status: upload.status,
    financeNotes: upload.finance_notes,
    submittedAt: upload.submitted_at,
    reviewedAt: upload.reviewed_at,
    reviewedBy: upload.reviewed_by,
    createdAt: upload.created_at,
    updatedAt: upload.updated_at,
  }))
}

// Delete salary upload from database and storage
export async function deleteSalaryUpload(id: string, filePath: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  // Delete from storage first
  const { error: storageError } = await supabase
    .storage
    .from('salary-uploads')
    .remove([filePath])
  
  if (storageError) {
    console.error('Storage delete error:', storageError)
    throw new Error('Failed to delete file from storage: ' + storageError.message)
  }
  
  // Delete from database
  const { error: dbError } = await supabase
    .from('salary_uploads')
    .delete()
    .eq('id', id)
  
  if (dbError) {
    console.error('Database delete error:', dbError)
    throw new Error('Failed to delete record from database: ' + dbError.message)
  }
}

// Download salary file from Supabase Storage
export async function downloadSalaryFile(filePath: string, fileName: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .storage
    .from('salary-uploads')
    .download(filePath)
  
  if (error) {
    console.error('Download error:', error)
    throw new Error('Failed to download file: ' + error.message)
  }
  
  if (!data) {
    throw new Error('File not found')
  }
  
  // Create download link
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Update salary upload status
export async function updateSalaryUploadStatus(
  uploadId: string,
  status: 'reviewed' | 'approved' | 'rejected',
  notes?: string
): Promise<void> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()
  
  // Verify ownership to prevent self-approval
  const { data: upload } = await supabase.from('salary_uploads').select('manager_id').eq('id', uploadId).single()
  if (upload && upload.manager_id === user.id) {
    throw new Error('Security Alert: You cannot approve or review a salary file that you uploaded yourself.')
  }

  const { error } = await supabase
    .from('salary_uploads')
    .update({
      status,
      finance_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', uploadId)
  
  if (error) throw error
}

// Transaction types
export interface Transaction {
  id: string
  claimId: string
  claimNumber: string
  employeeId: string
  employeeName: string
  amount: number
  currency: string
  date: string
  paymentMode: string
  status: 'Paid'
}

// Fetch all paid claims (transactions)
export async function fetchTransactions(): Promise<Transaction[]> {
  const allClaims = await fetchAllClaims()
  const paidClaims = allClaims.filter(c => c.status === 'Paid')
  
  return paidClaims.map(claim => ({
    id: claim.id,
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    employeeId: claim.employeeId,
    employeeName: claim.employeeName,
    amount: claim.amount,
    currency: claim.currency,
    date: claim.createdAt,
    paymentMode: claim.financePaymentMode || claim.paymentMode, // Use finance payment mode if available, otherwise fallback to employee's payment mode
    status: 'Paid' as const,
  }))
}

export async function createFinanceClaim(input: CreateClaimInput): Promise<FinanceClaim> {
  const [user, profile] = await Promise.all([requireUser(), fetchFinanceProfile()])
  const supabase = getSupabaseBrowserClient()

  // Generate claim number
  const timestamp = Date.now()
  const claimNumber = `EXP-FIN-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}`

  const payload = {
    employee_id: user.id, // Use auth user UUID (required by database)
    claim_number: claimNumber,
    vendor_name: input.vendorName.trim(),
    expense_date: input.expenseDate,
    amount: input.amount,
    currency: input.currency === '₹' ? 'inr' : input.currency === '$' ? 'usd' : input.currency.toLowerCase(),
    category: input.category,
    payment_mode: input.paymentMode,
    description: input.description.trim(),
    city: input.city?.trim() || null,
    gstin: input.gstin?.trim() || null,
    project_name: input.projectName?.trim() || 'General',
    status: input.status === 'submitted' ? 'Submitted' : 'Draft',
    submitted_at: input.status === 'submitted' ? new Date().toISOString() : null,
    // Finance's own claims require Super Owner approval (tier 2)
    approval_tier: input.status === 'submitted' ? 2 : 1,
    manager_id: user.id, // Self-reference so it's visible in finance user's view
    approved_by: null, // Must be approved by Super Owner
  }

  console.log('Creating finance claim with payload:', payload)

  const { data, error } = await supabase
    .from('claims')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    throw error
  }

  return mapClaim(data as DbClaim)
}

