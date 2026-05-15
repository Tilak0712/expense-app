import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

declare global {
  // eslint-disable-next-line no-var
  var __finance_supabase_client__: ReturnType<typeof createClient> | undefined
}

export const getSupabaseBrowserClient = () => {
  if (!globalThis.__finance_supabase_client__) {
    globalThis.__finance_supabase_client__ = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      global: {
        headers: {
          'X-Client-Info': 'expense-manager-finance'
        }
      }
    })
  }
  return globalThis.__finance_supabase_client__
}
