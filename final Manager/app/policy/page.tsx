"use client"

import { useState, useEffect } from "react"
import { ManagerLayout } from "@/components/manager/manager-layout"
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
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchAllClaims,
  type ManagerClaim
} from "@/lib/dashboard/manager-supabase-data"

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
  const [claims, setClaims] = useState<ManagerClaim[]>([])
  
  // Load claims for real stats
  useEffect(() => {
    fetchAllClaims()
      .then(setClaims)
      .catch(() => {})
  }, [])

  // Compute real stats from claims
  const activeRules = limits.filter(r => r.enabled).length + autoRules.filter(r => r.enabled).length
  const flaggedClaims = claims.filter(c => c.amount > 50000).length
  const complianceRate = claims.length > 0
    ? Math.round(((claims.length - flaggedClaims) / claims.length) * 100)
    : 100
  const totalSavings = claims
    .filter(c => c.status === 'Rejected')
    .reduce((sum, c) => sum + c.amount, 0)

  // Auto-approval limit state
  const [autoApprovalLimit, setAutoApprovalLimit] = useState(5000)
  const [isEditingLimit, setIsEditingLimit] = useState(false)
  const [tempLimit, setTempLimit] = useState(5000)
  
  // Vendor editing state
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [newVendor, setNewVendor] = useState<Omit<Vendor, 'id'>>({
    name: '',
    category: 'Transportation',
    maxAmount: 5000,
    status: 'active'
  })

  const toggleRule = (id: string, isAutoRule: boolean) => {
    if (isAutoRule) {
      setAutoRules(autoRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
    } else {
      setLimits(limits.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
    }
  }

  const handleNewRule = () => {
    alert('Policy rule creation coming soon!')
  }

  const handleSaveLimit = () => {
    setAutoApprovalLimit(tempLimit)
    setIsEditingLimit(false)
    // Update the low value claims rule description
    setAutoRules(autoRules.map(r => 
      r.id === '4' 
        ? { ...r, description: `Auto-approve under ₹${tempLimit.toLocaleString('en-IN')}` }
        : r
    ))
  }

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendorId(vendor.id)
    setEditingVendor({ ...vendor })
  }

  const handleSaveVendor = () => {
    if (editingVendor) {
      setVendors(vendors.map(v => v.id === editingVendor.id ? editingVendor : v))
      setEditingVendorId(null)
      setEditingVendor(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingVendorId(null)
    setEditingVendor(null)
  }

  const handleAddVendor = () => {
    const id = (vendors.length + 1).toString()
    setVendors([...vendors, { ...newVendor, id }])
    setIsAddingVendor(false)
    setNewVendor({ name: '', category: 'Transportation', maxAmount: 5000, status: 'active' })
  }

  const handleDeleteVendor = (id: string) => {
    setVendors(vendors.filter(v => v.id !== id))
  }

  const handleToggleVendorStatus = (id: string) => {
    setVendors(vendors.map(v => 
      v.id === id ? { ...v, status: v.status === 'active' ? 'inactive' : 'active' } : v
    ))
  }

  const categories = ['Transportation', 'Food & Beverages', 'Office Supplies', 'Travel', 'Software', 'Utilities']

  return (
    <ManagerLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
              Policy Engine
            </h1>
            <p className="text-muted-foreground mt-1">Configure expense policies and governance rules</p>
          </div>
          <button 
            onClick={handleNewRule}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>

        {/* Policy Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-5 rounded-xl border-l-4 border-primary shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Active</span>
            </div>
            <p className="text-3xl font-black text-foreground">{activeRules}</p>
            <p className="text-xs text-muted-foreground mt-1">Policy Rules</p>
          </div>
          <div className="bg-secondary p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
            </div>
            <p className="text-3xl font-black text-foreground">{flaggedClaims}</p>
            <p className="text-xs text-muted-foreground mt-1">Flagged This Week</p>
          </div>
          <div className="bg-secondary p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-black text-foreground">{complianceRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Compliance Rate</p>
          </div>
          <div className="bg-secondary p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <PiggyBank className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-black text-foreground">₹{(totalSavings / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground mt-1">Saved (Rejected)</p>
          </div>
        </div>

        {/* Auto-Approval Limit Setting */}
        <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Set Auto-Approval Limit</h3>
                <p className="text-xs text-muted-foreground">Claims below this amount will be auto-approved</p>
              </div>
            </div>
            
            {isEditingLimit ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">₹</span>
                  <input
                    type="number"
                    value={tempLimit}
                    onChange={(e) => setTempLimit(Number(e.target.value))}
                    className="w-32 px-3 py-2 text-lg font-bold bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    min={0}
                    step={500}
                  />
                </div>
                <button
                  onClick={handleSaveLimit}
                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingLimit(false)
                    setTempLimit(autoApprovalLimit)
                  }}
                  className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="px-6 py-3 bg-emerald-500/10 rounded-lg">
                  <span className="text-2xl font-black text-emerald-600">
                    ₹{autoApprovalLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsEditingLimit(true)
                    setTempLimit(autoApprovalLimit)
                  }}
                  className="p-2 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 hover:text-foreground transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Policy Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Expense Limits */}
          <div className="bg-card rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Expense Limits</h3>
                <p className="text-xs text-muted-foreground">Per transaction and monthly caps</p>
              </div>
            </div>
            <div className="space-y-4">
              {limits.map((rule) => (
                <div 
                  key={rule.id}
                  className="relative bg-secondary p-4 rounded-xl border-l-4 border-primary"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{rule.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id, false)}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative flex-shrink-0",
                        rule.enabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow",
                        rule.enabled && "translate-x-4"
                      )} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>Applies to: {rule.appliesTo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Approval Rules */}
          <div className="bg-card rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Auto-Approval Rules</h3>
                <p className="text-xs text-muted-foreground">Claims that bypass manual review</p>
              </div>
            </div>
            <div className="space-y-4">
              {autoRules.map((rule) => (
                <div 
                  key={rule.id}
                  className="relative bg-secondary p-4 rounded-xl border-l-4 border-primary"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{rule.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id, true)}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative flex-shrink-0",
                        rule.enabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow",
                        rule.enabled && "translate-x-4"
                      )} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {rule.appliesTo.includes('tenure') ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <VerifiedIcon className="w-3 h-3" />
                    )}
                    <span>{rule.appliesTo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pre-Approved Vendors Section */}
        <div className="bg-card rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Pre-Approved Vendors</h3>
                <p className="text-xs text-muted-foreground">Vendors eligible for auto-approval workflow</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddingVendor(true)}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:scale-[1.02] transition-transform flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </button>
          </div>

          {/* Add Vendor Form */}
          {isAddingVendor && (
            <div className="bg-secondary p-4 rounded-xl mb-4 border-2 border-dashed border-primary/30">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendor Name</label>
                  <input
                    type="text"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    placeholder="Enter vendor name"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  <select
                    value={newVendor.category}
                    onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Amount (₹)</label>
                  <input
                    type="number"
                    value={newVendor.maxAmount}
                    onChange={(e) => setNewVendor({ ...newVendor, maxAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    min={0}
                    step={500}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleAddVendor}
                    disabled={!newVendor.name.trim()}
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingVendor(false)
                      setNewVendor({ name: '', category: 'Transportation', maxAmount: 5000, status: 'active' })
                    }}
                    className="px-4 py-2 bg-muted text-muted-foreground font-semibold text-sm rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vendors Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    {editingVendorId === vendor.id && editingVendor ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editingVendor.name}
                            onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={editingVendor.category}
                            onChange={(e) => setEditingVendor({ ...editingVendor, category: e.target.value })}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={editingVendor.maxAmount}
                            onChange={(e) => setEditingVendor({ ...editingVendor, maxAmount: Number(e.target.value) })}
                            className="w-24 px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            min={0}
                            step={500}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setEditingVendor({ 
                              ...editingVendor, 
                              status: editingVendor.status === 'active' ? 'inactive' : 'active' 
                            })}
                            className={cn(
                              "px-2 py-1 text-xs font-semibold rounded-full",
                              editingVendor.status === 'active' 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {editingVendor.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleSaveVendor}
                              className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium text-sm text-foreground">{vendor.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{vendor.category}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-sm text-foreground">₹{vendor.maxAmount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleVendorStatus(vendor.id)}
                            className={cn(
                              "px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors",
                              vendor.status === 'active' 
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {vendor.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditVendor(vendor)}
                              className="p-1.5 bg-secondary text-muted-foreground rounded hover:bg-secondary/80 hover:text-foreground transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(vendor.id)}
                              className="p-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ManagerLayout>
  )
}
