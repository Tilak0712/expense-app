'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Search, Filter, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    setPayments([
      { id: '1', employee: 'John Doe', amount: 2500, category: 'Travel', date: '2025-01-15', status: 'ready' },
      { id: '2', employee: 'Jane Smith', amount: 1800, category: 'Meals', date: '2025-01-14', status: 'ready' },
      { id: '3', employee: 'Bob Johnson', amount: 3200, category: 'Equipment', date: '2025-01-13', status: 'processing' },
      { id: '4', employee: 'Alice Williams', amount: 950, category: 'Software', date: '2025-01-12', status: 'ready' },
    ])
  }, [])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(payments.map(p => p.id))
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
      case 'ready':
        return <Badge variant="default">Ready to Pay</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'paid':
        return <Badge variant="outline">Paid</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Process approved expense claims</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {selectedIds.length > 0 && (
            <Button>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Selected ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready to Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.filter(p => p.status === 'ready').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.filter(p => p.status === 'processing').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,500</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search payments..." className="pl-9 w-64" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedIds.length === payments.length && payments.length > 0}
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
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(payment.id)}
                        onCheckedChange={(checked) => handleSelect(payment.id, checked === true)}
                      />
                    </td>
                    <td className="p-4 font-medium">{payment.employee}</td>
                    <td className="p-4">{payment.category}</td>
                    <td className="p-4">{payment.date}</td>
                    <td className="p-4 text-right font-medium">${payment.amount.toLocaleString()}</td>
                    <td className="p-4">{getStatusBadge(payment.status)}</td>
                    <td className="p-4 text-center">
                      <Button variant="ghost" size="sm">
                        Pay
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
