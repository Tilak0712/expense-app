'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required')
    this.name = 'AuthRequiredError'
  }
}

export interface TeamMember {
  id: string
  managerUserId: string
  employeeUserId: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  department?: string
  addedAt: string
}

type TeamMetadataEntry = {
  id?: string | null
  empId?: string | null
  pending?: boolean
}

function getFullName(profile: any): string {
  return profile?.full_name || 'Unknown'
}

function isMissingColumn(error: any, column: string): boolean {
  const msg = (error?.message || '').toLowerCase()
  return msg.includes(column.toLowerCase()) && (msg.includes('does not exist') || msg.includes('column'))
}

function isMissingRelation(error: any): boolean {
  const msg = (error?.message || '').toLowerCase()
  return msg.includes('relation') && msg.includes('does not exist')
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function extractEmployeeIdToken(value: string): string | null {
  const match = value.toUpperCase().match(/EMP-\d+/)
  return match ? match[0] : null
}

function normalizeEmployeeId(rawEmployeeId: string): string {
  const trimmed = rawEmployeeId.trim().toUpperCase()

  if (!trimmed) {
    throw new Error('Employee ID is required')
  }

  if (trimmed.startsWith('EMP-')) {
    return trimmed
  }

  if (/^\d+$/.test(trimmed)) {
    return `EMP-${trimmed}`
  }

  throw new Error('Invalid Employee ID format. Use format: EMP-1234')
}

function normalizeMetadataEntries(raw: unknown): TeamMetadataEntry[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        return { id: entry, empId: entry }
      }

      if (entry && typeof entry === 'object') {
        const item = entry as Record<string, unknown>
        return {
          id: typeof item.id === 'string' ? item.id : null,
          empId: typeof item.empId === 'string' ? item.empId : null,
          pending: Boolean(item.pending),
        }
      }

      return null
    })
    .filter(Boolean) as TeamMetadataEntry[]
}

async function findEmployeeProfileByEmployeeId(supabase: any, employeeId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, employee_id, full_name, email')
    .eq('employee_id', employeeId)
    .limit(1)

  if (error) return null
  return data?.[0] || null
}

async function getManagerName(supabase: any, user: any): Promise<string> {
  const fallback = user.email?.split('@')[0] || 'Manager'

  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  return data?.full_name || fallback
}

async function insertIntoManagerTeams(
  supabase: any,
  user: any,
  employeeProfile: any,
  employeeId: string,
  department: string | null,
  managerName: string
): Promise<{ data: any | null; error: any | null }> {
  const employeeUserId = employeeProfile?.user_id || employeeProfile?.id || null
  const cleanDepartment = department?.trim() || null

  const payloads: Array<Record<string, any>> = [
    {
      manager_user_id: user.id,
      employee_user_id: employeeUserId,
      employee_id: employeeId,
      added_by: user.id,
      ...(cleanDepartment ? { department: cleanDepartment } : {}),
      manager_name: managerName,
    },
    {
      manager_user_id: user.id,
      employee_user_id: employeeUserId,
      employee_id: employeeId,
      added_by: user.id,
    },
    {
      manager_user_id: user.id,
      employee_id: employeeId,
    },
    {
      manager_id: user.id,
      employee_id: employeeId,
      employee_user_id: employeeUserId,
      employee_name: employeeProfile ? getFullName(employeeProfile) : null,
      employee_email: employeeProfile?.email || null,
      ...(cleanDepartment ? { department: cleanDepartment } : {}),
      manager_name: managerName,
    },
    {
      manager_id: user.id,
      employee_id: employeeId,
      employee_user_id: employeeUserId,
    },
    {
      manager_id: user.id,
      employee_id: employeeId,
    },
  ]

  let lastError: any = null

  for (const payload of payloads) {
    const { data, error } = await supabase.from('manager_teams').insert(payload).select('*').single()

    if (!error) {
      return { data, error: null }
    }

    lastError = error
    const errorMsg = (error.message || '').toLowerCase()

    const schemaMismatch =
      errorMsg.includes('column') ||
      errorMsg.includes('does not exist') ||
      errorMsg.includes('null value in column')

    if (!schemaMismatch) {
      return { data: null, error }
    }
  }

  return { data: null, error: lastError }
}

export async function addTeamMember(employeeId: string, department: string): Promise<TeamMember> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new AuthRequiredError()

  const searchId = normalizeEmployeeId(employeeId)
  const cleanDepartment = department?.trim() || null
  const employeeProfile = await findEmployeeProfileByEmployeeId(supabase, searchId)
  const managerName = await getManagerName(supabase, user)

  // Duplicate guard across old/new schemas.
  const existingNew = await supabase
    .from('manager_teams')
    .select('id')
    .eq('manager_user_id', user.id)
    .eq('employee_id', searchId)
    .limit(1)

  if (existingNew.error && isMissingColumn(existingNew.error, 'manager_user_id')) {
    const existingOld = await supabase
      .from('manager_teams')
      .select('id')
      .eq('manager_id', user.id)
      .eq('employee_id', searchId)
      .limit(1)

    if (existingOld.data && existingOld.data.length > 0) {
      throw new Error('Employee is already in your team')
    }
  } else if (existingNew.data && existingNew.data.length > 0) {
    throw new Error('Employee is already in your team')
  }

  const { data, error } = await insertIntoManagerTeams(
    supabase,
    user,
    employeeProfile,
    searchId,
    cleanDepartment,
    managerName
  )

  if (error) {
    if (employeeProfile?.id || employeeProfile?.user_id) {
      return addTeamMemberToMetadata(user.id, employeeProfile, cleanDepartment, supabase)
    }
    return addPendingTeamMember(user.id, searchId, cleanDepartment, supabase)
  }

  return {
    id: data.id || crypto.randomUUID(),
    managerUserId: data.manager_user_id || data.manager_id || user.id,
    employeeUserId: data.employee_user_id || employeeProfile?.id || employeeProfile?.user_id || searchId,
    employeeId: data.employee_id || searchId,
    employeeName: employeeProfile ? getFullName(employeeProfile) : data.employee_name || searchId,
    employeeEmail: employeeProfile?.email || data.employee_email || '',
    department: data.department || cleanDepartment || undefined,
    addedAt: data.added_at || data.created_at || new Date().toISOString(),
  }
}

async function addTeamMemberToMetadata(
  managerUserId: string,
  employeeProfile: any,
  department: string | null,
  supabase: any
): Promise<TeamMember> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentTeam = normalizeMetadataEntries(user?.user_metadata?.team_members)
  const employeeIdRef = employeeProfile?.user_id || employeeProfile?.id
  const profileEmployeeId = employeeProfile?.employee_id

  if (!employeeIdRef || !profileEmployeeId) {
    return addPendingTeamMember(managerUserId, profileEmployeeId || 'EMP-UNKNOWN', department, supabase)
  }

  if (currentTeam.some((t) => t.id === employeeIdRef || t.empId === profileEmployeeId)) {
    throw new Error('Employee is already in your team')
  }

  const newTeam = [...currentTeam, { id: employeeIdRef, empId: profileEmployeeId }]
  const { error } = await supabase.auth.updateUser({
    data: { team_members: newTeam },
  })

  if (error) throw new Error('Failed to update team metadata: ' + error.message)

  return {
    id: crypto.randomUUID(),
    managerUserId,
    employeeUserId: employeeIdRef,
    employeeId: profileEmployeeId,
    employeeName: getFullName(employeeProfile),
    employeeEmail: employeeProfile?.email || '',
    department: department || undefined,
    addedAt: new Date().toISOString(),
  }
}

async function addPendingTeamMember(
  managerUserId: string,
  employeeId: string,
  department: string | null,
  supabase: any
): Promise<TeamMember> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentTeam = normalizeMetadataEntries(user?.user_metadata?.team_members)
  const pendingId = `pending-${employeeId}`

  if (currentTeam.some((t) => t.empId === employeeId || t.id === pendingId)) {
    throw new Error('Employee is already in your team')
  }

  const newTeam = [...currentTeam, { id: pendingId, empId: employeeId, pending: true }]
  const { error } = await supabase.auth.updateUser({
    data: { team_members: newTeam },
  })

  if (error) throw new Error('Failed to add team member: ' + error.message)

  return {
    id: pendingId,
    managerUserId,
    employeeUserId: pendingId,
    employeeId,
    employeeName: employeeId,
    employeeEmail: '',
    department: department || undefined,
    addedAt: new Date().toISOString(),
  }
}

export async function removeTeamMember(employeeUserId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new AuthRequiredError()
  if (!employeeUserId) throw new Error('Invalid employee reference')

  const rawRef = employeeUserId.trim()
  const employeeIdToken = extractEmployeeIdToken(rawRef)
  const employeeRefCandidates = Array.from(
    new Set(
      [
        rawRef,
        employeeIdToken,
        employeeIdToken ? `pending-${employeeIdToken}` : null,
      ].filter(Boolean) as string[]
    )
  )

  let dbDeleteError: any = null

  if (!rawRef.startsWith('pending-')) {
    let deleteNew: any
    if (looksLikeUuid(rawRef)) {
      deleteNew = await supabase
        .from('manager_teams')
        .delete()
        .eq('manager_user_id', user.id)
        .or(`employee_user_id.eq.${rawRef},employee_id.eq.${rawRef}`)
    } else if (employeeIdToken) {
      deleteNew = await supabase
        .from('manager_teams')
        .delete()
        .eq('manager_user_id', user.id)
        .eq('employee_id', employeeIdToken)
    } else {
      deleteNew = await supabase
        .from('manager_teams')
        .delete()
        .eq('manager_user_id', user.id)
        .eq('employee_id', rawRef)
    }

    if (deleteNew.error && isMissingColumn(deleteNew.error, 'manager_user_id')) {
      let deleteOld: any
      if (looksLikeUuid(rawRef)) {
        deleteOld = await supabase
          .from('manager_teams')
          .delete()
          .eq('manager_id', user.id)
          .or(`employee_user_id.eq.${rawRef},employee_id.eq.${rawRef}`)
      } else if (employeeIdToken) {
        deleteOld = await supabase
          .from('manager_teams')
          .delete()
          .eq('manager_id', user.id)
          .eq('employee_id', employeeIdToken)
      } else {
        deleteOld = await supabase
          .from('manager_teams')
          .delete()
          .eq('manager_id', user.id)
          .eq('employee_id', rawRef)
      }
      dbDeleteError = deleteOld.error
    } else {
      dbDeleteError = deleteNew.error
    }
  }

  if (dbDeleteError && !isMissingRelation(dbDeleteError)) {
    throw new Error('Failed to remove team member: ' + dbDeleteError.message)
  }

  // Always clean metadata as well so mixed storage modes stay consistent.
  const currentTeam = normalizeMetadataEntries(user.user_metadata?.team_members)
  const filteredTeam = currentTeam.filter(
    (member) => !employeeRefCandidates.includes(member.id || '') && !employeeRefCandidates.includes(member.empId || '')
  )

  if (filteredTeam.length !== currentTeam.length) {
    const { error } = await supabase.auth.updateUser({
      data: { team_members: filteredTeam },
    })

    if (error) {
      throw new Error('Failed to remove team member metadata: ' + error.message)
    }
  }
}

async function queryManagerTeams(supabase: any, managerUserId: string): Promise<{
  schema: 'new' | 'old'
  data: any[] | null
  error: any | null
}> {
  const attempts: Array<{
    schema: 'new' | 'old'
    managerColumn: 'manager_user_id' | 'manager_id'
    orderColumn?: 'added_at' | 'created_at'
  }> = [
    { schema: 'new', managerColumn: 'manager_user_id', orderColumn: 'added_at' },
    { schema: 'new', managerColumn: 'manager_user_id' },
    { schema: 'old', managerColumn: 'manager_id', orderColumn: 'created_at' },
    { schema: 'old', managerColumn: 'manager_id' },
  ]

  let lastError: any = null

  for (const attempt of attempts) {
    let query = supabase.from('manager_teams').select('*').eq(attempt.managerColumn, managerUserId)

    if (attempt.orderColumn) {
      query = query.order(attempt.orderColumn, { ascending: false })
    }

    const result = await query

    if (!result.error) {
      return { schema: attempt.schema, data: result.data || [], error: null }
    }

    lastError = result.error

    if (isMissingRelation(result.error)) {
      return { schema: attempt.schema, data: null, error: result.error }
    }

    const missingManagerColumn = isMissingColumn(result.error, attempt.managerColumn)
    const missingOrderColumn = attempt.orderColumn ? isMissingColumn(result.error, attempt.orderColumn) : false

    if (missingManagerColumn || missingOrderColumn) {
      continue
    }
  }

  return { schema: 'new', data: null, error: lastError }
}

export async function fetchManagerTeam(): Promise<TeamMember[]> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new AuthRequiredError()

  const queryResult = await queryManagerTeams(supabase, user.id)

  if (queryResult.error) {
    if (isMissingRelation(queryResult.error)) {
      return fetchTeamFromMetadata(user, supabase)
    }
    throw new Error('Failed to fetch team: ' + queryResult.error.message)
  }

  const rows = queryResult.data || []
  if (rows.length === 0) {
    return fetchTeamFromMetadata(user, supabase)
  }

  const userIdCandidates = [...new Set(rows.map((row) => row.employee_user_id).filter(Boolean))].filter(looksLikeUuid)
  const employeeIdCandidates = [...new Set(rows.map((row) => row.employee_id).filter(Boolean))]

  let profilesByUserId: any[] = []
  if (userIdCandidates.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, employee_id')
      .in('id', userIdCandidates)
    profilesByUserId = data || []
  }

  let profilesByEmployeeId: any[] = []
  if (employeeIdCandidates.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, employee_id')
      .in('employee_id', employeeIdCandidates)
    profilesByEmployeeId = data || []
  }

  const profileByUserIdMap = new Map(profilesByUserId.map((profile) => [profile.id, profile]))
  const profileByEmployeeIdMap = new Map(profilesByEmployeeId.map((profile) => [profile.employee_id, profile]))

  return rows.map((row) => {
    const profile = row.employee_user_id
      ? profileByUserIdMap.get(row.employee_user_id) || profileByEmployeeIdMap.get(row.employee_id)
      : profileByEmployeeIdMap.get(row.employee_id)

    const employeeId = row.employee_id || profile?.employee_id || 'Unknown'
    const employeeName = profile ? `${getFullName(profile)} (${employeeId})` : row.employee_name || employeeId
    const employeeEmail = profile?.email || row.employee_email || ''

    return {
      id: row.id || crypto.randomUUID(),
      managerUserId: row.manager_user_id || row.manager_id || user.id,
      employeeUserId: row.employee_user_id || profile?.id || employeeId,
      employeeId,
      employeeName,
      employeeEmail,
      department: row.department || undefined,
      addedAt: row.added_at || row.created_at || new Date().toISOString(),
    }
  })
}

async function fetchTeamFromMetadata(user: any, supabase: any): Promise<TeamMember[]> {
  try {
    const teamData = normalizeMetadataEntries(user.user_metadata?.team_members)
    if (teamData.length === 0) return []

    const validUserIds = teamData
      .map((entry) => entry.id || '')
      .filter((id): id is string => Boolean(id) && !id.startsWith('pending-') && looksLikeUuid(id))

    const metadataEmployeeIds = teamData
      .map((entry) => entry.empId || '')
      .filter((id): id is string => Boolean(id) && id.startsWith('EMP-'))

    let profilesByUserId: any[] = []
    if (validUserIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, employee_id')
        .in('id', validUserIds)
      profilesByUserId = data || []
    }

    let profilesByEmployeeId: any[] = []
    if (metadataEmployeeIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, employee_id')
        .in('employee_id', metadataEmployeeIds)
      profilesByEmployeeId = data || []
    }

    const profileByUserIdMap = new Map(profilesByUserId.map((profile) => [profile.id, profile]))
    const profileByEmployeeIdMap = new Map(profilesByEmployeeId.map((profile) => [profile.employee_id, profile]))

    return teamData.map((entry) => {
      const rawId = entry.id || ''
      const empId = entry.empId || 'Unknown'
      const fallbackId = rawId || `pending-${empId}`

      const profile =
        profileByUserIdMap.get(rawId) ||
        profileByEmployeeIdMap.get(empId) ||
        null

      const pending = Boolean(entry.pending) || fallbackId.startsWith('pending-') || !looksLikeUuid(rawId)
      const safeEmployeeId = profile?.employee_id || empId

      return {
        id: fallbackId,
        managerUserId: user.id,
        employeeUserId: pending ? fallbackId : profile?.id || fallbackId,
        employeeId: safeEmployeeId,
        employeeName: pending ? safeEmployeeId : `${getFullName(profile)} (${safeEmployeeId})`,
        employeeEmail: pending ? '' : profile?.email || '',
        addedAt: new Date().toISOString(),
      }
    })
  } catch {
    return []
  }
}

export async function fetchManagerTeamEmployeeIds(): Promise<string[]> {
  const team = await fetchManagerTeam()
  const refs = new Set<string>()

  for (const member of team) {
    if (member.employeeId) refs.add(member.employeeId)
    if (member.employeeUserId && looksLikeUuid(member.employeeUserId)) {
      refs.add(member.employeeUserId)
    }
  }

  return [...refs]
}

export async function searchEmployeeById(searchTerm: string): Promise<
  Array<{
    id: string
    employeeId: string
    name: string
    email: string
  }>
> {
  const supabase = getSupabaseBrowserClient()

  const queryWithRoleFilter = await supabase
    .from('profiles')
    .select('id, full_name, email, employee_id')
    .ilike('employee_id', `%${searchTerm}%`)
    .neq('role', 'manager')
    .limit(10)

  const result =
    queryWithRoleFilter.error && isMissingColumn(queryWithRoleFilter.error, 'role')
      ? await supabase
          .from('profiles')
          .select('id, full_name, email, employee_id')
          .ilike('employee_id', `%${searchTerm}%`)
          .limit(10)
      : queryWithRoleFilter

  if (result.error) throw new Error('Search failed: ' + result.error.message)

  return (result.data || []).map((profile) => ({
    id: profile.id,
    employeeId: profile.employee_id,
    name: getFullName(profile),
    email: profile.email,
  }))
}
