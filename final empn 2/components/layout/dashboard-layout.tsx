'use client'

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { Sidebar } from './sidebar'
import { Header, EmployeeHeaderProvider } from './header'
import { fetchCurrentProfile, type DbProfile } from '@/lib/dashboard/supabase-data'

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  showSearch?: boolean
  searchPlaceholder?: string
}

interface DashboardShellConfig {
  title: string
  showSearch: boolean
  searchPlaceholder: string
}

interface DashboardShellContextValue {
  config: DashboardShellConfig
  setConfig: Dispatch<SetStateAction<DashboardShellConfig>>
  profile: DbProfile | null
  isProfileLoading: boolean
  refreshProfile: () => Promise<void>
}

const DEFAULT_CONFIG: DashboardShellConfig = {
  title: 'Dashboard',
  showSearch: true,
  searchPlaceholder: 'Search...',
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null)

export function DashboardShell({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DashboardShellConfig>(DEFAULT_CONFIG)
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  const refreshProfile = async () => {
    setIsProfileLoading(true)

    try {
      const nextProfile = await fetchCurrentProfile()
      setProfile(nextProfile)
    } catch (error) {
      console.error('Failed to load shell profile:', error)
      setProfile(null)
    } finally {
      setIsProfileLoading(false)
    }
  }

  useEffect(() => {
    void refreshProfile()
  }, [])

  return (
    <EmployeeHeaderProvider>
      <DashboardShellContext.Provider
        value={{
          config,
          setConfig,
          profile,
          isProfileLoading,
          refreshProfile,
        }}
      >
        <div className="min-h-screen bg-background overflow-x-hidden">
          <Sidebar />
          <Header
            title={config.title}
            showSearch={config.showSearch}
            searchPlaceholder={config.searchPlaceholder}
            profile={profile}
            userRole="Employee"
            userId={profile?.employee_id || 'N/A'}
            userName={profile?.full_name || 'User'}
          />
          {/* Sidebar is fixed; using margin-left without constraining width causes horizontal overflow. */}
          <main className="ml-[240px] pt-12 min-h-screen w-[calc(100vw-240px)]">{children}</main>
        </div>
      </DashboardShellContext.Provider>
    </EmployeeHeaderProvider>
  )
}

export function DashboardLayout({
  children,
  title = 'Dashboard',
  showSearch = true,
  searchPlaceholder = 'Search...',
}: DashboardLayoutProps) {
  const { setConfig } = useDashboardShell()

  useLayoutEffect(() => {
    setConfig({
      title,
      showSearch,
      searchPlaceholder,
    })
  }, [searchPlaceholder, setConfig, showSearch, title])

  return <>{children}</>
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext)

  if (!context) {
    throw new Error('useDashboardShell must be used within DashboardShell')
  }

  return context
}
