"use client"

import { Sidebar } from "./sidebar"
import { Header, HeaderProvider } from "./header"

interface ManagerLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  showSearch?: boolean
}

export function ManagerLayout({ children, title, showBackButton, showSearch }: ManagerLayoutProps) {
  return (
    <HeaderProvider>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Sidebar />
        <Header title={title} showBackButton={showBackButton} showSearch={showSearch} userRole="Manager" userId="MGR-001" userName="Manager" />
        {/* Sidebar is fixed; constrain main width to avoid horizontal overflow/blank space. */}
        <main className="ml-[240px] pt-12 min-h-screen w-[calc(100vw-240px)]">
          {children}
        </main>
      </div>
    </HeaderProvider>
  )
}
