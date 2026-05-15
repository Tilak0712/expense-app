'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthRequiredError } from './manager-supabase-data'

export interface TeamAssignment {
  id: string
  managerId: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  assignedAt: string
}

// Helper to get full name from profile (handles both full_name and first_name/last_name)
function getFullName(profile: any): string {
  return profile?.full_name || 
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
    'Unknown'
}

/**
 * Add an employee to manager's team using their employee ID
 */
export async function addTeamMember(employeeId: string): Promise<TeamAssignment> {
  const supabase = getSupabaseBrowserClient()
  
  // Get current user (manager)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new AuthRequiredError()
  
  // Get manager's profile (or use user metadata as fallback)
  const { data: managerProfile } = await supabase
    .from('profiles')
    .select('id, employee_id')
    .eq('user_id', user.id)
    .maybeSingle()
  
  // Use user.id as manager reference if profile not in DB (RLS fallback)
  const managerRefId = managerProfile?.id || user.id
  
  // Find employee by their employee_id
  let employeeProfile = null
  
  // Try exact match first
  const { data: byId } = await supabase
    .from('profiles')
    .select('id, user_id, first_name, last_name, email, employee_id')
    .eq('employee_id', employeeId)
    .neq('role', 'manager')
    .maybeSingle()
  
  if (byId) {
    employeeProfile = byId
  } else {
    // Try partial match (case insensitive)
    const { data: partialMatch } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email, employee_id')
      .ilike('employee_id', `%${employeeId}%`)
      .neq('role', 'manager')
      .maybeSingle()
    
    if (partialMatch) {
      employeeProfile = partialMatch
    }
  }
  
  if (!employeeProfile) {
    throw new Error(
      `Employee "${employeeId}" not found. ` +
      `Make sure they have logged in at least once and their profile was created. ` +
      `Ask them to check their Employee ID in their Profile page.`
    )
  }
  
  // Use metadata-based team storage (works with or without DB table)
  const currentTeam = (user.user_metadata?.team_members || []) as string[]
  
  if (currentTeam.includes(employeeProfile.id)) {
    throw new Error('Employee is already in your team')
  }
  const { data: otherManager } = await supabase
    .from('team_members')
    .select('manager_id')
    .eq('employee_id', employeeProfile.id)
    .maybeSingle()
  
  if (otherManager) {
    throw new Error('Employee is already assigned to another manager')
  }
  
  // Add to team_members table
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      manager_id: managerRefId,
      employee_id: employeeProfile.id,
    })
    .select('*, employee:profiles!employee_id(id, first_name, last_name, email)')
    .single()
  
  if (error) {
    // If table doesn't exist or RLS error, store in user_metadata as fallback
    const errorMsg = error.message?.toLowerCase() || ''
    if (errorMsg.includes('team_members') || 
        errorMsg.includes('relation') || 
        errorMsg.includes('schema cache') ||
        errorMsg.includes('row-level security') ||
        errorMsg.includes('rls')) {
      return await addTeamMemberToMetadata(user.id, employeeProfile)
    }
    throw new Error('Failed to add team member: ' + error.message)
  }
  
  return {
    id: data.id,
    managerId: data.manager_id,
    employeeId: data.employee_id,
    employeeName: getFullName(data.employee),
    employeeEmail: data.employee?.email || '',
    assignedAt: data.created_at,
  }
}

/**
 * Fallback: Store team assignment in user metadata
 */
async function addTeamMemberToMetadata(managerUserId: string, employeeProfile: any): Promise<TeamAssignment> {
  const supabase = getSupabaseBrowserClient()
  
  // Get current metadata
  const { data: { user } } = await supabase.auth.getUser()
  const currentTeam = (user?.user_metadata?.team_members || []) as string[]
  
  if (currentTeam.includes(employeeProfile.id)) {
    throw new Error('Employee is already in your team')
  }
  
  // Update metadata with new team member
  const newTeam = [...currentTeam, employeeProfile.id]
  const { error } = await supabase.auth.updateUser({
    data: { team_members: newTeam }
  })
  
  if (error) throw new Error('Failed to update team: ' + error.message)
  
  // Also update employee's profile to point to this manager
  await supabase
    .from('profiles')
    .update({ manager_id: managerUserId })
    .eq('id', employeeProfile.id)
  
  return {
    id: crypto.randomUUID(),
    managerId: managerUserId,
    employeeId: employeeProfile.id,
    employeeName: getFullName(employeeProfile),
    employeeEmail: employeeProfile.email,
    assignedAt: new Date().toISOString(),
  }
}

/**
 * Remove employee from manager's team
 */
export async function removeTeamMember(employeeId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new AuthRequiredError()
  
  // Get manager's profile (or use user.id as fallback)
  const { data: managerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  
  const managerRefId = managerProfile?.id || user.id
  
  // Try to remove from team_members table
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('manager_id', managerRefId)
    .eq('employee_id', employeeId)
  
  if (error) {
    const errorMsg = error.message?.toLowerCase() || ''
    if (errorMsg.includes('team_members') || 
        errorMsg.includes('relation') || 
        errorMsg.includes('schema cache') ||
        errorMsg.includes('row-level security') ||
        errorMsg.includes('rls')) {
    // Fallback: remove from metadata
    const currentTeam = (user.user_metadata?.team_members || []) as string[]
    const newTeam = currentTeam.filter(id => id !== employeeId)
    await supabase.auth.updateUser({
      data: { team_members: newTeam }
    })
    } else {
      throw new Error('Failed to remove team member: ' + error.message)
    }
  }
}

/**
 * Get all team members for current manager
 */
export async function fetchManagerTeam(): Promise<TeamAssignment[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new AuthRequiredError()
  
  // Get manager's profile (or use user.id as fallback)
  const { data: managerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  
  const managerRefId = managerProfile?.id || user.id
  
  // Try team_members table first
  const { data, error } = await supabase
    .from('team_members')
    .select('*, employee:profiles!employee_id(id, first_name, last_name, email, employee_id)')
    .eq('manager_id', managerRefId)
  
  if (error) {
    const errorMsg = error.message?.toLowerCase() || ''
    if (errorMsg.includes('team_members') || 
        errorMsg.includes('relation') || 
        errorMsg.includes('schema cache') ||
        errorMsg.includes('row-level security') ||
        errorMsg.includes('rls')) {
      // Fallback: get from metadata
      const teamIds = (user.user_metadata?.team_members || []) as string[]
      if (teamIds.length === 0) return []
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, employee_id')
        .in('id', teamIds)
      
      return (profiles || []).map(p => ({
        id: p.id,
        managerId: managerRefId,
        employeeId: p.id,
        employeeName: getFullName(p),
        employeeEmail: p.email,
        assignedAt: new Date().toISOString(),
      }))
    }
    throw new Error('Failed to fetch team: ' + error.message)
  }
  
  return (data || []).map(item => ({
    id: item.id,
    managerId: item.manager_id,
    employeeId: item.employee_id,
    employeeName: getFullName(item.employee),
    employeeEmail: item.employee?.email || '',
    assignedAt: item.created_at,
  }))
}

/**
 * Get employee IDs that belong to a manager (for filtering claims)
 */
export async function fetchManagerTeamEmployeeIds(): Promise<string[]> {
  const team = await fetchManagerTeam()
  return team.map(t => t.employeeId)
}
