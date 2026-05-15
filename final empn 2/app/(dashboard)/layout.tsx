import { DashboardShell } from '@/components/layout/dashboard-layout'

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
