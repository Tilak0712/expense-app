'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Shield, DollarSign, Crown } from 'lucide-react'

type UserRole = 'employee' | 'manager' | 'finance' | 'super_owner'

interface RoleOption {
  value: UserRole
  label: string
  icon: React.ElementType
  redirectTo: string
}

const roles: RoleOption[] = [
  {
    value: 'employee',
    label: 'Employee',
    icon: User,
    redirectTo: '/dashboard/dashboard',
  },
  {
    value: 'manager',
    label: 'Manager',
    icon: Shield,
    redirectTo: '/manager/approvals',
  },
  {
    value: 'finance',
    label: 'Finance',
    icon: DollarSign,
    redirectTo: '/finance/payments',
  },
  {
    value: 'super_owner',
    label: 'Super Owner',
    icon: Crown,
    redirectTo: '/super-owner',
  },
]

export function RoleSwitcher() {
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState<UserRole>('employee')

  useEffect(() => {
    // Get current role from localStorage
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole') as UserRole
      if (storedRole && roles.find((r) => r.value === storedRole)) {
        setCurrentRole(storedRole)
      }
    }
  }, [])

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole)
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('userRole', newRole)
    }
    
    // Redirect to the appropriate page for the new role
    const roleData = roles.find((r) => r.value === newRole)
    if (roleData) {
      router.push(roleData.redirectTo)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Switch Role:</span>
      <Select value={currentRole} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <SelectItem key={role.value} value={role.value}>
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{role.label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
