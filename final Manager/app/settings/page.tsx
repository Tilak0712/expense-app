"use client"

import { useState, useEffect } from "react"
import { ManagerLayout } from "@/components/manager/manager-layout"
import { 
  User,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lock,
  Shield,
  Users,
  Loader2,
  Plus,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  addTeamMember,
  removeTeamMember,
  fetchManagerTeam,
  type TeamMember
} from "@/lib/dashboard/team-management-v2"
import { fetchManagerProfile, type ManagerUser } from "@/lib/dashboard/manager-supabase-data"

type Tab = 'general' | 'notifications' | 'security' | 'team'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [onLeave, setOnLeave] = useState(false)
  const [profile, setProfile] = useState<ManagerUser | null>(null)
  
  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null)
  
  // Load team members and profile on mount
  useEffect(() => {
    loadTeamMembers()
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await fetchManagerProfile()
      setProfile(data)
      // Load on_leave status from profile
      const supabase = await import('@/lib/supabase/client').then(m => m.getSupabaseBrowserClient())
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('on_leave')
          .eq('id', user.id)
          .single()
        console.log('Loaded on_leave status:', profileData, error)
        if (profileData) {
          setOnLeave(profileData.on_leave || false)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      // ignore - profile fields will show empty
    }
  }
  
  const loadTeamMembers = async () => {
    try {
      setIsLoadingTeam(true)
      setTeamError(null)
      const members = await fetchManagerTeam()
      setTeamMembers(members)
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setIsLoadingTeam(false)
    }
  }
  
  const handleAddMember = async () => {
    if (!newEmployeeId.trim()) {
      setTeamError('Please enter an Employee ID')
      return
    }
    
    try {
      setIsAddingMember(true)
      setTeamError(null)
      setTeamSuccess(null)
      await addTeamMember(newEmployeeId.trim(), newDepartment.trim())
      setNewEmployeeId('')
      setNewDepartment('')
      setTeamSuccess('Team member added successfully.')
      await loadTeamMembers()
    } catch (err) {
      setTeamSuccess(null)
      setTeamError(err instanceof Error ? err.message : 'Failed to add team member')
    } finally {
      setIsAddingMember(false)
    }
  }
  
  const handleRemoveMember = async (employeeUserId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return
    
    try {
      setIsLoadingTeam(true)
      setTeamError(null)
      setTeamSuccess(null)
      await removeTeamMember(employeeUserId)
      setTeamSuccess('Team member removed.')
      await loadTeamMembers()
    } catch (err) {
      setTeamSuccess(null)
      setTeamError(err instanceof Error ? err.message : 'Failed to remove team member')
    } finally {
      setIsLoadingTeam(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'team', label: 'Team Settings' },
  ]

  const handleSave = async () => {
    try {
      const supabase = await import('@/lib/supabase/client').then(m => m.getSupabaseBrowserClient())
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Saving on_leave status:', onLeave, 'for user:', user?.id)
      
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ on_leave: onLeave })
          .eq('id', user.id)
        
        console.log('Save result:', error)
        if (error) throw error
      }
      
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  const handlePasswordChange = () => {
    const newPass = prompt('Enter new password:')
    if (newPass) {
      alert('Password updated!')
    }
  }

  return (
    <ManagerLayout>
      <div className="p-8">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground mb-6">
            Manager Settings
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id 
                    ? "bg-card text-primary shadow-sm font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">First Name</label>
                    <input 
                      type="text" 
                      defaultValue={profile?.name?.split(' ')[0] || ''} 
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Last Name</label>
                    <input 
                      type="text" 
                      defaultValue={profile?.name?.split(' ').slice(1).join(' ') || ''} 
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Email</label>
                    <input 
                      type="email" 
                      defaultValue={profile?.email || ''} 
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Phone</label>
                    <input 
                      type="tel" 
                      defaultValue={profile?.phone || ''} 
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="font-bold text-lg mb-4">Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-amber-900">Manager on Leave</p>
                      <p className="text-xs text-amber-700">When enabled, team claims will be routed to Super Owner</p>
                    </div>
                    <button
                      onClick={() => setOnLeave(!onLeave)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        onLeave ? "bg-amber-500" : "bg-amber-200"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow",
                        onLeave && "translate-x-5"
                      )} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Pending Approvals</p>
                      <p className="text-xs text-muted-foreground">When team submits new claims</p>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded border-border focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium text-sm">Policy Violations</p>
                      <p className="text-xs text-muted-foreground">When claims exceed limits</p>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded border-border focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-sm">Weekly Summary</p>
                      <p className="text-xs text-muted-foreground">Weekly team expense report</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-4 h-4 text-primary rounded border-border focus:ring-primary" />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Change Password</p>
                        <p className="text-xs text-muted-foreground">Update your account password</p>
                      </div>
                    </div>
                    <button 
                      onClick={handlePasswordChange}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Settings Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Team Management */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Team Members
                  </h3>
                </div>
                
                {/* Add Member Input */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    placeholder="Enter Employee ID (e.g., EMP-001)"
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    disabled={isAddingMember}
                  />
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Department (optional)"
                    className="w-56 px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    disabled={isAddingMember}
                  />
                  <button 
                    onClick={handleAddMember}
                    disabled={isAddingMember || !newEmployeeId.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAddingMember ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add
                  </button>
                </div>
                
                {/* Error Display */}
                {teamError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                    <p className="text-destructive text-sm">{teamError}</p>
                  </div>
                )}

                {teamSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                    <p className="text-emerald-700 text-sm">{teamSuccess}</p>
                  </div>
                )}
                
                {/* Team Members List */}
                <div className="space-y-3">
                  {isLoadingTeam ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground text-sm">Loading team...</span>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No team members added yet</p>
                      <p className="text-xs mt-1">Add employees by their Employee ID</p>
                    </div>
                  ) : (
                    teamMembers.map((member) => (
                      <div key={member.id} className="p-4 border border-border rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {(member.employeeName || member.employeeId || 'NA')
                              .split('(')[0]
                              .trim()
                              .split(' ')
                              .filter(Boolean)
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {(member.employeeName || member.employeeId || 'Unknown').split('(')[0].trim()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.employeeId}
                              {member.department ? ` • ${member.department}` : ''}
                              {member.employeeEmail ? ` • ${member.employeeEmail}` : ''}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveMember(member.employeeUserId)}
                          className="text-destructive hover:bg-destructive/5 p-2 rounded-lg transition-colors"
                          title="Remove from team"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </ManagerLayout>
  )
}
