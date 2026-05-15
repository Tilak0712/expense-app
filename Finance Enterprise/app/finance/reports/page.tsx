'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Search, Filter, Download, FileText, Calendar, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])

  useEffect(() => {
    setReports([
      { id: '1', name: 'Monthly Expense Report', type: 'Expense', created: '2025-01-15', status: 'Ready' },
      { id: '2', name: 'Salary Summary Q1', type: 'Salary', created: '2025-01-10', status: 'Ready' },
      { id: '3', name: 'Payment History 2024', type: 'Payment', created: '2025-01-05', status: 'Ready' },
      { id: '4', name: 'Department-wise Spending', type: 'Expense', created: '2025-01-01', status: 'Processing' },
    ])
  }, [])

  const reportTemplates = [
    { name: 'Monthly Expense Report', description: 'Detailed breakdown of all expenses by category', icon: FileText },
    { name: 'Salary Summary', description: 'Overview of salary payments and variances', icon: TrendingUp },
    { name: 'Payment History', description: 'Complete history of all payments processed', icon: BarChart3 },
    { name: 'Department Analysis', description: 'Spending analysis by department', icon: BarChart3 },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-muted-foreground">Generate and view financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Report Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTemplates.map((template) => {
            const Icon = template.icon
            return (
              <Card key={template.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Generate
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Reports</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search reports..." className="pl-9 w-64" />
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
                    <th className="p-4 text-left text-sm font-medium">Report Name</th>
                    <th className="p-4 text-left text-sm font-medium">Type</th>
                    <th className="p-4 text-left text-sm font-medium">Created</th>
                    <th className="p-4 text-left text-sm font-medium">Status</th>
                    <th className="p-4 text-center text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{report.name}</td>
                      <td className="p-4">{report.type}</td>
                      <td className="p-4">{report.created}</td>
                      <td className="p-4">
                        <Badge variant={report.status === 'Ready' ? 'default' : 'secondary'}>
                          {report.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
