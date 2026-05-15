"use client"

import { useState, useEffect } from "react"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  User,
  Shield,
  Lock,
  Lightbulb,
  Wifi,
  KeyRound,
  Loader2,
  Sun,
  Moon,
  Sunset
} from "lucide-react"
import { fetchFinanceProfile, type FinanceProfile, AuthRequiredError } from "@/lib/finance/finance-supabase-data"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good Morning', icon: Sun }
  if (hour < 17) return { text: 'Good Afternoon', icon: Sunset }
  return { text: 'Good Evening', icon: Moon }
}

export default function SettingsPage() {
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon
  const [paymentAlerts, setPaymentAlerts] = useState(true)
  const [verificationAlerts, setVerificationAlerts] = useState(true)
  const [systemReports, setSystemReports] = useState(false)
  const [profile, setProfile] = useState<FinanceProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await fetchFinanceProfile()
      setProfile(data)
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuthRequired(true)
      } else {
        console.error('Failed to load profile:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  if (authRequired) {
    return (
      <FinanceLayout title="Account Settings">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (loading) {
    return (
      <FinanceLayout title="Account Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Account Settings">
      <div className="p-8 max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GreetingIcon className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
              {greeting.text}, {profile?.name?.split(' ')[0] || 'Finance'}
            </h1>
          </div>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Profile Section (Left Column) */}
          <section className="col-span-12 lg:col-span-7 space-y-6">
            {/* Personal Profile Card */}
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-foreground">Personal Profile</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your administrative details and contact information.
                  </p>
                </div>
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <User className="w-8 h-8" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Full Name</Label>
                  <Input 
                    defaultValue={profile?.name || ''}
                    className="bg-muted border-none focus:ring-2 focus:ring-primary focus:bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Finance ID</Label>
                  <div className="flex items-center justify-between bg-secondary border border-border/15 rounded-lg px-4 py-3 text-muted-foreground font-medium">
                    <span>{profile?.id || 'N/A'}</span>
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Work Email</Label>
                  <Input 
                    type="email"
                    defaultValue={profile?.email || ''}
                    className="bg-muted border-none focus:ring-2 focus:ring-primary focus:bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Phone Number</Label>
                  <Input 
                    type="tel"
                    defaultValue={profile?.phone || ''}
                    className="bg-muted border-none focus:ring-2 focus:ring-primary focus:bg-card"
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 flex justify-end">
                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Save Profile Changes
                </Button>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-foreground">Security & Authentication</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Current Password</Label>
                    <Input 
                      type="password"
                      placeholder="••••••••••••"
                      className="bg-muted border-none focus:ring-2 focus:ring-primary focus:bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">New Password</Label>
                    <Input 
                      type="password"
                      placeholder="Min. 12 characters"
                      className="bg-muted border-none focus:ring-2 focus:ring-primary focus:bg-card"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Enabled via Sentinel Authenticator</p>
                    </div>
                  </div>
                  <Button variant="link" className="text-primary font-bold text-sm">
                    Manage 2FA
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column */}
          <section className="col-span-12 lg:col-span-5 space-y-6">
            {/* Identity Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-indigo-600 p-8 text-primary-foreground shadow-xl">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div className="flex justify-between items-start">
                  <div className="font-black text-xl tracking-tighter opacity-80">SENTINEL</div>
                  <Wifi className="w-6 h-6" />
                </div>
                <div className="space-y-4">
                  <div className="text-xs uppercase tracking-[0.2em] font-medium opacity-70">
                    Authorized Financial Officer
                  </div>
                  <div className="text-2xl font-bold font-[family-name:var(--font-manrope)] tracking-tight">
                    {profile?.name || 'Finance Officer'}
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="font-mono text-sm tracking-widest opacity-80">
                    **** **** **** {profile?.id?.slice(-4) || '8829'}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase opacity-60">Expires</div>
                    <div className="text-sm font-bold">09/27</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-foreground mb-6">Alert Preferences</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Payment Alerts</p>
                    <p className="text-xs text-muted-foreground">Real-time status of outgoing transfers</p>
                  </div>
                  <Switch 
                    checked={paymentAlerts} 
                    onCheckedChange={setPaymentAlerts}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Verification Alerts</p>
                    <p className="text-xs text-muted-foreground">Critical compliance & KYC updates</p>
                  </div>
                  <Switch 
                    checked={verificationAlerts} 
                    onCheckedChange={setVerificationAlerts}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">System Reports</p>
                    <p className="text-xs text-muted-foreground">Weekly analytical performance logs</p>
                  </div>
                  <Switch 
                    checked={systemReports} 
                    onCheckedChange={setSystemReports}
                  />
                </div>
              </div>
            </div>

            {/* Security Tip */}
            <div className="bg-secondary rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">Enterprise Tip</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ensure you update your password every 90 days as per the Sentinel Finance 
                    internal security policy to maintain Tier 1 clearance.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </FinanceLayout>
  )
}
