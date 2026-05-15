'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const supabase = getSupabaseBrowserClient()

const roleConfig = {
  employee: { label: 'Employee Portal', badgeClass: 'bg-blue-100 text-blue-700', idLabel: 'Employee ID', placeholder: 'EMP-001', redirect: '/dashboard' },
  manager: { label: 'Manager Portal', badgeClass: 'bg-amber-100 text-amber-700', idLabel: 'Manager ID', placeholder: 'MGR-001', redirect: 'http://localhost:3001/login' },
  finance: { label: 'Finance Portal', badgeClass: 'bg-emerald-100 text-emerald-700', idLabel: 'Finance ID', placeholder: 'FIN-001', redirect: 'http://localhost:3002' }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('employee')
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const config = roleConfig[role as keyof typeof roleConfig]

  // Pre-fill employee ID from URL params if provided by gateway
  useEffect(() => {
    const employeeIdFromUrl = searchParams.get('employee_id')
    if (employeeIdFromUrl) {
      setEmpId(employeeIdFromUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Generate 4-digit employee ID if not provided
    let finalEmpId = empId.trim()
    if (!finalEmpId && mode === 'register') {
      const random4Digit = Math.floor(1000 + Math.random() * 9000)
      finalEmpId = `EMP-${random4Digit}`
    }

    const email = finalEmpId.toLowerCase().replace(/[^a-z0-9]/g, '') + '@expensepro.com'

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        
        if (error) {
          if (error.message.includes('Invalid')) {
            setError('Invalid credentials. Click "Register" to create a new account.')
          } else {
            setError(error.message)
          }
          setLoading(false)
          return
        }
        
        const userRole = data.user.user_metadata?.role || 'employee'
        localStorage.setItem('user_role', userRole)
        localStorage.setItem('user_id', finalEmpId)
        router.push(roleConfig[userRole as keyof typeof roleConfig]?.redirect || '/dashboard')
        
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              employee_id: finalEmpId,
              role: role
            }
          }
        })
        
        if (signUpError) {
          if (signUpError.message.includes('rate limit')) {
            setError('Too many attempts. Please wait 1 minute and try a different ID.')
          } else {
            setError(signUpError.message)
          }
          setLoading(false)
          return
        }
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        
        if (signInError && signInError.message.includes('Email not confirmed')) {
          setSuccess('Account created! Email confirmation is required. Please check your email.')
          setLoading(false)
          return
        }
        
        if (signInError) {
          setError(signInError.message)
          setLoading(false)
          return
        }
        
        localStorage.setItem('user_role', role)
        localStorage.setItem('user_id', finalEmpId)
        
        // Show success message with generated ID
        if (mode === 'register' && role === 'employee' && !empId) {
          setSuccess(`Account created! Your Employee ID is: ${finalEmpId}`)
          setTimeout(() => router.push(config.redirect), 2000)
        } else {
          router.push(config.redirect)
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Hero Section */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-600 to-purple-700 text-white p-12 flex-col justify-center">
        <h1 className="text-5xl font-bold mb-4">ExpensePro</h1>
        <p className="text-xl opacity-90">Smart Expense Management for Modern Teams</p>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <div className="text-2xl font-bold text-blue-600 mb-2">ExpensePro</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">{mode === 'login' ? 'Sign In' : 'Register'}</h2>
          <p className="text-gray-600 mb-6">Enter your ID and password</p>

          {/* Role Selector */}
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4 ${config.badgeClass}`}>
            {config.label}
          </div>
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="finance">Finance</option>
          </select>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {config.idLabel}
                {mode === 'register' && role === 'employee' && (
                  <span className="text-gray-400 font-normal"> (optional)</span>
                )}
              </label>
              <input
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder={mode === 'register' && role === 'employee' ? 'Leave empty to auto-generate' : config.placeholder}
                required={mode === 'login' || role !== 'employee'}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
