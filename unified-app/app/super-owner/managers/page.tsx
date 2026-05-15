"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Manager {
  id: string
  name: string
  email: string
  teamSize: number
  approvedClaims: number
  pendingClaims: number
  rejectedClaims: number
  status: string
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchManagers() {
      try {
        console.log('Fetching managers...')
        
        // Try a simpler query first - just get all manager_teams
        const { data: teamData, error: teamError } = await supabase
          .from('manager_teams')
          .select('*')
        
        console.log('Team data:', teamData, 'Error:', teamError)
        if (teamError) {
          console.error('Team query failed:', teamError)
          throw teamError
        }

        // Get unique manager IDs from manager_teams
        const uniqueManagerIds = new Set()
        const managerMap = new Map()
        
        if (teamData) {
          teamData.forEach((team: any) => {
            const managerId = team.manager_user_id || team.manager_id
            if (managerId) {
              uniqueManagerIds.add(managerId)
              if (!managerMap.has(managerId)) {
                managerMap.set(managerId, {
                  name: team.manager_name || 'Unknown Manager',
                  id: managerId
                })
              }
            }
          })
        }

        console.log('Unique manager IDs:', Array.from(uniqueManagerIds))
        console.log('Manager map:', Array.from(managerMap.entries()))

        // Convert to array and fetch stats for each
        const managerIds = Array.from(uniqueManagerIds)
        
        if (managerIds.length === 0) {
          console.log('No managers found in manager_teams')
          setManagers([])
          setLoading(false)
          return
        }
        
        const managersWithStats = await Promise.all(
          managerIds.map(async (managerId) => {
            const managerInfo = managerMap.get(managerId)
            
            // Get team size from manager_teams
            const { data: teamSizeData, error: teamSizeError } = await supabase
              .from('manager_teams')
              .select('employee_id')
              .eq('manager_user_id', managerId)

            if (teamSizeError) {
              console.error('Team size query failed for manager', managerId, teamSizeError)
            }

            const teamSize = teamSizeData?.length || 0

            // Get claim statistics
            const { data: claimsData, error: claimsError } = await supabase
              .from('claims')
              .select('status')
              .eq('manager_id', managerId)

            if (claimsError) {
              console.error('Claims query failed for manager', managerId, claimsError)
            }

            const approvedClaims = claimsData?.filter(c => c.status === 'Approved').length || 0
            const pendingClaims = claimsData?.filter(c => c.status === 'Pending' || c.status === 'Submitted').length || 0
            const rejectedClaims = claimsData?.filter(c => c.status === 'Rejected').length || 0

            return {
              id: String(managerId),
              name: managerInfo?.name || 'Unknown Manager',
              email: 'N/A',
              teamSize,
              approvedClaims,
              pendingClaims,
              rejectedClaims,
              status: 'active' // Default to active since we can't check on_leave without profiles
            }
          })
        )

        console.log('Managers with stats:', managersWithStats)
        setManagers(managersWithStats)
      } catch (error) {
        console.error('Error fetching managers:', error)
        setManagers([])
      } finally {
        setLoading(false)
      }
    }

    fetchManagers()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading managers data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
          Managers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all managers across the organization
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Managers</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {managers.filter(m => m.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Leave</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {managers.filter(m => m.status === 'on_leave').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Team Size</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {managers.reduce((sum, m) => sum + m.teamSize, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Managers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Managers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {managers.map((manager) => (
              <Link
                key={manager.id}
                href={`/super-owner/managers/${manager.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                      {manager.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{manager.name}</h3>
                        {manager.status === 'on_leave' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            On Leave
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{manager.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Team Size</p>
                      <p className="font-semibold">{manager.teamSize}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Approved</p>
                      <p className="font-semibold text-emerald-500">{manager.approvedClaims}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="font-semibold text-amber-500">{manager.pendingClaims}</p>
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
