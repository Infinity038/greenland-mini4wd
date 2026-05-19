'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveMemberData } from '@/lib/member'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'register' | 'verify'>('register')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Registration form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', nationality: '', city: '', experience: ''
  })

  // Verification form state
  const [verifyEmail, setVerifyEmail] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('members').insert([{
        name: form.name,
        email: form.email,
        phone: form.phone,
        nationality: form.nationality,
        city: form.city,
        experience: form.experience,
      }])

      if (insertError && insertError.code !== '23505') {
        throw insertError
      }

      saveMemberData({ ...form })
      document.cookie = 'gm4wd_registered=1; path=/; max-age=31536000'
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('email', verifyEmail.trim().toLowerCase())
        .single()

      if (fetchError || !data) {
        setError('No account found with that email. Please register first.')
        return
      }

      saveMemberData(data)
      document.cookie = 'gm4wd_registered=1; path=/; max-age=31536000'
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="font-['Barlow_Condensed'] text-3xl font-bold text-white uppercase tracking-widest">
            Greenland Mini 4WD Club
          </h1>
          <p className="text-[#B8C1CC] text-sm mt-2">Members only. Join free.</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex mb-6 border border-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() => { setMode('register'); setError(''); setSuccess('') }}
            className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              mode === 'register'
                ? 'bg-[#DC2626] text-white'
                : 'bg-[#071426] text-[#B8C1CC] hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => { setMode('verify'); setError(''); setSuccess('') }}
            className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              mode === 'verify'
                ? 'bg-[#DC2626] text-white'
                : 'bg-[#071426] text-[#B8C1CC] hover:text-white'
            }`}
          >
            Member Login
          </button>
        </div>

        <div className="bg-[#071426] border border-white/10 rounded-xl p-6">
          {mode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="font-['Barlow_Condensed'] text-xl font-bold text-white uppercase tracking-wide mb-2">
                Create Your Account
              </h2>
              {['name', 'email', 'phone', 'nationality', 'city'].map((field) => (
                <input
                  key={field}
                  type={field === 'email' ? 'email' : 'text'}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required={field !== 'phone'}
                  className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#B8C1CC] text-sm focus:outline-none focus:border-[#DC2626]"
                />
              ))}
              <select
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                required
                className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#DC2626]"
              >
                <option value="">Experience Level</option>
                <option value="beginner">Beginner — New to Mini 4WD</option>
                <option value="intermediate">Intermediate — Some experience</option>
                <option value="advanced">Advanced — Regular racer</option>
              </select>
              {error && <p className="text-[#DC2626] text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#DC2626] hover:bg-red-700 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Join the Club — Free'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <h2 className="font-['Barlow_Condensed'] text-xl font-bold text-white uppercase tracking-wide mb-2">
                Verify Membership
              </h2>
              <p className="text-[#B8C1CC] text-sm">
                Enter the email you registered with to restore your session.
              </p>
              <input
                type="email"
                placeholder="Your registered email"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                required
                className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#B8C1CC] text-sm focus:outline-none focus:border-[#DC2626]"
              />
              {error && <p className="text-[#DC2626] text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">{success}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#DC2626] hover:bg-red-700 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enter'}
              </button>
              <p className="text-[#B8C1CC] text-xs text-center mt-2">
                Not registered yet?{' '}
                <button type="button" onClick={() => setMode('register')} className="text-[#FACC15] underline">
                  Register free
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}