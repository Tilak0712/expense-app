'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Wallet, Lock, User, Loader2, ArrowRight, Zap, Globe, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const employeeIdFromUrl = searchParams.get('employee_id')
    if (employeeIdFromUrl) {
      setEmpId(employeeIdFromUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const email = empId.toLowerCase().replace(/[^a-z0-9]/g, '') + '@expensepro.com'

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      router.push('/')
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-[family-name:var(--font-manrope)]">
      {/* Hero Section - Split Screen */}
      <div className="hidden lg:flex flex-1 bg-emerald-600 relative overflow-hidden flex-col justify-center p-20">
        <div className="absolute top-0 left-0 w-full h-full">
           <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/20 rounded-full blur-[120px] animate-pulse" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-400/20 rounded-full blur-[120px] animate-pulse delay-1000" />
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
        </div>

        <div className="relative z-10 space-y-8 max-w-xl">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center shadow-2xl">
                 <Wallet className="w-9 h-9 text-white" />
              </div>
              <div className="h-px w-24 bg-gradient-to-r from-white/50 to-transparent" />
           </div>
           
           <div className="space-y-4">
              <h1 className="text-6xl font-black text-white tracking-tighter leading-tight">
                Financial <br />
                <span className="text-emerald-100">Precision.</span>
              </h1>
              <p className="text-emerald-50 text-lg font-medium leading-relaxed opacity-90">
                Verify, Process, and Audit enterprise spend with institutional precision. 
                Maintain complete control over the disbursement lifecycle.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="space-y-1">
                 <p className="text-white font-black text-2xl tracking-tighter">Fast</p>
                 <p className="text-emerald-100/60 text-xs font-bold uppercase tracking-widest">Disbursements</p>
              </div>
              <div className="space-y-1">
                 <p className="text-white font-black text-2xl tracking-tighter">Audit</p>
                 <p className="text-emerald-100/60 text-xs font-bold uppercase tracking-widest">Ready</p>
              </div>
           </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
        
        <div className="w-full max-w-[440px] space-y-10 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4 lg:hidden">
               <Wallet className="w-6 h-6 text-emerald-600" />
               <span className="font-black text-xl tracking-tight text-slate-900">ExpensePro</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Finance Login</h2>
            <p className="text-slate-500 font-medium">Global disbursement & audit terminal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Finance ID</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                  <User className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  placeholder="e.g., FIN001"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all font-bold"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-xs font-bold text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100",
                loading && "bg-slate-700 hover:bg-slate-700 shadow-none"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Enter Terminal
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-10 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fiscal Oversight Active</span>
             </div>
             <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-teal-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">v4.1.2</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
