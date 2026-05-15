"use client"

import { Sidebar } from "./sidebar"
import { Header, FinanceHeaderProvider } from "./topbar"

interface FinanceLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  showSearch?: boolean
}

export function FinanceLayout({ children, title, showBackButton, showSearch }: FinanceLayoutProps) {
  return (
    <FinanceHeaderProvider>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Sidebar />
        <Header title={title} showBackButton={showBackButton} showSearch={showSearch} userRole="Finance" userId="FIN-001" userName="Finance Admin" />
        {/* Sidebar is fixed; constrain main width to avoid horizontal overflow/blank space. */}
        <main className="ml-[240px] pt-12 min-h-screen w-[calc(100vw-240px)]">
          {children}
        </main>
      </div>
    </FinanceHeaderProvider>
  )
}
