'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { Bell, Search, CheckCircle, AlertCircle, Info, AlertTriangle, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { buildHeaderNotifications, fetchClaims, type DbProfile, type DashboardClaim } from '@/lib/dashboard/supabase-data'
import { cn } from '@/lib/utils'

interface HeaderContextType {
  claims: DashboardClaim[]
  refreshClaims: () => void
}

const HeaderContext = createContext<HeaderContextType | null>(null)

export function useEmployeeHeader() {
  const context = useContext(HeaderContext)
  if (!context) throw new Error('useEmployeeHeader must be used within EmployeeHeaderProvider')
  return context
}

export function EmployeeHeaderProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<DashboardClaim[]>([])
  const [loaded, setLoaded] = useState(false)

  const refreshClaims = async () => {
    try {
      const data = await fetchClaims()
      setClaims(data)
    } catch {
      setClaims([])
    }
  }

  useEffect(() => {
    if (!loaded) {
      refreshClaims()
      setLoaded(true)
    }
  }, [loaded])

  // Real-time subscription for claim status changes
  useEffect(() => {
    let mounted = true
    let channel: any = null

    const setupSubscription = async () => {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
        const supabaseClient = getSupabaseBrowserClient()
        
        if (!mounted) return
        
        channel = supabaseClient
          .channel('employee-claims-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'claims'
            },
            () => {
              if (mounted) refreshClaims()
            }
          )
          .subscribe()
      } catch (error) {
        console.error('Failed to setup realtime subscription:', error)
      }
    }

    setupSubscription()

    return () => {
      mounted = false
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [])

  return (
    <HeaderContext.Provider value={{ claims, refreshClaims }}>
      {children}
    </HeaderContext.Provider>
  )
}

interface HeaderProps {
  title: string
  showSearch?: boolean
  searchPlaceholder?: string
  profile?: DbProfile | null
  userRole?: string
  userId?: string
  userName?: string
  showBackButton?: boolean
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    default:
      return <Info className="w-4 h-4 text-primary" />
  }
}

function formatTimeAgo(timestamp: string): string {
  if (timestamp === 'Just now' || timestamp === 'Today') return timestamp

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

export function Header({
  title,
  showSearch = true,
  searchPlaceholder = 'Search...',
  profile = null,
  userRole = 'Employee',
  userId = 'N/A',
  userName = 'User',
  showBackButton = false,
}: HeaderProps) {
  const { claims } = useEmployeeHeader()
  const [notifications, setNotifications] = useState(() => buildHeaderNotifications(claims))

  useEffect(() => {
    setNotifications(buildHeaderNotifications(claims))
  }, [claims])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U'

  return (
    <header className="fixed top-0 right-0 left-[240px] h-12 bg-card border-b border-border flex justify-between items-center px-6 z-40">
      <div className="flex items-center gap-4 flex-1">
        {showBackButton && (
          <Link 
            href="/"
            className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        {title ? (
          <h2 className="text-lg font-bold text-accent font-[family-name:var(--font-manrope)]">{title}</h2>
        ) : (
          <>
            <Award className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{userRole} View</span>
          </>
        )}
        {showSearch && (
          <div className="relative max-w-md w-full ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              className="w-full bg-secondary border-none rounded-full py-2 pl-10 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Employee Info */}
        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-bold text-primary tracking-wider">
            {userRole} ID: {userId}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-tighter">
            {userName}
          </span>
        </div>

        <div className="flex items-center gap-3 border-l border-border pl-6">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4 border-b border-border">
                <h4 className="text-sm font-bold">Notifications</h4>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        'flex items-start gap-3 p-4 cursor-pointer focus:bg-muted',
                        !notification.read && 'bg-primary/5'
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatTimeAgo(notification.time)}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="p-3 text-center">
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Avatar */}
          <Link href="/profile">
            <Avatar className="w-10 h-10 ring-2 ring-primary/10 hover:ring-primary/30 transition-all cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  )
}
