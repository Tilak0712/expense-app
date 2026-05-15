"use client"

import { useEffect, useState } from "react"
import { ManagerLayout } from "@/components/manager/manager-layout"
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
  fetchManagerProfile,
  fetchAllClaims,
  type ManagerUser,
  type ManagerClaim
} from "@/lib/dashboard/manager-supabase-data"
import { fetchManagerTeam, type TeamMember } from "@/lib/dashboard/team-management-v2"

export default function ProfilePage() {
  const [profile, setProfile] = useState<ManagerUser | null>(null)
  const [claims, setClaims] = useState<ManagerClaim[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bankAccount, setBankAccount] = useState('')
  const [isSavingBankAccount, setIsSavingBankAccount] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedPhone, setEditedPhone] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setAuthRequired(false)

        const [profileData, claimsData, teamData] = await Promise.all([
          fetchManagerProfile(),
          fetchAllClaims(),
          fetchManagerTeam()
        ])
        if (!active) return

        setProfile(profileData)
        setClaims(claimsData)
        setTeamMembers(teamData)
        setBankAccount((profileData as any).bankAccount || '')
        setEditedName(profileData.name || '')
        setEditedPhone(profileData.phone || '')
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
  const totalAmount = claims.reduce((sum: number, c: any) => sum + c.amount, 0)
  const teamStats = {
    size: teamMembers.length,
    pendingApprovals: pendingCount,
    monthlyBudget: 0,
    budgetUsed: 0,
    totalAmount,
  }

  const handleEditProfile = () => {
    setIsEditing(true)
  }

  const handleSaveProfile = async () => {
    try {
      const supabase = await import('@/lib/supabase/client').then(m => m.getSupabaseBrowserClient())
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editedName,
          phone: editedPhone
        })
        .eq('user_id', user.id)

      if (error) throw error
      
      setProfile(prev => prev ? { ...prev, name: editedName, phone: editedPhone } : null)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedName(profile?.name || '')
    setEditedPhone(profile?.phone || '')
  }

  async function handleSaveBankAccount() {
    try {
      setIsSavingBankAccount(true)
      const supabase = await import('@/lib/supabase/client').then(m => m.getSupabaseBrowserClient())
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')
      
      const { error } = await supabase
        .from('profiles')
        .update({ bank_account: bankAccount })
        .eq('user_id', user.id)

      if (error) throw error
      alert('Bank account saved successfully')
    } catch (error) {
      alert('Failed to save bank account')
    } finally {
      setIsSavingBankAccount(false)
    }
  }

  return (
    <ManagerLayout title="My Profile" showBackButton>
      <div className="p-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading profile...</span>
          </div>
        )}

        {/* Error State */}
        {error && !authRequired && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 mb-6">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
        {/* Profile Header */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-primary to-accent"></div>
          <div className="px-6 pb-6">
            <div className="flex items-start gap-4 -mt-12">
              <div className="w-24 h-24 rounded-full bg-card p-1 shadow-lg flex-shrink-0">
                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                  {profile?.avatar || 'MG'}
                </div>
              </div>
              <div className="mt-14 flex-1 flex items-end justify-between">
                <div>
                  <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
                    {profile?.name || 'Manager'}
                  </h1>
                  <p className="text-sm text-muted-foreground">{profile?.role || 'Manager'} - {profile?.department || 'Operations'}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Manager ID: {profile?.id || 'N/A'} - Joined {profile?.joinDate || 'N/A'}</p>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveProfile}
                      className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleEditProfile}
                    className="px-4 py-2 text-sm font-semibold text-primary bg-primary/5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">First Name</label>
                <input 
                  type="text" 
                  value={editedName.split(' ')[0] || ''} 
                  onChange={(e) => setEditedName(e.target.value + ' ' + (editedName.split(' ').slice(1).join(' ') || ''))}
                  readOnly={!isEditing}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-secondary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Last Name</label>
                <input 
                  type="text" 
                  value={editedName.split(' ').slice(1).join(' ') || ''} 
                  onChange={(e) => setEditedName((editedName.split(' ')[0] || '') + ' ' + e.target.value)}
                  readOnly={!isEditing}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-secondary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Email</label>
                <input 
                  type="email" 
                  value={profile?.email || ''} 
                  readOnly
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-secondary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Phone</label>
                <input 
                  type="tel" 
                  value={editedPhone} 
                  onChange={(e) => setEditedPhone(e.target.value)}
                  readOnly={!isEditing}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-secondary/50"
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Work Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Department</label>
                  <input 
                    type="text" 
                    value={profile?.department || ''} 
                    readOnly
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-secondary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Designation</label>
                  <input 
                    type="text" 
                    value={profile?.role || ''} 
                    readOnly
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-secondary/50"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Join Date</label>
                <input 
                  type="text" 
                  value={profile?.joinDate || ''} 
                  readOnly
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-secondary/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bank Account */}
        <div className="mt-6 bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Bank Account
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Bank Account Number</label>
              <input 
                type="text" 
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Enter your bank account number"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This account will be used for expense claim payments
              </p>
            </div>
            <button
              onClick={handleSaveBankAccount}
              disabled={isSavingBankAccount}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSavingBankAccount ? 'Saving...' : 'Save Bank Account'}
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </ManagerLayout>
  )
}
