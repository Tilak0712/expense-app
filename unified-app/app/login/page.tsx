'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const roleUrls: Record<string, string> = {
  employee: 'http://localhost:3001/login',
  manager: 'http://localhost:3002/login',
  finance: 'http://localhost:3005/login',
  super_owner: 'http://localhost:3004/login',
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('')

  const handleRedirect = () => {
    if (selectedRole && roleUrls[selectedRole]) {
      window.location.href = roleUrls[selectedRole]
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Expense Management</CardTitle>
          <CardDescription className="text-center">
            Select your role to access your portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose your role...</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance</option>
                <option value="super_owner">Super Owner</option>
              </select>
            </div>
            <Button
              type="button"
              onClick={handleRedirect}
              className="w-full"
              disabled={!selectedRole}
            >
              Go to Portal
            </Button>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Select your role to be redirected to your portal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
