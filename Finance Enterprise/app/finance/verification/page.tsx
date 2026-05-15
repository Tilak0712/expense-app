'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Search, Filter, Download, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerificationPage() {
  const [claims, setClaims] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    // Mock data - replace with actual Supabase calls
    setClaims([
      { id: '1', employee: 'John Doe', amount: 2500, category: 'Travel', date: '2025-01-15', status: 'pending' },
      { id: '2', employee: 'Jane Smith', amount: 1800, category: 'Meals', date: '2025-01-14', status: 'pending' },
      { id: '3', employee: 'Bob Johnson', amount: 3200, category: 'Equipment', date: '2025-01-13', status: 'flagged' },
      { id: '4', employee: 'Alice Williams', amount: 950, category: 'Software', date: '2025-01-12', status: 'pending' },
    ])
  }, [])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(claims.map(c => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'flagged':
        return <Badge variant="destructive">Flagged</Badge>
      case 'approved':
        return <Badge variant="default">Approved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verification Queue</h1>
          <p className="text-muted-foreground">Review and approve expense claims</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{claims.filter(c => c.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{claims.filter(c => c.status === 'flagged').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${claims.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3h</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search claims..."
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Selected
            </Button>
            <Button variant="outline" size="sm">
              <XCircle className="h-4 w-4 mr-2" />
              Reject Selected
            </Button>
          </div>
        )}
      </div>

      {/* Claims Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedIds.length === claims.length && claims.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium">Employee</th>
                  <th className="p-4 text-left text-sm font-medium">Category</th>
                  <th className="p-4 text-left text-sm font-medium">Date</th>
                  <th className="p-4 text-right text-sm font-medium">Amount</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(claim.id)}
                        onCheckedChange={(checked) => handleSelect(claim.id, checked === true)}
                      />
                    </td>
                    <td className="p-4 font-medium">{claim.employee}</td>
                    <td className="p-4">{claim.category}</td>
                    <td className="p-4">{claim.date}</td>
                    <td className="p-4 text-right font-medium">${claim.amount.toLocaleString()}</td>
                    <td className="p-4">{getStatusBadge(claim.status)}</td>
                    <td className="p-4 text-center">
                      <Button variant="ghost" size="sm">
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
