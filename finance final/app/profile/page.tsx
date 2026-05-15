"use client"

import { useEffect, useState } from "react"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { 
  User,
  Briefcase,
  Users,
  Receipt,
  Clock,
  Wallet,
  TrendingUp,
  Loader2
} from "lucide-react"
import { 
  AuthRequiredError,
  fetchFinanceProfile,
  fetchAllClaims,
  type FinanceProfile,
  type FinanceClaim
} from "@/lib/dashboard/finance-supabase-data"

export default function ProfilePage() {
  const [profile, setProfile] = useState<FinanceProfile | null>(null)
  const [claims, setClaims] = useState<FinanceClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setAuthRequired(false)

        const [profileData, claimsData] = await Promise.all([
          fetchFinanceProfile(),
          fetchAllClaims()
        ])
        if (!active) return

        setProfile(profileData)
        setClaims(claimsData)
      } catch (err) {
        if (!active) return

        if (err instanceof AuthRequiredError) {
          setAuthRequired(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load profile')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  // Redirect to login if auth required
  useEffect(() => {
    if (authRequired && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authRequired])

  const pendingCount = claims.filter((c: any) => c.status === 'Pending' || c.status === 'Submitted').length
  const processedCount = claims.filter((c: any) => c.status === 'Approved' || c.status === 'Paid').length
  const totalAmount = claims.reduce((sum: number, c: any) => sum + c.amount, 0)
  const financeStats = {
    pendingVerification: pendingCount,
    processedClaims: processedCount,
    totalProcessedAmount: claims.filter((c: any) => c.status === 'Approved' || c.status === 'Paid').reduce((sum: number, c: any) => sum + c.amount, 0),
    totalAmount,
  }

  const handleEditProfile = () => {
    alert('Edit profile feature coming soon!')
  }

  if (authRequired) {
    return (
      <FinanceLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (isLoading) {
    return (
      <FinanceLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </FinanceLayout>
    )
  }

  if (error) {
    return (
      <FinanceLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{error}</p>
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Profile">
      <div className="max-w-4xl">
        {/* Profile Header */}
        <div className="bg-card rounded-lg tile-shadow border border-border/50 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{profile?.name || 'Finance User'}</h2>
                <p className="text-sm text-muted-foreground">{profile?.email || ''}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {profile?.role || 'Finance'}
                  </span>
                  <span className="text-xs text-muted-foreground">{profile?.department || 'Finance Department'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleEditProfile}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-card rounded-lg tile-shadow border border-border/50 p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
              <p className="text-sm font-medium text-foreground">{profile?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Email</label>
              <p className="text-sm font-medium text-foreground">{profile?.email || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Phone</label>
              <p className="text-sm font-medium text-foreground">{profile?.phone || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Department</label>
              <p className="text-sm font-medium text-foreground">{profile?.department || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Join Date</label>
              <p className="text-sm font-medium text-foreground">{profile?.joinDate || 'Not set'}</p>
            </div>
          </div>
        </div>

        {/* Finance Statistics */}
        <div className="bg-card rounded-lg tile-shadow border border-border/50 p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Finance Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Pending Verification</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{financeStats.pendingVerification}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Processed Claims</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{financeStats.processedClaims}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Processed</span>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{(financeStats.totalProcessedAmount / 100000).toFixed(1)}L</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Claims</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{claims.length}</p>
            </div>
          </div>
        </div>

        {/* Work Information */}
        <div className="bg-card rounded-lg tile-shadow border border-border/50 p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Work Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Role</label>
              <p className="text-sm font-medium text-foreground">{profile?.role || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Department</label>
              <p className="text-sm font-medium text-foreground">{profile?.department || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    </FinanceLayout>
  )
}
