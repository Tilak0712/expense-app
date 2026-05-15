"use client"

import { useState } from "react"
import { 
  User, 
  Mail, 
  Building2, 
  Shield, 
  Camera,
  Save,
  Lock,
  Phone,
  Globe,
  MapPin
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: "Super Owner",
    email: "super.owner@company.com",
    phone: "+91 98765 43210",
    role: "Super Owner",
    department: "Executive",
    company: "ExpensePro Corp",
    location: "Mumbai, India",
    timezone: "Asia/Kolkata",
    joinDate: "2020-01-15",
    avatar: null as string | null
  })

  const handleSave = () => {
    setIsEditing(false)
    alert("Profile updated successfully")
  }

  const statusItems = [
    { label: "Total Claims Processed", value: "12,450", icon: Globe },
    { label: "Pending Approvals", value: "5", icon: Shield },
    { label: "Escalations This Month", value: "3", icon: Building2 },
    { label: "Active Managers", value: "8", icon: User },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
            Profile
          </h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
            isEditing 
              ? "bg-emerald-500 text-white hover:bg-emerald-600" 
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isEditing ? <Save className="w-4 h-4" /> : null}
          {isEditing ? "Save Changes" : "Edit Profile"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Avatar & Quick Stats */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-primary" />
                )}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.role}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Active
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Activity Overview</h3>
            <div className="space-y-4">
              {statusItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Security
            </h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Change Password
              </button>
              <button className="w-full px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Two-Factor Auth
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-6">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:ring-0"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{profile.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:ring-0"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:ring-0"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Department</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.department}
                    onChange={(e) => setProfile({...profile, department: e.target.value})}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:ring-0"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{profile.department}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-6">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Company</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile.company}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Role</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile.role}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Location</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Timezone</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile.timezone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-6">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Employee ID</label>
                <div className="px-3 py-2 bg-secondary/50 rounded-lg text-sm">SUP-001</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Join Date</label>
                <div className="px-3 py-2 bg-secondary/50 rounded-lg text-sm">{profile.joinDate}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Last Login</label>
                <div className="px-3 py-2 bg-secondary/50 rounded-lg text-sm">Today at 9:42 AM</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Account Status</label>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Active
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
