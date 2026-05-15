import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KPICardProps {
  title: string
  value: string
  icon: LucideIcon
  badge?: string
  badgeColor?: "primary" | "positive" | "critical" | "negative" | "neutral"
  trend?: string
  trendUp?: boolean
  subtitle?: string
}

const badgeColors = {
  primary: "bg-informative text-informative border border-primary/20",
  positive: "bg-positive text-positive border border-positive/20",
  critical: "bg-critical text-critical border border-critical/20",
  negative: "bg-negative text-negative border border-negative/20",
  neutral: "bg-muted text-muted-foreground border border-border",
}

const iconBgColors = {
  primary: "bg-informative text-primary",
  positive: "bg-positive text-positive",
  critical: "bg-critical text-critical",
  negative: "bg-negative text-negative",
  neutral: "bg-muted text-muted-foreground",
}

export function KPICard({
  title,
  value,
  icon: Icon,
  badge,
  badgeColor = "primary",
  trend,
  trendUp,
  subtitle,
}: KPICardProps) {
  return (
    <div className="bg-card p-5 rounded-lg tile-shadow border border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded", iconBgColors[badgeColor])}>
          <Icon className="w-4 h-4" />
        </div>
        {badge && (
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", badgeColors[badgeColor])}>
            {badge}
          </span>
        )}
        {trend && (
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded",
            trendUp ? "bg-positive text-positive" : "bg-negative text-negative"
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">
        {title}
      </p>
      <h3 className="text-xl font-semibold text-foreground tracking-tight">
        {value}
      </h3>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  )
}
