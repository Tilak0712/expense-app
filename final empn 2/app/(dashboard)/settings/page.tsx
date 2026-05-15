'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Globe,
  Shield,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import {
  fetchCurrentProfile,
  fetchClaims,
  buildDashboardStats,
  type DbProfile,
  AuthRequiredError,
} from '@/lib/dashboard/supabase-data'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'


const timezones = [
  { value: 'IST', label: 'Asia/Kolkata (IST)' },
  { value: 'EST', label: 'America/New_York (EST)' },
  { value: 'GMT', label: 'Europe/London (GMT)' },
  { value: 'PST', label: 'America/Los_Angeles (PST)' },
]

const dateFormats = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]


function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isRefreshingStats, setIsRefreshingStats] = useState(false)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, claimsData] = await Promise.all([
          fetchCurrentProfile(),
          fetchClaims(),
        ])
        setProfile(profileData)
        setStats(buildDashboardStats(claimsData))
      } catch (error) {
        if (error instanceof AuthRequiredError) {
          router.push('/login')
        } else {
          console.error('Failed to load data:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const refreshStats = async () => {
    try {
      setIsRefreshingStats(true)
      const claimsData = await fetchClaims()
      const newStats = buildDashboardStats(claimsData)
      console.log('Refreshed stats:', newStats)
      setStats(newStats)
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    } finally {
      setIsRefreshingStats(false)
    }
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U'

  if (isLoading) {
    return (
      <DashboardLayout title="Settings" showSearch={false}>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Settings" showSearch={false}>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your preferences and account settings
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="border-b border-border w-full justify-start rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="general"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Security
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-[family-name:var(--font-manrope)] font-bold text-xl mb-1">
                          {profile?.full_name || 'User'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">{profile?.email}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit Profile
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                          Employee ID
                        </Label>
                        <p className="text-sm font-medium mt-1">{profile?.employee_id || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                          Department
                        </Label>
                        <p className="text-sm font-medium mt-1">{profile?.department || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                          Location
                        </Label>
                        <p className="text-sm font-medium mt-1">{profile?.location || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                          Role
                        </Label>
                        <p className="text-sm font-medium mt-1">{profile?.role || 'Employee'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Regional Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      Regional Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                          Time Zone
                        </Label>
                        <Select defaultValue="IST">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timezones.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                          Date Format
                        </Label>
                        <Select defaultValue="DD/MM/YYYY">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dateFormats.map((df) => (
                              <SelectItem key={df.value} value={df.value}>
                                {df.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold font-[family-name:var(--font-manrope)]">
                      Quick Stats
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={refreshStats}
                      disabled={isRefreshingStats}
                    >
                      {isRefreshingStats ? 'Syncing...' : 'Sync'}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Claims</span>
                      <span className="text-lg font-bold">{stats?.totalCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Approved</span>
                      <span className="text-lg font-bold text-emerald-600">{stats?.approvedCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <span className="text-lg font-bold text-amber-600">{stats?.pendingCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rejected</span>
                      <span className="text-lg font-bold text-red-600">{stats?.rejectedCount || 0}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t text-center">
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(stats?.approved || 0)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Total Reimbursed</p>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </TabsContent>


          {/* Security Tab */}
          <TabsContent value="security">
            <div className="max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Change Password</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button 
                        className="mt-4" 
                        onClick={async () => {
                          if (!currentPassword || !newPassword || !confirmPassword) {
                            return
                          }
                          if (newPassword !== confirmPassword) {
                            return
                          }
                          try {
                            setIsChangingPassword(true)
                            const { error } = await supabase.auth.updateUser({
                              password: newPassword
                            })
                            if (error) throw error
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmPassword('')
                          } catch (error) {
                            console.error('Error changing password:', error)
                          } finally {
                            setIsChangingPassword(false)
                          }
                        }}
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be
                    undone.
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Enter your password to confirm deletion</Label>
                      <div className="relative">
                        <Input
                          type={showDeletePassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowDeletePassword(!showDeletePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showDeletePassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        if (!deletePassword) {
                          return
                        }
                        try {
                          setIsDeletingAccount(true)
                          
                          // Verify password by attempting to sign in
                          const { error: signInError } = await supabase.auth.signInWithPassword({
                            email: profile?.email || '',
                            password: deletePassword
                          })
                          if (signInError) {
                            return
                          }
                          
                          // Delete user's data from database
                          const userId = (await supabase.auth.getUser()).data.user?.id
                          if (!userId) {
                            return
                          }
                          
                          // Delete claims
                          const { error: claimsError } = await supabase
                            .from('claims')
                            .delete()
                            .eq('employee_id', userId)
                          
                          if (claimsError) console.error('Error deleting claims:', claimsError)
                          
                          // Delete profile
                          const { error: profileError } = await supabase
                            .from('profiles')
                            .delete()
                            .eq('id', userId)
                          
                          if (profileError) console.error('Error deleting profile:', profileError)
                          
                          // Sign out user
                          await supabase.auth.signOut()
                          
                          router.push('/login')
                        } catch (error) {
                          console.error('Error deleting account:', error)
                        } finally {
                          setIsDeletingAccount(false)
                        }
                      }}
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  )
}
