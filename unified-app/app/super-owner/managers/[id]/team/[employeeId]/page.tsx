"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Receipt, CheckCircle, Clock, ArrowLeft, Calendar, DollarSign, Search, ChevronRight, Eye, Download, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { supabase } from "@/lib/supabase"

const statusOptions = ['All Statuses', 'Draft', 'Submitted', 'Pending', 'Approved', 'Paid', 'Rejected']

interface Claim {
  id: string
  claim_number: string
  vendor_name: string
  city: string
  amount: number
  expense_date: string
  category: string
  status: string
  description: string
}

interface Employee {
  id: string
  full_name: string
  email: string
  department: string
  manager_name: string
}

export default function EmployeeClaimsPage() {
  const [selectedFY, setSelectedFY] = useState("2024-2025")
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [isExporting, setIsExporting] = useState(false)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [managerId, setManagerId] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      try {
        // Get employeeId and managerId from URL
        const pathParts = window.location.pathname.split('/')
        const employeeId = pathParts[pathParts.length - 1]
        const currentManagerId = pathParts[pathParts.length - 3]
        setManagerId(currentManagerId)

        console.log('Fetching employee with ID:', employeeId)

        // Try to fetch employee by id first
        let employeeData = null
        const { data: profileById, error: idError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', employeeId)
          .single()

        console.log('Profile by id:', profileById, 'Error:', idError)

        if (profileById) {
          employeeData = profileById
        } else {
          // Try by employee_id if id didn't work
          const { data: profileByEmployeeId, error: employeeIdError } = await supabase
            .from('profiles')
            .select('*')
            .eq('employee_id', employeeId)
            .single()

          console.log('Profile by employee_id:', profileByEmployeeId, 'Error:', employeeIdError)
          employeeData = profileByEmployeeId
        }

        if (employeeData) {
          setEmployee({
            id: employeeData.id,
            full_name: employeeData.full_name,
            email: employeeData.email,
            department: employeeData.department || 'N/A',
            manager_name: employeeData.manager_name || 'N/A'
          })

          // Fetch employee's claims using the actual profile id
          const { data: claimsData } = await supabase
            .from('claims')
            .select('*')
            .eq('employee_id', employeeData.id)
            .order('created_at', { ascending: false })

          console.log('Claims data:', claimsData)

          if (claimsData) {
            setClaims(claimsData.map(claim => ({
              id: claim.id,
              claim_number: claim.claim_number,
              vendor_name: claim.vendor_name,
              city: claim.city || '',
              amount: Number(claim.amount),
              expense_date: claim.expense_date,
              category: claim.category,
              status: claim.status,
              description: claim.description || ''
            })))
          }
        } else {
          console.log('Employee not found in profiles, trying manager_teams')
          // Fallback: get employee info from manager_teams
          const { data: teamData } = await supabase
            .from('manager_teams')
            .select('*')
            .eq('id', employeeId)
            .single()

          if (teamData) {
            setEmployee({
              id: teamData.id,
              full_name: teamData.employee_name || teamData.employee_id || 'Unknown Employee',
              email: 'N/A',
              department: teamData.department || 'N/A',
              manager_name: teamData.manager_name || 'N/A'
            })

            // Fetch claims by employee_id from manager_teams
            const { data: claimsData } = await supabase
              .from('claims')
              .select('*')
              .eq('employee_id', teamData.employee_id)
              .order('created_at', { ascending: false })

            console.log('Claims data from fallback:', claimsData)

            if (claimsData) {
              setClaims(claimsData.map(claim => ({
                id: claim.id,
                claim_number: claim.claim_number,
                vendor_name: claim.vendor_name,
                city: claim.city || '',
                amount: Number(claim.amount),
                expense_date: claim.expense_date,
                category: claim.category,
                status: claim.status,
                description: claim.description || ''
              })))
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const financialYears = ["2024-2025", "2023-2024", "2022-2023"]

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        claim.claim_number.toLowerCase().includes(query) ||
        claim.vendor_name.toLowerCase().includes(query) ||
        claim.description.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'All Statuses' || claim.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [claims, searchQuery, statusFilter])

  const totalAmount = claims.reduce((sum, c) => sum + c.amount, 0)
  const approvedAmount = claims.filter(c => c.status === 'Approved').reduce((sum, c) => sum + c.amount, 0)
  const pendingAmount = claims.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.amount, 0)

  const statusColors: Record<string, string> = {
    'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
    'Submitted': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Paid': 'bg-purple-100 text-purple-700 border-purple-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200',
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading employee data...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Employee not found</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link href={`/super-owner/managers/${managerId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Team
      </Link>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
          {employee.full_name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {employee.email} • {employee.department} • Manager: {employee.manager_name}
        </p>
      </div>

      <Card className="min-h-[calc(100vh-8rem)]">
        <CardContent className="p-8">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between w-full">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="pl-9 pr-4 py-2 bg-secondary border-none rounded-lg text-sm w-56 focus:ring-0"
                  placeholder="Search by Claim ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-secondary border-none rounded-lg text-sm focus:ring-0 cursor-pointer w-36 appearance-none"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="px-4 py-2 bg-secondary border-none rounded-lg text-sm focus:ring-0 cursor-pointer appearance-none"
              >
                {financialYears.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>

              <button
                className="px-4 py-2 bg-secondary text-secondary-foreground font-semibold text-sm rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2"
                onClick={() => alert('Export clicked')}
                disabled={isExporting || filteredClaims.length === 0}
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export to Excel
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Claim ID</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No claims found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-muted/30 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-primary text-sm">{claim.claim_number}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{claim.expense_date}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm">{claim.vendor_name}</p>
                          <p className="text-xs text-muted-foreground">{claim.city}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{claim.category}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-sm">₹{claim.amount.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border', statusColors[claim.status] || statusColors['Draft'])}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/super-owner/all-claims/${claim.id}`}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
