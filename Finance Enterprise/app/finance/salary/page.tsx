'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Search, Filter, Download, User, Calendar, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SalaryPage() {
  const [salaries, setSalaries] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    setSalaries([
      { id: '1', employee: 'John Doe', department: 'Engineering', payPeriod: '2025-01', gross: 5000, net: 4500, variance: 5.5, status: 'pending' },
      { id: '2', employee: 'Jane Smith', department: 'Sales', payPeriod: '2025-01', gross: 6000, net: 5400, variance: 12.0, status: 'approved' },
      { id: '3', employee: 'Bob Johnson', department: 'Finance', payPeriod: '2025-01', gross: 7500, net: 6750, variance: -2.5, status: 'pending' },
      { id: '4', employee: 'Alice Williams', department: 'Engineering', payPeriod: '2025-01', gross: 5500, net: 4975, variance: 8.0, status: 'review' },
    ])
  }, [])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(salaries.map(s => s.id))
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
      case 'approved':
        return <Badge variant="default">Approved</Badge>
      case 'review':
        return <Badge variant="outline">In Review</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary Management</h1>
          <p className="text-muted-foreground">Review and approve salary runs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Run Payroll
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salaries.reduce((sum, s) => sum + s.gross, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salaries.filter(s => s.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{salaries.filter(s => Math.abs(s.variance) > 10).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(salaries.reduce((sum, s) => sum + s.variance, 0) / salaries.length).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search employees..." className="pl-9 w-64" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Show Anomalies
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button variant="outline" size="sm">
              Approve Selected
            </Button>
            <Button variant="outline" size="sm">
              Reject Selected
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedIds.length === salaries.length && salaries.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium">Employee</th>
                  <th className="p-4 text-left text-sm font-medium">Department</th>
                  <th className="p-4 text-left text-sm font-medium">Pay Period</th>
                  <th className="p-4 text-right text-sm font-medium">Gross</th>
                  <th className="p-4 text-right text-sm font-medium">Net</th>
                  <th className="p-4 text-right text-sm font-medium">Variance</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((salary) => (
                  <tr key={salary.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(salary.id)}
                        onCheckedChange={(checked) => handleSelect(salary.id, checked === true)}
                      />
                    </td>
                    <td className="p-4 font-medium">{salary.employee}</td>
                    <td className="p-4">{salary.department}</td>
                    <td className="p-4">{salary.payPeriod}</td>
                    <td className="p-4 text-right font-medium">${salary.gross.toLocaleString()}</td>
                    <td className="p-4 text-right font-medium">${salary.net.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <span className={Math.abs(salary.variance) > 10 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {salary.variance > 0 ? '+' : ''}{salary.variance}%
                      </span>
                    </td>
                    <td className="p-4">{getStatusBadge(salary.status)}</td>
                    <td className="p-4 text-center">
                      <Button variant="ghost" size="sm">
                        View
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
