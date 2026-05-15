'use client'

import { useEffect, useState } from 'react'
import { FileText, Search, Filter, Download, Calendar, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TrackingPage() {
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    setTransactions([
      { id: '1', employee: 'John Doe', type: 'Expense', category: 'Travel', amount: 2500, date: '2025-01-15', status: 'Paid' },
      { id: '2', employee: 'Jane Smith', type: 'Expense', category: 'Meals', amount: 1800, date: '2025-01-14', status: 'Paid' },
      { id: '3', employee: 'Bob Johnson', type: 'Salary', category: 'Monthly', amount: 7500, date: '2025-01-10', status: 'Paid' },
      { id: '4', employee: 'Alice Williams', type: 'Expense', category: 'Software', amount: 950, date: '2025-01-12', status: 'Processing' },
      { id: '5', employee: 'Charlie Brown', type: 'Salary', category: 'Monthly', amount: 6000, date: '2025-01-10', status: 'Paid' },
    ])
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="default">Paid</Badge>
      case 'Processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'Pending':
        return <Badge variant="outline">Pending</Badge>
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Tracking</h1>
          <p className="text-muted-foreground">Track all finance transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.filter(t => t.status === 'Paid').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.filter(t => t.status === 'Processing').length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search transactions..." className="pl-9 w-64" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">Employee</th>
                  <th className="p-4 text-left text-sm font-medium">Type</th>
                  <th className="p-4 text-left text-sm font-medium">Category</th>
                  <th className="p-4 text-left text-sm font-medium">Date</th>
                  <th className="p-4 text-right text-sm font-medium">Amount</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t hover:bg-muted/50">
                    <td className="p-4 font-medium">{transaction.employee}</td>
                    <td className="p-4">{transaction.type}</td>
                    <td className="p-4">{transaction.category}</td>
                    <td className="p-4">{transaction.date}</td>
                    <td className="p-4 text-right font-medium">${transaction.amount.toLocaleString()}</td>
                    <td className="p-4">{getStatusBadge(transaction.status)}</td>
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
