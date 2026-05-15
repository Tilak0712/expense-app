'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { fetchManagerTeamEmployeeIds } from '@/lib/dashboard/team-management-v2'
import { getSessionFromStorage, validateSession, redirectToLogin } from '@/lib/auth/session-manager'

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
  employee_id?: string
  approval_tier?: number
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
    employee_id: data.employee_id,
    approval_tier: data.approval_tier || 1,
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
      : Promise.resolve({ data: [] as DbProfile[], error: null } as any),
    employeeIdRefs.length > 0
      ? supabase.from('profiles').select('id, employee_id, full_name').in('employee_id', employeeIdRefs)
      : Promise.resolve({ data: [] as DbProfile[], error: null } as any),
  ])

  const byIdMap = new Map((profilesByIdResult.data || []).map((profile: any) => [profile.id, profile as DbProfile]))
  const byEmployeeIdMap = new Map(
    (profilesByEmployeeIdResult.data || []).map((profile: any) => [profile.employee_id, profile as DbProfile])
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
  const { data: { session: supabaseSession } } = await supabase.auth.getSession()

  if (!supabaseSession) {
    throw new AuthRequiredError()
  }

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

  return mapProfile(finalData as DbProfile, user)
}

export async function fetchAllClaims(): Promise<ManagerClaim[]> {
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()
  
  // 1. Fetch the team list first to ensure we only see our own team
  let teamEmployeeRefs: string[] = []
  try {
    teamEmployeeRefs = await fetchManagerTeamEmployeeIds()
  } catch (err) {
    console.error('Failed to fetch team refs:', err)
    const metadataTeam = (user.user_metadata?.team_members || []) as Array<{ id: string; empId: string }>
    teamEmployeeRefs = metadataTeam.map((t) => t.empId).filter(Boolean)
  }

  // Add the manager's own ID to the list so they can see their own claims (for tracking, not for approval)
  // However, self-approvals are blocked elsewhere.
  const allAllowedRefs = [...new Set([...teamEmployeeRefs, user.id].filter(Boolean))]
  const uuidRefs = allAllowedRefs.filter(looksLikeUuid)
  const displayIdRefs = allAllowedRefs.filter(id => !looksLikeUuid(id))

  // 2. Perform a combined query that covers manager_id OR team member IDs
  // We use multiple queries and merge them to handle the complex OR condition across tables
  
  // Query 1: Claims explicitly assigned to this manager
  const managerQuery = supabase
    .from('claims')
    .select('*')
    .eq('manager_id', user.id)
    .order('created_at', { ascending: false })

  // Query 2: Claims from team members (using UUIDs)
  const employeeUuidQuery =
    uuidRefs.length > 0
      ? supabase
          .from('claims')
          .select('*')
          .in('employee_id', uuidRefs)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any)

  // Query 3: Resolve display IDs (EMP-XXX) to UUIDs then query
  let resolvedUuids: string[] = []
  if (displayIdRefs.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, user_id')
      .in('employee_id', displayIdRefs)
    if (profileRows && profileRows.length > 0) {
      resolvedUuids = profileRows
        .map((row: any) => row.user_id || row.id)
        .filter((id: any): id is string => typeof id === 'string' && looksLikeUuid(id))
    }
  }

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

  // 3. Merge and deduplicate results
  const merged = [
    ...((managerResult.data as DbClaim[] | null) ?? []),
    ...((uuidResult.data as DbClaim[] | null) ?? []),
    ...((codeResult.data as DbClaim[] | null) ?? []),
  ]

  // IMPORTANT: Final strict filter to ensure NO manager sees another manager's self-claims
  // even if they were accidentally returned. 
  // Peer-level isolation: Only show if I am the manager OR it's my team member.
  const uniqueClaims = Array.from(new Map(merged.map((claim) => [claim.id, claim])).values())
  
  const filteredClaims = uniqueClaims.filter((claim) => {
    // 1. If I am the manager, I can see it.
    if (claim.manager_id === user.id) return true
    
    // 2. If the employee is in my team, I can see it.
    const isTeamMember = allAllowedRefs.includes(claim.employee_id) || resolvedUuids.includes(claim.employee_id)
    if (isTeamMember) return true

    // 3. If it's my own claim, I can see it.
    if (claim.employee_id === user.id) return true

    return false
  }).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return enrichClaimEmployeeNames(supabase, filteredClaims)
}

export async function fetchPendingClaims(): Promise<ManagerClaim[]> {
  const user = await requireUser()
  const allClaims = await fetchAllClaims()
  return allClaims.filter((c) => 
    (c.status === 'Pending' || c.status === 'Submitted') &&
    // EXCLUDE manager's own claims - they must be approved by Super Owner
    c.employeeId !== user.id &&
    (c as any).approval_tier !== 2 &&
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
  const user = await requireUser()
  const supabase = getSupabaseBrowserClient()

  // 1. Fetch the team list first to ensure we only see our own team
  let teamEmployeeRefs: string[] = []
  try {
    teamEmployeeRefs = await fetchManagerTeamEmployeeIds()
  } catch (err) {
    console.error('Failed to fetch team refs for members:', err)
    const metadataTeam = (user.user_metadata?.team_members || []) as Array<{ id: string; empId: string }>
    teamEmployeeRefs = metadataTeam.map((t) => t.empId).filter(Boolean)
  }

  if (teamEmployeeRefs.length === 0) return []

  const uuidRefs = teamEmployeeRefs.filter(looksLikeUuid)
  const displayIdRefs = teamEmployeeRefs.filter(id => !looksLikeUuid(id))

  // 2. Fetch profiles for these team members
  let profiles: DbProfile[] = []
  
  const [uuidProfilesResult, displayIdProfilesResult] = await Promise.all([
    uuidRefs.length > 0 
      ? supabase.from('profiles').select('*').in('id', uuidRefs)
      : Promise.resolve({ data: [], error: null }),
    displayIdRefs.length > 0
      ? supabase.from('profiles').select('*').in('employee_id', displayIdRefs)
      : Promise.resolve({ data: [], error: null })
  ])

  profiles = [
    ...((uuidProfilesResult.data as DbProfile[]) || []),
    ...((displayIdProfilesResult.data as DbProfile[]) || [])
  ]

  // Deduplicate by profile ID
  const uniqueProfiles = Array.from(new Map(profiles.map(p => [p.id, p])).values())

  if (uniqueProfiles.length === 0) return []

  // 3. Get claim counts for these specific profiles
  const profileEmployeeIds = uniqueProfiles.map(p => p.employee_id).filter(Boolean)
  const profileUserIds = uniqueProfiles.map(p => p.id).filter(Boolean)
  const allRefsForClaims = [...new Set([...profileEmployeeIds, ...profileUserIds])]

  const { data: claimsData } = await supabase
    .from('claims')
    .select('employee_id, status, amount')
    .in('employee_id', allRefsForClaims)

  const claims = (claimsData as { employee_id: string; status: string; amount: number }[]) || []

  return uniqueProfiles.map((profile) => {
    // A claim might be linked by profile.id (UUID) or profile.employee_id (EMP-XXX)
    const userClaims = claims.filter((c) => 
      c.employee_id === profile.id || 
      c.employee_id === profile.employee_id
    )
    
    const pendingCount = userClaims.filter((c) => c.status === 'Submitted' || c.status === 'Pending').length
    const totalAmount = userClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

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
  }).sort((a, b) => b.totalAmount - a.totalAmount)
}

export function buildDashboardStats(claims: ManagerClaim[], currentUserUuid?: string): DashboardStats {
  const pending = claims.filter((c) => 
    (c.status === 'Pending' || c.status === 'Submitted') &&
    // Exclude self-claims from the pending count for the manager
    c.employee_id !== currentUserUuid &&
    c.approval_tier !== 2
  )
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
    
    // SECURITY GUARD: Prevention of Self-Approval
    if (claim.employeeId === user.id) {
      throw new Error('Self-approval is strictly prohibited. Your claims must be approved by a Super Owner.')
    }

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
    
    // SECURITY GUARD: Prevention of Self-Rejection (optional but good for consistency)
    if (claim.employeeId === user.id) {
      throw new Error('You cannot reject your own claims through the manager portal.')
    }

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
    // Manager's own claims require Super Owner approval (tier 2)
    approval_tier: input.status === 'submitted' ? 2 : 1,
    manager_id: user.id, // Self-reference so it's visible in manager's view
    approved_by: null, // Must be approved by Super Owner
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
