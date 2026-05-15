"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Receipt, CheckCircle, XCircle, Clock, DollarSign, Calendar, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Claim {
  id: string
  claim_number: string
  vendor_name: string
  amount: number
  expense_date: string
  category: string
  status: string
  profiles?: {
    full_name: string
  }
}

export default function AllClaimsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClaims() {
      try {
        const { data, error } = await supabase
          .from('claims')
          .select(`
            *,
            profiles:employee_id (
              full_name
            )
          `)
          .gte('approval_tier', 2)
          .order('created_at', { ascending: false })

        console.log('Fetched claims:', data)
        console.log('Error:', error)
        
        if (error) throw error
        setClaims(data || [])
      } catch (error) {
        console.error('Error fetching claims:', error)
        setClaims([])
      } finally {
        setLoading(false)
      }
    }

    fetchClaims()
  }, [])

  const filteredClaims = statusFilter === 'all' ? claims : claims.filter(c => c.status.toLowerCase() === statusFilter)

  const totalAmount = claims.reduce((sum, c) => sum + Number(c.amount), 0)
  const approvedAmount = claims.filter(c => c.status === 'Approved').reduce((sum, c) => sum + Number(c.amount), 0)
  const pendingAmount = claims.filter(c => c.status === 'Pending').reduce((sum, c) => sum + Number(c.amount), 0)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading claims...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
          All Claims
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete view of all claims across the organization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claims</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{claims.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">₹{approvedAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">₹{pendingAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'approved', 'pending', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize",
              statusFilter === status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Claims List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredClaims.map((claim) => (
              <Link key={claim.id} href={`/super-owner/all-claims/${claim.id}`} className="block">
                <div className="p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{claim.vendor_name}</h3>
                        <span className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-full capitalize",
                          claim.status === 'Approved' && "bg-emerald-100 text-emerald-700",
                          claim.status === 'Pending' && "bg-amber-100 text-amber-700",
                          claim.status === 'Rejected' && "bg-destructive/10 text-destructive"
                        )}>
                          {claim.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>₹{Number(claim.amount).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{claim.expense_date}</span>
                        </div>
                        <div>Employee: {claim.profiles?.full_name || 'N/A'}</div>
                        <div>Category: {claim.category}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
