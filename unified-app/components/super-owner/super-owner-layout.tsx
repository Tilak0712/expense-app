"use client"

import { Header, SuperOwnerHeaderProvider } from "./header"
import { Sidebar } from "./sidebar"
import { AuthGuard } from "@/components/auth-guard"

interface SuperOwnerLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  showSearch?: boolean
}

export function SuperOwnerLayout({ children, title, showBackButton, showSearch }: SuperOwnerLayoutProps) {
  return (
    <AuthGuard>
      <SuperOwnerHeaderProvider>
        <div className="min-h-screen">
          <Sidebar />
          <Header title={title} showBackButton={showBackButton} showSearch={showSearch} userRole="Super Owner" userId="SO-001" userName="Admin User" />
          <main className="ml-[240px] pt-12 min-h-screen">
            {children}
          </main>
        </div>
      </SuperOwnerHeaderProvider>
    </AuthGuard>
  )
}
