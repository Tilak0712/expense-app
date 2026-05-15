import { DashboardShell } from "@/components/layout/dashboard-layout"

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
}
