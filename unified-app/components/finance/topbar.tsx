"use client"

import { useState, useEffect, createContext, useContext } from "react"
import Link from "next/link"
import { Bell, Award, Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { RoleSwitcher } from "@/components/role-switcher"
import { mockNotifications, type Notification } from "@/lib/data"

interface HeaderContextType {
  notifications: Notification[]
  refreshNotifications: () => void
}

const HeaderContext = createContext<HeaderContextType | null>(null)

export function useFinanceHeader() {
  const context = useContext(HeaderContext)
  if (!context) throw new Error('useFinanceHeader must be used within FinanceHeaderProvider')
  return context
}

export function FinanceHeaderProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)

  const refreshNotifications = () => {
    // In a real implementation, this would fetch from Supabase
    // For now, we'll keep the mock notifications
  }

  // Real-time subscription for payment status changes
  useEffect(() => {
    let mounted = true
    let channel: any = null

    const setupSubscription = async () => {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
        const supabaseClient = getSupabaseBrowserClient()
        
        if (!mounted) return
        
        channel = supabaseClient
          .channel('finance-claims-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'claims'
            },
            () => {
              if (mounted) refreshNotifications()
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
    <HeaderContext.Provider value={{ notifications, refreshNotifications }}>
      {children}
    </HeaderContext.Provider>
  )
}

interface HeaderProps {
  title?: string
  showBackButton?: boolean
  showSearch?: boolean
  userRole?: string
  userId?: string
  userName?: string
}

export function Header({ title, showBackButton, showSearch = false, userRole = 'Finance', userId = 'FIN-001', userName = 'Finance Admin' }: HeaderProps) {
  const { notifications, refreshNotifications } = useFinanceHeader()
  const [showNotifications, setShowNotifications] = useState(false)
  
  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setShowNotifications(false)
  }

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
            <input
              className="w-full bg-secondary border-none rounded-full py-2 pl-10 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground"
              placeholder="Search..."
              type="text"
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        {/* Role Switcher */}
        <RoleSwitcher />

        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-bold text-primary tracking-wider">{userRole} ID: {userId}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-tighter">{userName}</span>
        </div>
        
        <div className="flex items-center gap-3 border-l border-border pl-6">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-muted-foreground hover:text-primary transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-card"></span>
              )}
            </button>
            
            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-lg border border-border z-50 overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h4 className="text-sm font-bold">Notifications</h4>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "p-4 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer",
                        !notification.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          notification.type === 'warning' && "bg-amber-100 text-amber-600",
                          notification.type === 'success' && "bg-emerald-100 text-emerald-600",
                          notification.type === 'info' && "bg-primary/10 text-primary",
                          notification.type === 'error' && "bg-destructive/10 text-destructive"
                        )}>
                          {notification.type === 'success' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-border">
                  <button 
                    onClick={markAllRead}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Avatar */}
          <Link href="/profile">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold ring-2 ring-primary/10 hover:ring-primary/30 transition-all cursor-pointer">
              FA
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
