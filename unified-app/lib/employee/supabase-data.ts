import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required')
    this.name = 'AuthRequiredError'
  }
}

function isUuidTypeError(error: any): boolean {
  const message = (error?.message || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  return code === '22p02' || (message.includes('invalid input syntax') && message.includes('uuid'))
}

// Types
export interface DbProfile {
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

export interface DbClaim {
  id: string
  employee_id: string
  claim_number: string
  description: string
  category: string
  amount: number
  currency: string
  status: string
  expense_date: string
  payment_mode: string
  project_name: string
  project_details: string
  vendor_name: string
  city: string
  gstin: string
  receipt_url: string
  created_at: string
  submitted_at: string
  manager_id: string
  policy_flags: any
  clarification_notes: string
  approval_tier: number
}

export interface DashboardClaim {
  id: string
  claimNumber: string
  description: string
  category: string
  amount: number
  currency: string
  status: string
  expenseDate: string
  paymentMode: string
  project: string
  vendorName: string
  city: string
  receiptUrl: string
  createdAt: string
  submittedAt: string
}

export interface CreateClaimInput {
  vendorName: string
  expenseDate: string
  amount: number
  category: string
  paymentMode: string
  description: string
  projectName: string
  city: string
  receiptUrl: string
  currency: string
  status: string
  gstin?: string
}

export interface DashboardUser {
  id: string
  userId: string
  employeeId: string
  firstName: string
  lastName: string
  name: string
  email: string
  role: string
  department: string
  designation: string
  manager: string
  location: string
  bankAccount: string
}

// Fetch current user profile
export async function fetchCurrentProfile(): Promise<DbProfile> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('Auth error:', authError)
    throw new Error(`Authentication error: ${authError.message}`)
  }
  
  if (!user) {
    throw new AuthRequiredError()
  }

  // Some DBs store the auth uid in `id`, others in `user_id` (or both).
  // Try `user_id` first (common with RLS policies), then fall back to `id`.
  const tryByUserId = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const userIdMsg = (tryByUserId.error as any)?.message?.toLowerCase?.() || ''
  const userIdColumnMissing =
    userIdMsg.includes('user_id') && (userIdMsg.includes('does not exist') || userIdMsg.includes('column'))

  const byIdResult =
    userIdColumnMissing || !tryByUserId.data
      ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      : null

  const data = (tryByUserId.data || byIdResult?.data) as any
  const error = (tryByUserId.error && !userIdColumnMissing ? tryByUserId.error : byIdResult?.error) as any

  if (error) {
    console.error('Profile fetch error:', error)
    throw new Error(`Failed to fetch profile: ${error.message}`)
  }
  if (!data) throw new Error('Profile not found')

  // Optional: fetch team assignment (department + reporting manager) if the DB supports it.
  // This will be enabled by RLS/migration later; if it fails, we just fall back to profile fields.
  let teamDepartment: string | null = null
  let reportingManagerName: string | null = null
  try {
    const { data: teamRow, error: teamError } = await supabase
      .from('manager_teams')
      .select('department, manager_name')
      .eq('employee_user_id', user.id)
      .maybeSingle()

    if (!teamError && teamRow) {
      teamDepartment = typeof (teamRow as any).department === 'string' ? (teamRow as any).department : null
      reportingManagerName =
        typeof (teamRow as any).manager_name === 'string' ? (teamRow as any).manager_name : null
    }
  } catch {
    // ignore - table/policies/columns may not exist yet
  }

  // Fallback: if employee can't query by employee_user_id (RLS or old schema), try by display employee_id.
  if (!teamDepartment && !reportingManagerName) {
    try {
      const { data: teamRow } = await supabase
        .from('manager_teams')
        .select('department, manager_name')
        .eq('employee_id', (data as any).employee_id)
        .maybeSingle()

      if (teamRow) {
        teamDepartment = typeof (teamRow as any).department === 'string' ? (teamRow as any).department : null
        reportingManagerName =
          typeof (teamRow as any).manager_name === 'string' ? (teamRow as any).manager_name : null
      }
    } catch {
      // ignore
    }
  }

  return {
    ...data,
    phone:
      data.phone ??
      (typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : null),
    department: teamDepartment || data.department,
    manager_name: reportingManagerName || (data as any).manager_name || null,
  }
}

// Fetch all claims for current user
export async function fetchClaims(): Promise<DashboardClaim[]> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('Auth error:', authError)
    throw new Error(`Authentication error: ${authError.message}`)
  }
  
  if (!user) {
    throw new AuthRequiredError()
  }

  const profile = await fetchCurrentProfile()
  const rowsById = await supabase
    .from('claims')
    .select('*')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  if (rowsById.error) {
    console.error('Claims fetch error:', rowsById.error)
    throw new Error(`Failed to fetch claims: ${rowsById.error.message}`)
  }

  let rowsByEmployeeCode: DbClaim[] = []
  const employeeCode = profile.employee_id

  if (employeeCode && employeeCode !== user.id) {
    const byCode = await supabase
      .from('claims')
      .select('*')
      .eq('employee_id', employeeCode)
      .order('created_at', { ascending: false })

    if (byCode.error && !isUuidTypeError(byCode.error)) {
      console.error('Claims fetch error:', byCode.error)
      throw new Error(`Failed to fetch claims: ${byCode.error.message}`)
    }

    if (!byCode.error) {
      rowsByEmployeeCode = (byCode.data as DbClaim[] | null) ?? []
    }
  }

  const merged = [...((rowsById.data as DbClaim[] | null) ?? []), ...rowsByEmployeeCode]
  const deduped = Array.from(new Map(merged.map((claim) => [claim.id, claim])).values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return deduped.map((claim: DbClaim) => ({
    id: claim.id,
    claimNumber: claim.claim_number,
    description: claim.description,
    category: claim.category,
    amount: claim.amount,
    currency: claim.currency,
    status: claim.status,
    expenseDate: claim.expense_date,
    paymentMode: claim.payment_mode,
    project: claim.project_name,
    vendorName: claim.vendor_name,
    city: claim.city,
    receiptUrl: claim.receipt_url,
    createdAt: claim.created_at,
    submittedAt: claim.submitted_at,
  }))
}

// Create a new claim
export async function createClaim(input: CreateClaimInput): Promise<DashboardClaim> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new AuthRequiredError()
  }

  const profile = await fetchCurrentProfile()
  const claimNumber = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

  // Best-effort: attach the reporting manager so the claim reliably shows up in manager approvals.
  let managerId: string | null = null
  let managerOnLeave = false
  try {
    const byUserId = await supabase
      .from('manager_teams')
      .select('manager_user_id, manager_id')
      .eq('employee_user_id', user.id)
      .maybeSingle()

    if (byUserId.data) {
      managerId = (byUserId.data as any).manager_user_id || (byUserId.data as any).manager_id || null
    } else {
      const byEmpId = await supabase
        .from('manager_teams')
        .select('manager_user_id, manager_id')
        .eq('employee_id', profile.employee_id)
        .maybeSingle()

      if (byEmpId.data) {
        managerId = (byEmpId.data as any).manager_user_id || (byEmpId.data as any).manager_id || null
      }
    }

    // Check if manager is on leave
    if (managerId) {
      const { data: managerProfile } = await supabase
        .from('profiles')
        .select('on_leave')
        .eq('id', managerId)
        .single()
      
      if (managerProfile && managerProfile.on_leave) {
        managerOnLeave = true
      }
    }
  } catch {
    // ignore - claim can still be created without a manager assignment
  }

  // Auto-approval logic
  const autoApprovalLimit = 5000 // Default auto-approval limit
  const blockedVendors = [] // No blocked vendors by default
  const isVendorApproved = !input.vendorName || !blockedVendors.includes(input.vendorName)
  const isBelowLimit = input.amount <= autoApprovalLimit
  
  // Auto-approve if below limit and vendor is approved
  let finalStatus = input.status
  if (isBelowLimit && isVendorApproved && input.status === 'Submitted') {
    finalStatus = 'Approved'
  }

  const basePayload = {
    manager_id: managerId,
    claim_number: claimNumber,
    description: input.description,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    status: finalStatus,
    expense_date: input.expenseDate,
    payment_mode: input.paymentMode,
    project_name: input.projectName,
    vendor_name: input.vendorName,
    city: input.city,
    receipt_url: input.receiptUrl,
    submitted_at: input.status === 'Submitted' ? new Date().toISOString() : null,
    approved_by: finalStatus === 'Approved' ? 'auto' : null,
    // No automatic escalation - claims go to both Manager and Super Owner if manager is on leave
    policy_flags: [],
    approval_tier: 1,
  }

  let result = await supabase
    .from('claims')
    .insert({
      ...basePayload,
      employee_id: user.id,
    })
    .select()
    .single()

  if (result.error && isUuidTypeError(result.error)) {
    result = await supabase
      .from('claims')
      .insert({
        ...basePayload,
        employee_id: profile.id,
      })
      .select()
      .single()
  }

  if (result.error) {
    console.error('Supabase insert error:', result.error)
    console.error('Error details:', {
      message: result.error.message,
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint
    })
    throw result.error
  }
  const data = result.data as any

  return {
    id: data.id,
    claimNumber: data.claim_number,
    description: data.description,
    category: data.category,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    expenseDate: data.expense_date,
    paymentMode: data.payment_mode,
    project: data.project_name,
    vendorName: data.vendor_name,
    city: data.city,
    receiptUrl: data.receipt_url,
    createdAt: data.created_at,
    submittedAt: data.submitted_at,
  }
}

// Update profile
export async function updateProfile(input: Partial<DbProfile>): Promise<DbProfile> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    throw new Error(`Authentication error: ${authError.message}`)
  }

  if (!user) {
    throw new AuthRequiredError()
  }

  const updates: Partial<DbProfile> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (input.full_name !== undefined) {
    updates.full_name = input.full_name
  }

  if (input.role !== undefined) {
    updates.role = input.role
  }

  if (input.department !== undefined) {
    updates.department = input.department
  }

  if (input.designation !== undefined) {
    updates.designation = input.designation
  }

  if (input.location !== undefined) {
    updates.location = input.location
  }

  // Try updating by `user_id` first (common in RLS), then fall back to `id`.
  const byUserId = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  const msg = (byUserId.error as any)?.message?.toLowerCase?.() || ''
  const userIdColumnMissing =
    msg.includes('user_id') && (msg.includes('does not exist') || msg.includes('column'))

  const byId =
    userIdColumnMissing || !byUserId.data
      ? await supabase.from('profiles').update(updates).eq('id', user.id).select().maybeSingle()
      : null

  const data = (byUserId.data || byId?.data) as any
  const error = (byUserId.error && !userIdColumnMissing ? byUserId.error : byId?.error) as any

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }
  if (!data) throw new Error('Profile not found')

  const currentMetadataPhone =
    typeof user.user_metadata?.phone === 'string' && user.user_metadata.phone.trim()
      ? user.user_metadata.phone.trim()
      : null

  let metadataPhone = currentMetadataPhone

  if (input.phone !== undefined) {
    const nextPhone =
      typeof input.phone === 'string' && input.phone.trim() ? input.phone.trim() : null

    if (nextPhone !== currentMetadataPhone) {
      const nextUserMetadata: Record<string, unknown> = {
        ...(user.user_metadata ?? {}),
      }

      if (nextPhone) {
        nextUserMetadata.phone = nextPhone
      } else {
        delete nextUserMetadata.phone
      }

      const { data: authData, error: updateUserError } = await supabase.auth.updateUser({
        data: nextUserMetadata,
      })

      if (updateUserError) {
        throw new Error(`Failed to update phone number: ${updateUserError.message}`)
      }

      metadataPhone =
        typeof authData.user?.user_metadata?.phone === 'string' &&
        authData.user.user_metadata.phone.trim()
          ? authData.user.user_metadata.phone.trim()
          : null
    }
  }

  return {
    ...data,
    phone: data.phone ?? metadataPhone,
  }
}

// Fetch claim by ID
export async function fetchClaimById(claimId: string): Promise<DashboardClaim> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .single()

  if (error) throw error
  if (!data) throw new Error('Claim not found')

  return {
    id: data.id,
    claimNumber: data.claim_number,
    description: data.description,
    category: data.category,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    expenseDate: data.expense_date,
    paymentMode: data.payment_mode,
    project: data.project_name,
    vendorName: data.vendor_name,
    city: data.city,
    receiptUrl: data.receipt_url,
    createdAt: data.created_at,
    submittedAt: data.submitted_at,
  }
}

// Dashboard stats helpers
export interface DashboardStats {
  totalSubmitted: number
  totalCount: number
  approved: number
  approvedCount: number
  pending: number
  pendingCount: number
  rejected: number
  rejectedCount: number
  monthlyTotal: number
  monthlyApproved: number
}

export function buildDashboardStats(claims: DashboardClaim[]): DashboardStats {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthlyClaims = claims.filter(claim => {
    const claimDate = new Date(claim.expenseDate)
    return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear
  })

  const totalSubmitted = claims.reduce((sum, claim) => sum + claim.amount, 0)
  const approved = claims.filter(c => c.status === 'Approved' || c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0)
  const pending = claims.filter(c => c.status === 'Pending' || c.status === 'Submitted').reduce((sum, c) => sum + c.amount, 0)
  const rejected = claims.filter(c => c.status === 'Rejected').reduce((sum, c) => sum + c.amount, 0)

  const monthlyTotal = monthlyClaims.reduce((sum, claim) => sum + claim.amount, 0)
  const monthlyApproved = monthlyClaims.filter(c => c.status === 'Approved' || c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0)

  return {
    totalSubmitted,
    totalCount: claims.length,
    approved,
    approvedCount: claims.filter(c => c.status === 'Approved' || c.status === 'Paid').length,
    pending,
    pendingCount: claims.filter(c => c.status === 'Pending' || c.status === 'Submitted').length,
    rejected,
    rejectedCount: claims.filter(c => c.status === 'Rejected').length,
    monthlyTotal,
    monthlyApproved,
  }
}

export interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  time: string
  read: boolean
}

export function buildHeaderNotifications(claims: DashboardClaim[]): Notification[] {
  const notifications: Notification[] = []
  
  const pendingClaims = claims.filter(c => c.status === 'Pending' || c.status === 'Submitted')
  const approvedClaims = claims.filter(c => c.status === 'Approved')
  const rejectedClaims = claims.filter(c => c.status === 'Rejected')

  if (pendingClaims.length > 0) {
    notifications.push({
      id: 'pending-claims',
      type: 'warning',
      title: `${pendingClaims.length} claims pending`,
      message: 'Your claims are awaiting approval',
      time: 'Just now',
      read: false,
    })
  }

  if (approvedClaims.length > 0) {
    notifications.push({
      id: 'approved-claims',
      type: 'success',
      title: `${approvedClaims.length} claims approved`,
      message: 'Your claims have been approved',
      time: 'Today',
      read: false,
    })
  }

  if (rejectedClaims.length > 0) {
    notifications.push({
      id: 'rejected-claims',
      type: 'error',
      title: `${rejectedClaims.length} claims rejected`,
      message: 'Some claims were rejected',
      time: 'Today',
      read: false,
    })
  }

  return notifications
}

export function buildMonthlySpendData(claims: DashboardClaim[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentYear = new Date().getFullYear()
  
  return months.map((month, index) => {
    const monthClaims = claims.filter(claim => {
      const claimDate = new Date(claim.expenseDate)
      return claimDate.getMonth() === index && claimDate.getFullYear() === currentYear
    })
    
    return {
      month,
      amount: monthClaims.reduce((sum, claim) => sum + claim.amount, 0),
    }
  })
}

export function buildCategoryDistribution(claims: DashboardClaim[]) {
  const distribution: Record<string, number> = {}
  
  claims.forEach(claim => {
    distribution[claim.category] = (distribution[claim.category] || 0) + claim.amount
  })
  
  return Object.entries(distribution).map(([category, amount]) => ({
    category,
    amount,
    percentage: (amount / claims.reduce((sum, c) => sum + c.amount, 0)) * 100,
  }))
}
