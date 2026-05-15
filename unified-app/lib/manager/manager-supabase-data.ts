'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { fetchManagerTeamEmployeeIds } from '@/lib/manager/team-management-v2'

// Types for Manager Dashboard
export interface ManagerUser {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: string
  avatar: string
  joinDate: string
  managerName?: string
  location?: string
  bankAccount?: string
}

export interface ManagerClaim {
  id: string
  claimNumber: string
  employeeId: string
  employeeName: string
  category: string
  amount: number
  currency: string
  status: 'Draft' | 'Submitted' | 'Pending' | 'Approved' | 'Rejected' | 'Paid'
  description: string
  date: string
  createdAt: string
  submittedAt?: string
  paymentMode: string
  project: string
  vendorName: string
  city?: string
  receiptUrl?: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  avatar: string
  totalClaims: number
  pendingClaims: number
  totalAmount: number
}

export interface DashboardStats {
  totalPending: number
  totalApproved: number
  totalRejected: number
  totalAmount: number
  pendingAmount: number
  monthlySpend: number
  averageClaimAmount: number
  approvalRate: number
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Auth session missing!')
    this.name = 'AuthRequiredError'
  }
}

// Database Types
interface DbProfile {
  id: string
  employee_id: string
  full_name: string | null
  email: string
  phone: string | null
  role: string | null
  department: string | null
  manager_name: string | null
  location: string | null
  joined_on: string | null
  bank_account: string | null
  company_bank_account: string | null
  created_at: string
}

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
  description: string
  city: string | null
  gstin: string | null
  project_name: string | null
  project_details: string | null
  receipt_url: string | null
  policy_flags: any
  clarification_notes: string | null
  approval_tier: number | null
  status: 'Draft' | 'Submitted' | 'Pending' | 'Approved' | 'Rejected' | 'Paid'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

// Helper functions
function mapProfile(data: DbProfile | null, user: { id: string; email?: string }): ManagerUser {
  if (!data) {
    return {
      id: user.id,
      name: user.email?.split('@')[0] || 'Manager',
      email: user.email || '',
      phone: '',
      role: 'Manager',
      department: 'Operations',
      avatar: 'MG',
      joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  }

  const fullName = data.full_name || user.email?.split('@')[0] || 'Manager'
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return {
    id: data.employee_id || data.id,
    name: fullName,
    email: data.email || user.email || '',
    phone: data.phone || '',
    role: data.role || 'Manager',
    department: data.department || 'Operations',
    avatar: initials,
    joinDate: data.joined_on
      ? new Date(data.joined_on).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    managerName: data.manager_name || undefined,
    location: data.location || undefined,
    bankAccount: data.bank_account || data.company_bank_account || undefined,
  }
}

function mapClaim(data: DbClaim): ManagerClaim {
  // Ensure amount is a number (database might return it as string)
  const rawAmount = data.amount
  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
  const finalAmount = isNaN(amount) ? 0 : amount
  
  return {
    id: data.id,
    claimNumber: data.claim_number || data.id.slice(0, 8).toUpperCase(),
    employeeId: data.employee_id,
    employeeName: data.employee_id,
    category: data.category,
    amount: finalAmount,
    currency: data.currency === 'inr' ? '₹' : data.currency === 'usd' ? '$' : data.currency.toUpperCase(),
    status: data.status,
    description: data.description,
    date: data.expense_date,
    createdAt: data.created_at,
    submittedAt: data.submitted_at || undefined,
    paymentMode: data.payment_mode,
    project: data.project_name || 'General',
    vendorName: data.vendor_name,
    city: data.city || undefined,
    receiptUrl: data.receipt_url || undefined,
  }
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isUuidTypeError(error: any): boolean {
  const message = (error?.message || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  return code === '22p02' || (message.includes('invalid input syntax') && message.includes('uuid'))
}

function isMissingColumnError(error: any): boolean {
  const message = (error?.message || '').toLowerCase()
  return message.includes('column') && message.includes('does not exist')
}

function getErrorMessage(error: any, fallback: string): string {
  if (!error) return fallback
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error

  const message = typeof error.message === 'string' ? error.message : ''
  const details = typeof error.details === 'string' ? error.details : ''
  const hint = typeof error.hint === 'string' ? error.hint : ''
  const code = typeof error.code === 'string' ? error.code : ''
  const parts = [message, details, hint, code].filter(Boolean)

  if (parts.length > 0) return parts.join(' | ')

  try {
    return JSON.stringify(error)
  } catch {
    return fallback
  }
}

function toAppError(error: any, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback))
}

function buildOptimisticClaim(claimId: string, status: ManagerClaim['status']): ManagerClaim {
  const now = new Date().toISOString()
  return {
    id: claimId,
    claimNumber: claimId.slice(0, 8).toUpperCase(),
    employeeId: '',
    employeeName: 'Unknown',
    category: 'General',
    amount: 0,
    currency: '₹',
    status,
    description: '',
    date: now,
    createdAt: now,
    submittedAt: undefined,
    paymentMode: '',
    project: 'General',
    vendorName: '',
    city: undefined,
    receiptUrl: undefined,
  }
}

async function updateClaimRow(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  claimId: string,
  values: Record<string, any>,
  errorFallback: string
) {
  const payloads: Array<Record<string, any>> = [
    values,
    Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'updated_at')),
  ]

  let lastError: any = null

  for (const payload of payloads) {
    const { data, error } = await supabase.from('claims').update(payload).eq('id', claimId).select('id')
    if (!error) {
      // If no rows returned, RLS may have silently blocked the update
      if (!data || data.length === 0) {
        console.error('updateClaimRow: 0 rows updated - RLS policy likely blocked the update', { claimId, payload })
        throw new Error('Failed to update claim: no rows were changed. The manager may not have permission for this claim.')
      }
      return
    }

    lastError = error
    if (!isMissingColumnError(error)) {
      throw toAppError(error, errorFallback)
    }
  }

  throw toAppError(lastError, errorFallback)
}

async function enrichClaimEmployeeNames(supabase: ReturnType<typeof getSupabaseBrowserClient>, claims: DbClaim[]) {
  if (claims.length === 0) return []

  const refs = [...new Set(claims.map((claim) => claim.employee_id).filter(Boolean))]
  const uuidRefs = refs.filter(looksLikeUuid)
  const employeeIdRefs = refs.filter((ref) => !looksLikeUuid(ref))

  const [profilesByIdResult, profilesByEmployeeIdResult] = await Promise.all([
    uuidRefs.length > 0
      ? supabase.from('profiles').select('id, employee_id, full_name').in('id', uuidRefs)
      : Promise.resolve({ data: [], error: null } as any),
    employeeIdRefs.length > 0
      ? supabase.from('profiles').select('id, employee_id, full_name').in('employee_id', employeeIdRefs)
      : Promise.resolve({ data: [], error: null } as any),
  ])

  const byIdMap = new Map((profilesByIdResult.data || []).map((profile: any) => [profile.id, profile]))
  const byEmployeeIdMap = new Map(
    (profilesByEmployeeIdResult.data || []).map((profile: any) => [profile.employee_id, profile])
  )

  return claims.map((claim) => {
    const mapped = mapClaim(claim)
    const profile =
      (looksLikeUuid(claim.employee_id) ? byIdMap.get(claim.employee_id) : null) ||
      byEmployeeIdMap.get(claim.employee_id)

    return {
      ...mapped,
      employeeName: profile?.full_name || mapped.employeeName || 'Unknown',
      employeeId: profile?.employee_id || mapped.employeeId,
    }
  })
}

export async function requireUser() {
  const supabase = getSupabaseBrowserClient()
  
  // First check session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new AuthRequiredError()
  }
  
  // Then get user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new AuthRequiredError()

  return user
}

// Data Functions
export async function fetchManagerProfile(): Promise<ManagerUser> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()

  // Try to fetch existing profile
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) throw fetchError

  // If profile exists, return it
  if (existing) {
    return mapProfile(existing as DbProfile, user)
  }

  // Create profile if it doesn't exist
  const email = user.email || 'manager@expensepro.com'
  const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'Manager'
  
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      employee_id: `MGR-${user.id.slice(0, 8).toUpperCase()}`,
      full_name: fullName,
      email: email,
      phone: user.user_metadata?.phone || '',
      role: 'manager',
      department: user.user_metadata?.department || 'Management',
    })
    .select('*')
    .single()

  if (createError) {
    // RLS or other error - return fallback profile from user data
    console.warn('Could not create profile in DB (RLS?), using fallback:', createError.message)
    const fbFullName = user.user_metadata?.full_name || email.split('@')[0] || 'Manager'
    return {
      id: `MGR-${user.id.slice(0, 8).toUpperCase()}`,
      name: fbFullName,
      email: email,
      phone: user.user_metadata?.phone || '',
      role: 'Manager',
      department: user.user_metadata?.department || 'Management',
      avatar: (email.split('@')[0].slice(0, 2) || 'MG').toUpperCase(),
      joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  }

  return mapProfile(created as DbProfile, user)
}

export async function fetchAllClaims(): Promise<ManagerClaim[]> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()
  
  // Try broad query first to get all claims (relies on RLS)
  const { data: broadData, error: broadError } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  
  if (broadError) {
    console.error('Broad query error:', broadError)
  }
  
  if (broadData && broadData.length > 0) {
    const claims = Array.from(new Map(broadData.map((claim) => [claim.id, claim])).values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return enrichClaimEmployeeNames(supabase, claims)
  }
  
  // Fallback to team-based queries if broad query returns nothing
  let employeeRefs: string[] = []
  try {
    employeeRefs = await fetchManagerTeamEmployeeIds()
  } catch {
    const metadataTeam = (user.user_metadata?.team_members || []) as Array<{ id: string; empId: string }>
    employeeRefs = metadataTeam.map((t) => t.empId).filter(Boolean)
  }

  const uniqueRefs = [...new Set(employeeRefs.filter(Boolean))]
  const uuidRefs = uniqueRefs.filter(looksLikeUuid)
  const employeeIdRefs = uniqueRefs.filter((value) => !looksLikeUuid(value))

  // Query by manager_id (if claims have it set)
  const managerQuery = supabase
    .from('claims')
    .select('*')
    .eq('manager_id', user.id)
    .order('created_at', { ascending: false })

  // Query by employee_id (UUID refs from team)
  const employeeUuidQuery =
    uuidRefs.length > 0
      ? supabase
          .from('claims')
          .select('*')
          .in('employee_id', uuidRefs)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any)

  // Resolve display employee IDs (EMP-XXX) to UUIDs via profiles before querying claims
  let resolvedUuids: string[] = []
  if (employeeIdRefs.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, user_id')
      .in('employee_id', employeeIdRefs)
    if (profileRows && profileRows.length > 0) {
      resolvedUuids = profileRows
        .map((row: any) => row.user_id || row.id)
        .filter((id: any): id is string => typeof id === 'string' && looksLikeUuid(id))
    }
  }

  // Query by employee_id (resolved UUID refs from team)
  const employeeCodeQuery =
    resolvedUuids.length > 0
      ? supabase
          .from('claims')
          .select('*')
          .in('employee_id', resolvedUuids)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any)

  const [managerResult, uuidResult, codeResult] = await Promise.all([
    managerQuery,
    employeeUuidQuery,
    employeeCodeQuery,
  ])

  if (managerResult.error) console.error('Manager query error:', managerResult.error)
  if (uuidResult.error && !isUuidTypeError(uuidResult.error)) console.error('UUID query error:', uuidResult.error)
  if (codeResult.error && !isUuidTypeError(codeResult.error)) console.error('Code query error:', codeResult.error)

  const merged = [
    ...((managerResult.data as DbClaim[] | null) ?? []),
    ...((uuidResult.data as DbClaim[] | null) ?? []),
    ...((codeResult.data as DbClaim[] | null) ?? []),
  ]

  const claims = Array.from(new Map(merged.map((claim) => [claim.id, claim])).values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return enrichClaimEmployeeNames(supabase, claims)
}

export async function fetchPendingClaims(): Promise<ManagerClaim[]> {
  const allClaims = await fetchAllClaims()
  return allClaims.filter((c) => 
    (c.status === 'Pending' || c.status === 'Submitted') && 
    (c as any).approved_by !== 'super_owner'
  )
}

export async function fetchManagerCreatedClaims(): Promise<ManagerClaim[]> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()

  // Fetch claims where the manager is the employee (claims created by the manager themselves)
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error

  const claims = (data as DbClaim[] | null) ?? []
  return enrichClaimEmployeeNames(supabase, claims)
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  await requireUser()
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get claim counts for each team member
  const { data: claimsData } = await supabase.from('claims').select('employee_id, status, amount')

  const claims = (claimsData as { employee_id: string; status: string; amount: number }[]) || []

  return ((data as DbProfile[]) || []).map((profile) => {
    const userClaims = claims.filter((c) => c.employee_id === profile.employee_id)
    const pendingCount = userClaims.filter((c) => c.status === 'Submitted' || c.status === 'Pending').length
    const totalAmount = userClaims.reduce((sum, c) => sum + (c.amount || 0), 0)

    const name = profile.full_name || profile.employee_id || 'Employee'
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    return {
      id: profile.id,
      name: name,
      role: profile.role || 'Employee',
      department: profile.department || 'General',
      avatar: initials,
      totalClaims: userClaims.length,
      pendingClaims: pendingCount,
      totalAmount: totalAmount,
    }
  })
}

export function buildDashboardStats(claims: ManagerClaim[]): DashboardStats {
  const pending = claims.filter((c) => c.status === 'Pending' || c.status === 'Submitted')
  const approved = claims.filter((c) => c.status === 'Approved' || c.status === 'Paid')
  const rejected = claims.filter((c) => c.status === 'Rejected')

  const totalAmount = claims.reduce((sum, c) => sum + c.amount, 0)
  const pendingAmount = pending.reduce((sum, c) => sum + c.amount, 0)

  // Calculate monthly spend (current month)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthlySpend = claims
    .filter((c) => {
      const date = new Date(c.date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((sum, c) => sum + c.amount, 0)

  const averageClaimAmount = claims.length > 0 ? Math.round(totalAmount / claims.length) : 0

  const totalDecided = approved.length + rejected.length
  const approvalRate = totalDecided > 0 ? Math.round((approved.length / totalDecided) * 100) : 0

  return {
    totalPending: pending.length,
    totalApproved: approved.length,
    totalRejected: rejected.length,
    totalAmount,
    pendingAmount,
    monthlySpend,
    averageClaimAmount,
    approvalRate,
  }
}

export async function approveClaim(claimId: string, remarks?: string): Promise<ManagerClaim> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()

  // Fetch claim first to validate against policy
  const { data: claimData } = await supabase.from('claims').select('*').eq('id', claimId).maybeSingle()
  if (claimData) {
    const claim = mapClaim(claimData as DbClaim)
    
    // Policy validation: Check if claim exceeds policy limits
    if (claim.amount > 50000) {
      throw new Error('Claim exceeds ₹50,000 policy limit. Requires additional approval.')
    }
    
    // No vendor blocking by default - all vendors are allowed
  }

  await updateClaimRow(
    supabase,
    claimId,
    {
      status: 'Approved',
      manager_id: user.id,
      approved_by: 'manager',
      updated_at: new Date().toISOString(),
    },
    'Failed to approve claim'
  )

  // Try to fetch the updated claim, but don't fail if RLS blocks the read
  const { data, error } = await supabase.from('claims').select('*').eq('id', claimId).maybeSingle()
  if (error || !data) {
    // RLS may block SELECT after UPDATE - return optimistic result
    console.log('approveClaim: Could not fetch updated claim due to RLS, returning optimistic result')
    return buildOptimisticClaim(claimId, 'Approved')
  }

  return mapClaim(data as DbClaim)
}

export async function rejectClaim(claimId: string, remarks?: string): Promise<ManagerClaim> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()

  // Fetch claim first to validate against policy
  const { data: claimData } = await supabase.from('claims').select('*').eq('id', claimId).maybeSingle()
  if (claimData) {
    const claim = mapClaim(claimData as DbClaim)
    
    // Policy validation: Check if claim is within auto-approval limit
    const autoApprovalLimit = user.user_metadata?.auto_approval_limit || 5000
    if (claim.amount <= autoApprovalLimit) {
      throw new Error(`Claim is within auto-approval limit (₹${autoApprovalLimit}). Should be auto-approved instead of rejected.`)
    }
  }

  await updateClaimRow(
    supabase,
    claimId,
    {
      status: 'Rejected',
      manager_id: user.id,
      updated_at: new Date().toISOString(),
    },
    'Failed to reject claim'
  )

  // Try to fetch the updated claim, but don't fail if RLS blocks the read
  const { data, error } = await supabase.from('claims').select('*').eq('id', claimId).maybeSingle()
  if (error || !data) {
    // RLS may block SELECT after UPDATE - return optimistic result
    console.log('rejectClaim: Could not fetch updated claim due to RLS, returning optimistic result')
    return buildOptimisticClaim(claimId, 'Rejected')
  }

  return mapClaim(data as DbClaim)
}

export async function financeApproveClaim(claimId: string, remarks?: string): Promise<ManagerClaim> {
  await requireUser()
  const supabase = getSupabaseBrowserClient()

  await updateClaimRow(
    supabase,
    claimId,
    {
      status: 'Paid',
      updated_at: new Date().toISOString(),
    },
    'Failed to mark claim as paid'
  )

  const { data, error } = await supabase.from('claims').select('*').eq('id', claimId).maybeSingle()
  if (error) return buildOptimisticClaim(claimId, 'Paid')
  if (!data) return buildOptimisticClaim(claimId, 'Paid')

  return mapClaim(data as DbClaim)
}

export async function financeRejectClaim(claimId: string, remarks?: string): Promise<ManagerClaim> {
  await requireUser()
  const supabase = getSupabaseBrowserClient()

  await updateClaimRow(
    supabase,
    claimId,
    {
      status: 'Rejected',
      updated_at: new Date().toISOString(),
    },
    'Failed to reject claim'
  )

  const { data, error } = await supabase.from('claims').select('*').eq('id', claimId).maybeSingle()
  if (error) return buildOptimisticClaim(claimId, 'Rejected')
  if (!data) return buildOptimisticClaim(claimId, 'Rejected')

  return mapClaim(data as DbClaim)
}

export async function fetchClaimById(claimId: string): Promise<ManagerClaim | null> {
  await requireUser()
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapClaim(data as DbClaim)
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

export async function createManagerClaim(input: CreateClaimInput): Promise<ManagerClaim> {
  const [user, profile] = await Promise.all([requireUser(), fetchManagerProfile()])
  const supabase = getSupabaseBrowserClient()

  // Generate claim number
  const timestamp = Date.now()
  const claimNumber = `EXP-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}`

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
  }

  console.log('Creating manager claim with payload:', payload)

  const { data, error } = await supabase
    .from('claims')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw error
  }

  return mapClaim(data as DbClaim)
}

export async function fetchDashboardHomeData() {
  const [profile, claims] = await Promise.all([fetchManagerProfile(), fetchAllClaims()])

  return {
    profile,
    claims,
    stats: buildDashboardStats(claims),
  }
}
