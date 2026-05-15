import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uffgmefxvcuakjczqfit.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZmdtZWZ4dmN1YWtqY3pxZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTgzNzAsImV4cCI6MjA5MjUzNDM3MH0.EsRfMj0aJOPfPizDokYTbxDdzmpj_8eO9VBN6nefiDk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  global: {
    headers: {
      'X-Client-Info': 'expense-super-owner'
    }
  }
})
