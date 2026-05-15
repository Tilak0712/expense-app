"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface Claim {
  id: string
  employee: {
    name: string
    empId: string
    initials: string
  }
  claimId: string
  amount: number
  category: string
  date: string
  status: "pending" | "verified" | "approved" | "rejected" | "paid" | "in-review" | "flagged"
}

interface ClaimsTableProps {
  claims: Claim[]
  title: string
  subtitle?: string
  showCategory?: boolean
  showAction?: boolean
  actionLabel?: string
  onAction?: (claim: Claim) => void
  variant?: "verify" | "pay" | "track"
}

const statusStyles = {
  "pending": "bg-amber-50 text-amber-700 border-amber-200",
  "verified": "bg-primary/10 text-primary border-primary/20",
  "approved": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "rejected": "bg-destructive/10 text-destructive border-destructive/20",
  "paid": "bg-primary/10 text-primary border-primary/20",
  "in-review": "bg-blue-50 text-blue-700 border-blue-200",
  "flagged": "bg-[#4338d9]/10 text-[#4338d9] border-[#4338d9]/20",
}

const avatarColors = [
  "bg-primary/10 text-primary",
  "bg-[#4338d9]/10 text-[#4338d9]",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
]

export function ClaimsTable({
  claims,
  title,
  subtitle,
  showCategory = true,
  showAction = true,
  actionLabel = "Verify",
  onAction,
  variant = "verify",
}: ClaimsTableProps) {
  const getActionButton = (claim: Claim) => {
    switch (variant) {
      case "pay":
        return (
          <Button
            size="sm"
            className="bg-[#4338d9] hover:bg-[#4338d9]/90 text-white text-xs font-bold"
            onClick={() => onAction?.(claim)}
          >
            Execute Pay
          </Button>
        )
      case "track":
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/5 text-sm font-bold"
            onClick={() => onAction?.(claim)}
          >
            Open
          </Button>
        )
      default:
        return (
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold"
            onClick={() => onAction?.(claim)}
          >
            {actionLabel}
          </Button>
        )
    }
  }

  return (
    <div className="bg-card rounded-xl shadow-[0_8px_24px_-4px_rgba(25,28,30,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between bg-muted/30 border-b border-border/10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            variant === "pay" ? "bg-emerald-500" : variant === "track" ? "bg-blue-500" : "bg-amber-500"
          )} />
          <div>
            <h2 className="font-serif text-lg font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <Button variant="link" className="text-primary text-sm font-bold">
          View All
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-widest">
              <th className="px-8 py-4 font-bold">Employee</th>
              <th className="px-4 py-4 font-bold">Claim ID</th>
              <th className="px-4 py-4 font-bold text-right">Amount</th>
              {showCategory && <th className="px-4 py-4 font-bold">Category</th>}
              <th className="px-4 py-4 font-bold">Date</th>
              <th className="px-4 py-4 font-bold">Status</th>
              {showAction && <th className="px-8 py-4 font-bold text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {claims.map((claim, idx) => (
              <tr
                key={claim.id}
                className="hover:bg-muted/30 transition-colors group"
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <Avatar className={cn("w-8 h-8", avatarColors[idx % avatarColors.length])}>
                      <AvatarFallback className={avatarColors[idx % avatarColors.length]}>
                        {claim.employee.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-foreground">{claim.employee.name}</p>
                      <p className="text-xs text-muted-foreground">{claim.employee.empId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-5">
                  <span className="font-mono text-sm text-muted-foreground">{claim.claimId}</span>
                </td>
                <td className="px-4 py-5 text-right">
                  <span className={cn(
                    "text-sm font-bold",
                    variant === "pay" ? "text-emerald-600" : "text-foreground"
                  )}>
                    ₹{claim.amount.toLocaleString('en-IN')}
                  </span>
                </td>
                {showCategory && (
                  <td className="px-4 py-5">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {claim.category}
                    </Badge>
                  </td>
                )}
                <td className="px-4 py-5 text-sm text-muted-foreground">{claim.date}</td>
                <td className="px-4 py-5">
                  <Badge className={cn("text-[10px] font-bold uppercase", statusStyles[claim.status])}>
                    {claim.status.replace("-", " ")}
                  </Badge>
                </td>
                {showAction && (
                  <td className="px-8 py-5 text-right">
                    {getActionButton(claim)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
