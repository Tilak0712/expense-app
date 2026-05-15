"use client"

import { useState, useEffect, createContext, useContext } from "react"
import Link from "next/link"
import { Bell, Award, Check, Clock, AlertCircle, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchManagerProfile, fetchPendingClaims, type ManagerUser, type ManagerClaim } from "@/lib/dashboard/manager-supabase-data"

interface HeaderContextType {
  pendingClaims: ManagerClaim[]
  refreshNotifications: () => void
}

const HeaderContext = createContext<HeaderContextType | null>(null)

export function useHeader() {
  const context = useContext(HeaderContext)
  if (!context) throw new Error('useHeader must be used within HeaderProvider')
  return context
}

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [pendingClaims, setPendingClaims] = useState<ManagerClaim[]>([])
  const [loaded, setLoaded] = useState(false)

  const refreshNotifications = async () => {
    try {
      const claims = await fetchPendingClaims()
      setPendingClaims(claims)
    } catch {
      setPendingClaims([])
    }
  }

  useEffect(() => {
    if (!loaded) {
      refreshNotifications()
      setLoaded(true)
    }
  }, [loaded])

  // Real-time subscription for new claims
  useEffect(() => {
    let mounted = true
    let channel: any = null

    const setupSubscription = async () => {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
        const supabaseClient = getSupabaseBrowserClient()
        
        if (!mounted) return
        
        channel = supabaseClient
          .channel('manager-claims-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
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
    <HeaderContext.Provider value={{ pendingClaims, refreshNotifications }}>
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

export function Header({ title, showBackButton, showSearch = false, userRole = 'Manager', userId = 'N/A', userName = 'User' }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [manager, setManager] = useState<ManagerUser | null>(null)
  const { pendingClaims, refreshNotifications } = useHeader()
  
  useEffect(() => {
    const loadManager = async () => {
      try {
        const profile = await fetchManagerProfile()
        setManager(profile)
      } catch {
        setManager(null)
      }
    }
    loadManager()
  }, [])

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
          <Award className="w-5 h-5 text-primary" />
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
              {pendingClaims.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            
            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-lg border border-border z-50 overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h4 className="text-sm font-bold">Notifications</h4>
                  <span className="text-xs text-muted-foreground">{pendingClaims.length} pending</span>
                </div>
                <div className="max-h-80 overflow-auto">
                  {pendingClaims.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {pendingClaims.slice(0, 5).map((claim) => (
                        <Link
                          key={claim.id}
                          href={`/approvals/${claim.id}`}
                          className="block p-3 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {claim.employeeName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                ₹{claim.amount.toLocaleString('en-IN')} - {claim.category}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(claim.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {pendingClaims.length > 5 && (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          +{pendingClaims.length - 5} more pending claims
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-3 text-center border-t border-border">
                  <button 
                    onClick={markAllRead}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Avatar */}
          <Link href="/profile">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold ring-2 ring-primary/10 hover:ring-primary/30 transition-all cursor-pointer">
              {manager?.avatar || 'MG'}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
