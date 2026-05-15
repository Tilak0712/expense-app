'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout, useDashboardShell } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  User,
  Building,
  Wallet,
  Edit,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/mock-data'
import { updateProfile } from '@/lib/employee/supabase-data'

const budgets = [
  {
    name: 'Travel Budget',
    used: 60000,
    total: 80000,
    percentage: 75,
    status: 'warning',
    statusText: '75% used - Approaching limit',
  },
  {
    name: 'Meals Budget',
    used: 12000,
    total: 15000,
    percentage: 80,
    status: 'success',
    statusText: null,
  },
  {
    name: 'Supplies Budget',
    used: 3300,
    total: 15000,
    percentage: 22,
    status: 'success',
    statusText: null,
  },
]

function formatJoinDate(value?: string) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const { profile, isProfileLoading, refreshProfile } = useDashboardShell()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  })

  useEffect(() => {
    const nameParts = profile?.full_name?.split(' ').filter(Boolean) || []

    setForm({
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      phone: profile?.phone || '',
    })
  }, [profile])

  const displayName = useMemo(() => {
    if (isEditing) {
      return [form.firstName, form.lastName].filter(Boolean).join(' ').trim() || 'User'
    }

    return profile?.full_name || 'User'
  }, [form.firstName, form.lastName, isEditing, profile?.full_name])

  const initials = displayName
    .split(' ')
    .map((name: string) => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const employeeId = profile?.employee_id || 'Not available'
  const department = profile?.department || 'Not available'
  const email = profile?.email || 'Not available'
  const joinDate = formatJoinDate(profile?.created_at)
  const manager = profile?.manager_name || 'Not available'

  const handleFieldChange = (field: 'firstName' | 'lastName' | 'phone', value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleCancel = () => {
    const nameParts = profile?.full_name?.split(' ').filter(Boolean) || []

    setForm({
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      phone: profile?.phone || '',
    })
    setSaveError('')
    setSaveSuccess('')
    setIsEditing(false)
  }

  const handleSave = async () => {
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

    if (!firstName) {
      setSaveSuccess('')
      setSaveError('First name is required.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      await updateProfile({
        full_name: fullName,
        phone: form.phone.trim() || null,
      })

      await refreshProfile()
      setSaveSuccess('Profile updated successfully.')
      setIsEditing(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile.'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout title="Profile" showSearch={false}>
      <div className="p-6">
        <Card className="mb-6 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary to-primary/70" />
          <CardContent className="px-6 pb-6">
            <div className="flex items-start gap-4 -mt-12">
              <div className="w-24 h-24 rounded-full bg-card p-1 shadow-lg flex-shrink-0">
                <Avatar className="w-full h-full">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="mt-14 flex-1 flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
                    {displayName}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    Employee ID: {employeeId} | Joined {joinDate}
                  </p>
                  {saveError ? (
                    <p className="text-xs font-medium text-destructive mt-2">{saveError}</p>
                  ) : null}
                  {saveSuccess ? (
                    <p className="text-xs font-medium text-emerald-600 mt-2">{saveSuccess}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSaveError('')
                        setSaveSuccess('')
                        setIsEditing(true)
                      }}
                      disabled={isProfileLoading || !profile}
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      First Name
                    </Label>
                    <Input
                      value={form.firstName}
                      onChange={(event) => handleFieldChange('firstName', event.target.value)}
                      readOnly={!isEditing}
                      className={isEditing ? '' : 'bg-muted/30'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Last Name
                    </Label>
                    <Input
                      value={form.lastName}
                      onChange={(event) => handleFieldChange('lastName', event.target.value)}
                      readOnly={!isEditing}
                      className={isEditing ? '' : 'bg-muted/30'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Email
                    </Label>
                    <Input value={email} readOnly className="bg-muted/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Phone
                    </Label>
                    <Input
                      value={form.phone}
                      onChange={(event) => handleFieldChange('phone', event.target.value)}
                      readOnly={!isEditing}
                      className={isEditing ? '' : 'bg-muted/30'}
                      placeholder={isEditing ? 'Enter phone number' : ''}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Work Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Department
                  </Label>
                  <Input value={department} readOnly className="bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Reporting Manager
                  </Label>
                  <Input value={manager} readOnly className="bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Join Date
                  </Label>
                  <Input value={joinDate} readOnly className="bg-muted/30" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
