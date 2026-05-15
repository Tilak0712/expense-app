'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlusCircle, Download, Calendar, Search, ChevronRight, Loader2 } from 'lucide-react'
import {
  fetchClaims,
  type DashboardClaim,
  AuthRequiredError,
} from '@/lib/dashboard/supabase-data'
import { cn } from '@/lib/utils'

const statusOptions = ['All Statuses', 'Draft', 'Submitted', 'Pending', 'Approved', 'Paid', 'Rejected']

function formatCurrency(amount: number, currency: string = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    Submitted: 'bg-amber-100 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Paid: 'bg-blue-100 text-blue-700 border-blue-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function ClaimsPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<DashboardClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchClaims()
        setClaims(data)
      } catch (error) {
        if (error instanceof AuthRequiredError) {
          router.push('/login')
        } else {
          console.error('Failed to load claims:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All Statuses' || claim.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleExport = async () => {
    setIsExporting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const csv = [
      'Claim ID,Date,Vendor,Category,Amount,Currency,Status,Description',
      ...filteredClaims.map(
        (claim) =>
          `${claim.claimNumber},${formatDate(claim.expenseDate)},${claim.vendorName},${claim.category},${claim.amount},${claim.currency},${claim.status},"${claim.description}"`
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `my-claims-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExporting(false)
  }

  if (isLoading) {
    return (
      <DashboardLayout title="My Claims" searchPlaceholder="Search Claim ID...">
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Claims" searchPlaceholder="Search Claim ID...">
      <div className="p-8">
        <Card className="min-h-[calc(100vh-8rem)]">
          <CardContent className="p-8">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between w-full">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 pr-4 py-2 w-56"
                    placeholder="Search by Claim ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Range */}
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Last 30 Days</span>
                </Button>

                {/* Export */}
                <Button
                  variant="ghost"
                  className="gap-2 text-primary"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export to Excel
                </Button>
              </div>

              <Button asChild className="shadow-lg">
                <Link href="/create-claim">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Claim
                </Link>
              </Button>
            </div>

            {/* Claims Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Claim ID
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Action
                    </th>
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
                          <Link
                            href="/create-claim"
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            Create your first claim →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim) => (
                      <tr
                        key={claim.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => router.push(`/claims/${claim.id}`)}
                      >
                        <td className="px-6 py-4">
                          <span className="font-semibold text-primary">{claim.claimNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {formatDate(claim.expenseDate)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-sm">{claim.vendorName}</p>
                            <p className="text-xs text-muted-foreground">{claim.city}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">{claim.category}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-sm">
                            {formatCurrency(claim.amount, claim.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-semibold border',
                              getStatusColor(claim.status)
                            )}
                          >
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
    </DashboardLayout>
  )
}
