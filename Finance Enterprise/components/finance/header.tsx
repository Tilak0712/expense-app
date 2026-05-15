'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Search, CheckCircle, AlertCircle, Info, AlertTriangle, LogOut, User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  showSearch?: boolean
  searchPlaceholder?: string
}

function getNotificationIcon(type: 'success' | 'warning' | 'error' | 'info') {
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

export function Header({ title, showSearch = true, searchPlaceholder = 'Search...' }: HeaderProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<{ name: string; id: string } | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (hasCheckedAuth) return
      
      try {
        setError(null)
        setAuthRequired(false)

        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!active) return

        if (user) {
          setProfile({ name: user.user_metadata?.name || 'Finance User', id: user.id })
        }
        setHasCheckedAuth(true)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load header data')
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [hasCheckedAuth])

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications])

  const markAllAsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login.html'
  }

  const initials = useMemo(() => {
    const name = profile?.name?.trim()
    if (!name) return 'FP'

    const computed = name
      .split(' ')
      .map((part) => part[0] || '')
      .join('')
      .substring(0, 2)
      .toUpperCase()

    return computed || 'FP'
  }, [profile?.name])

  const displayName = profile?.name ?? (authRequired ? 'Sign in required' : error ? 'Unavailable' : 'Loading...')
  const displayId = profile?.id ?? 'N/A'

  return (
    <header className="fixed top-0 right-0 left-[240px] h-12 z-40 bg-card border-b border-border flex justify-between items-center px-6 gap-6">
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-lg font-black text-foreground font-[family-name:var(--font-manrope)] tracking-tight whitespace-nowrap">
          {title}
        </h1>
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
        {/* Finance User Info */}
        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-bold text-primary tracking-wider">
            Finance ID: {displayId}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-tighter">
            {displayName}
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
                  <div className="p-4 text-xs text-muted-foreground">
                    {authRequired
                      ? 'Sign in to see notifications.'
                      : error
                        ? 'Notifications are currently unavailable.'
                        : 'No notifications yet.'}
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
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="p-3 text-center">
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Mark all as read
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="ring-2 ring-primary/10 hover:ring-primary/30 transition-all cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayId}</p>
              </div>
              <Link href="/profile">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
