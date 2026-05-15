"use client"

import { useState, useEffect } from "react"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { 
  Plus,
  Shield,
  Wallet,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  PiggyBank,
  Users,
  Clock,
  VerifiedIcon,
  Edit2,
  X,
  Save,
  Building2,
  Trash2,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchAllClaims,
  type FinanceClaim,
  AuthRequiredError
} from "@/lib/finance/finance-supabase-data"

interface PolicyRule {
  id: string
  title: string
  description: string
  appliesTo: string
  enabled: boolean
}

interface Vendor {
  id: string
  name: string
  category: string
  maxAmount: number
  status: 'active' | 'inactive'
}

const expenseLimits: PolicyRule[] = [
  { id: '1', title: 'Daily Meal Allowance', description: 'Maximum ₹1,500 per day for meals', appliesTo: 'All Employees', enabled: true },
  { id: '2', title: 'Travel Expense Cap', description: 'Maximum ₹50,000 per trip', appliesTo: 'All Employees', enabled: true },
  { id: '3', title: 'Hotel Rate Limit', description: 'Maximum ₹8,000 per night', appliesTo: 'Junior Staff Only', enabled: false },
]

const initialAutoApprovalRules: PolicyRule[] = [
  { id: '4', title: 'Low Value Claims', description: 'Auto-approve under ₹5,000', appliesTo: 'Requires: 3+ months tenure', enabled: true },
  { id: '5', title: 'Recurring Expenses', description: 'Monthly subscriptions & utilities', appliesTo: 'Requires: Pre-approved vendor', enabled: true },
]

const initialVendors: Vendor[] = [
  { id: '1', name: 'Uber India', category: 'Transportation', maxAmount: 2000, status: 'active' },
  { id: '2', name: 'Swiggy Corporate', category: 'Food & Beverages', maxAmount: 1500, status: 'active' },
  { id: '3', name: 'Amazon Business', category: 'Office Supplies', maxAmount: 10000, status: 'active' },
  { id: '4', name: 'MakeMyTrip', category: 'Travel', maxAmount: 25000, status: 'active' },
  { id: '5', name: 'Zomato', category: 'Food & Beverages', maxAmount: 1500, status: 'inactive' },
]

export default function PolicyPage() {
  const [limits, setLimits] = useState(expenseLimits)
  const [autoRules, setAutoRules] = useState(initialAutoApprovalRules)
  const [vendors, setVendors] = useState(initialVendors)
  const [claims, setClaims] = useState<FinanceClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  
  useEffect(() => {
    loadClaimsData()
  }, [])

  const loadClaimsData = async () => {
    try {
      const data = await fetchAllClaims()
      setClaims(data)
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuthRequired(true)
      } else {
        console.error('Failed to load claims:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const activeRules = limits.filter(r => r.enabled).length + autoRules.filter(r => r.enabled).length
  const flaggedClaims = claims.filter(c => c.amount > 50000).length
  const complianceRate = claims.length > 0
    ? Math.round(((claims.length - flaggedClaims) / claims.length) * 100)
    : 100
  const totalSavings = claims
    .filter(c => c.status === 'Rejected')
    .reduce((sum, c) => sum + c.amount, 0)

  const [autoApprovalLimit, setAutoApprovalLimit] = useState(5000)
  const [isEditingLimit, setIsEditingLimit] = useState(false)
  const [tempLimit, setTempLimit] = useState(5000)
  
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [newVendor, setNewVendor] = useState<Omit<Vendor, 'id'>>({
    name: '',
    category: 'Transportation',
    maxAmount: 5000,
    status: 'active'
  })

  if (authRequired) {
    return (
      <FinanceLayout title="Finance Policy">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (loading) {
    return (
      <FinanceLayout title="Finance Policy">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Finance Policy">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Finance Policy & Logic</h2>
            <p className="text-muted-foreground">Configure expense limits, auto-approval rules, and vendor policies</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add New Rule
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg tile-shadow border border-border/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-informative">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold text-foreground">{activeRules}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg tile-shadow border border-border/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-critical">
                <AlertTriangle className="w-5 h-5 text-critical" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flagged Claims</p>
                <p className="text-2xl font-bold text-foreground">{flaggedClaims}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg tile-shadow border border-border/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-positive">
                <CheckCircle className="w-5 h-5 text-positive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
                <p className="text-2xl font-bold text-foreground">{complianceRate}%</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg tile-shadow border border-border/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-positive">
                <PiggyBank className="w-5 h-5 text-positive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Savings</p>
                <p className="text-2xl font-bold text-foreground">₹{(totalSavings / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Limits */}
        <div className="bg-card rounded-lg tile-shadow border border-border/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Expense Limits</h3>
            </div>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {limits.map((limit) => (
              <div key={limit.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    limit.enabled ? "bg-positive" : "bg-muted-foreground"
                  )} />
                  <div>
                    <p className="font-medium text-foreground">{limit.title}</p>
                    <p className="text-sm text-muted-foreground">{limit.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{limit.appliesTo}</span>
                  <button
                    onClick={() => setLimits(limits.map(l => l.id === limit.id ? {...l, enabled: !l.enabled} : l))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors",
                      limit.enabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform",
                      limit.enabled ? "translate-x-6" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Approval Rules */}
        <div className="bg-card rounded-lg tile-shadow border border-border/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Auto-Approval Rules</h3>
            </div>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {autoRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    rule.enabled ? "bg-positive" : "bg-muted-foreground"
                  )} />
                  <div>
                    <p className="font-medium text-foreground">{rule.title}</p>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{rule.appliesTo}</span>
                  <button
                    onClick={() => setAutoRules(autoRules.map(r => r.id === rule.id ? {...r, enabled: !r.enabled} : r))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors",
                      rule.enabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform",
                      rule.enabled ? "translate-x-6" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approved Vendors */}
        <div className="bg-card rounded-lg tile-shadow border border-border/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Approved Vendors</h3>
            </div>
            <button
              onClick={() => setIsAddingVendor(true)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="p-4 bg-muted rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{vendor.category}</p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    vendor.status === 'active' ? "bg-positive text-positive" : "bg-muted text-muted-foreground"
                  )}>
                    {vendor.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Max: ₹{vendor.maxAmount.toLocaleString()}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingVendorId(vendor.id)
                        setEditingVendor(vendor)
                      }}
                      className="p-1.5 hover:bg-background rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setVendors(vendors.filter(v => v.id !== vendor.id))}
                      className="p-1.5 hover:bg-background rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FinanceLayout>
  )
}
