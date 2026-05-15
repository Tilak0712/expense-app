'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type UserRole = 'employee' | 'manager' | 'finance' | 'super_owner'

interface RoleRoute {
  path: string
  allowedRoles: UserRole[]
}

const roleRoutes: RoleRoute[] = [
  { path: '/dashboard', allowedRoles: ['employee'] },
  { path: '/manager', allowedRoles: ['manager'] },
  { path: '/finance', allowedRoles: ['finance'] },
  { path: '/super-owner', allowedRoles: ['super_owner'] },
]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is authenticated with Supabase
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Not authenticated, redirect to login
        router.push('/login')
        return
      }

      // Check if user has selected a role
      if (typeof window !== 'undefined') {
        const selectedRole = localStorage.getItem('userRole') as UserRole | null

        if (!selectedRole) {
          // No role selected, redirect to login
          router.push('/login')
          return
        }

        // Check if current path matches the selected role
        const currentRoute = roleRoutes.find((route) => pathname.startsWith(route.path))
        
        if (currentRoute && !currentRoute.allowedRoles.includes(selectedRole)) {
          // User is trying to access a route they don't have permission for
          // Redirect to their appropriate dashboard
          const roleRedirect: Record<UserRole, string> = {
            employee: '/dashboard/dashboard',
            manager: '/manager/approvals',
            finance: '/finance/payments',
            super_owner: '/super-owner',
          }
          router.push(roleRedirect[selectedRole])
        }
      }
    }

    checkAuth()
  }, [pathname, router])

  return <>{children}</>
}
