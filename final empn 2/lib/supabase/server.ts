import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const getSupabaseServerClient = async () => {
  const cookieStore = await cookies()
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key) => cookieStore.get(key)?.value ?? null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  })
}
