"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, CheckCircle, XCircle, Clock, ChevronRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"

interface TeamMember {
  id: string
  name: string
  email: string
  claims: number
  pending: number
}

export default function ManagerDetailPage() {
  const params = useParams()
  const id = params.id as string
  
  const [manager, setManager] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [approvedClaims, setApprovedClaims] = useState(0)
  const [pendingClaims, setPendingClaims] = useState(0)
  const [rejectedClaims, setRejectedClaims] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching manager with ID:', id)
        
        // Try to fetch manager by user_id first (from manager_teams)
        let managerData = null
        let managerError = null
        
        const { data: profileByUserId, error: userIdError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', id)
          .single()

        console.log('Profile by user_id:', profileByUserId, 'Error:', userIdError)

        if (profileByUserId) {
          managerData = profileByUserId
        } else {
          // Try by id if user_id didn't work
          const { data: profileById, error: idError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single()

          console.log('Profile by id:', profileById, 'Error:', idError)
          managerData = profileById
          managerError = idError
        }

        if (managerError) throw managerError
        if (!managerData) {
          console.log('Manager not found, trying to get from manager_teams')
          // Fallback: get manager info from manager_teams
          const { data: teamData } = await supabase
            .from('manager_teams')
            .select('*')
            .eq('manager_user_id', id)
            .limit(1)
            .single()

          if (teamData) {
            setManager({
              id: id,
              full_name: teamData.manager_name || 'Unknown Manager',
              email: 'N/A',
              department: teamData.department || 'N/A',
              user_id: id
            })
          }
          setLoading(false)
          return
        }

        setManager(managerData)

        // Fetch team members from manager_teams
        const { data: teamMembersData } = await supabase
          .from('manager_teams')
          .select('*')
          .eq('manager_user_id', managerData.user_id || id)

        console.log('Team members data:', teamMembersData)

        // Fetch claim statistics for this manager
        const { data: claimsData } = await supabase
          .from('claims')
          .select('status, amount')
          .eq('manager_id', managerData.user_id || id)

        setApprovedClaims(claimsData?.filter(c => c.status === 'Approved').length || 0)
        setPendingClaims(claimsData?.filter(c => c.status === 'Pending' || c.status === 'Submitted').length || 0)
        setRejectedClaims(claimsData?.filter(c => c.status === 'Rejected').length || 0)

        // Get team member profiles and their claim counts
        const members = await Promise.all(
          (teamMembersData || []).map(async (teamMember) => {
            console.log('Fetching employee for teamMember:', teamMember)
            
            let employeeProfile = null
            
            // Try to get employee profile by UUID (employee_user_id or employee_id if it's a UUID)
            const uuidId = teamMember.employee_user_id || (teamMember.employee_id && teamMember.employee_id.includes('-') ? teamMember.employee_id : null)
            
            if (uuidId) {
              const { data: profileByUuid } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uuidId)
                .single()

              console.log('Profile by UUID:', profileByUuid)
              employeeProfile = profileByUuid
            }

            // If not found by UUID, try by employee_id
            if (!employeeProfile && teamMember.employee_id) {
              const { data: profileByEmployeeId } = await supabase
                .from('profiles')
                .select('*')
                .eq('employee_id', teamMember.employee_id)
                .single()

              console.log('Profile by employee_id:', profileByEmployeeId)
              employeeProfile = profileByEmployeeId
            }

            let totalClaims = 0
            let pendingClaims = 0

            if (employeeProfile) {
              // Get employee's claims
              const { data: employeeClaims } = await supabase
                .from('claims')
                .select('status')
                .eq('employee_id', employeeProfile.id)

              totalClaims = employeeClaims?.length || 0
              pendingClaims = employeeClaims?.filter(c => c.status === 'Pending' || c.status === 'Submitted').length || 0
            }

            return {
              id: employeeProfile?.id || teamMember.employee_user_id || teamMember.employee_id || teamMember.id,
              name: employeeProfile?.full_name || teamMember.employee_name || teamMember.employee_id,
              email: employeeProfile?.email || '',
              claims: totalClaims,
              pending: pendingClaims
            }
          })
        )

        console.log('Final team members:', members)
        setTeamMembers(members)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading manager data...</p>
        </div>
      </div>
    )
  }

  if (!manager) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Manager not found</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Back Button */}
      <Link href="/super-owner/managers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Managers
      </Link>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
          {manager.full_name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {manager.email} • {manager.department || 'No department'}
        </p>
      </div>

      {/* Manager Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{approvedClaims}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingClaims}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedClaims}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <Link
                key={member.id}
                href={`/super-owner/managers/${manager.id}/team/${member.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {member.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Claims</p>
                      <p className="font-semibold">{member.claims}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="font-semibold text-amber-500">{member.pending}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
