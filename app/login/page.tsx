'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function MokaLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#2D5016" rx="180" />
      <path fill="white" d="M 185,850 L 185,250 L 295,250 L 512,575 L 729,250 L 839,250 L 839,850 L 729,850 L 729,410 L 555,688 L 469,688 L 295,410 L 295,850 Z" />
      <ellipse cx="476" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(-22, 476, 130)" />
      <ellipse cx="548" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(22, 548, 130)" />
      <rect x="508" y="188" width="8" height="65" rx="4" fill="#6DAA4A" />
    </svg>
  )
}

type Tab = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('signin')

  // shared fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setDone(false)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (err) return setError(err.message)
    router.push('/dashboard')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Please enter your full name.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')

    setLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: name.trim() } },
    })
    if (err) {
      setLoading(false)
      return setError(err.message)
    }

    // Create profile row
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name.trim(),
        role: 'farmer',
        status: 'active',
      })
    }
    setLoading(false)

    // If email confirmation is required, show success message; otherwise redirect
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setDone(true)
    }
  }

  // ── Email confirmation sent ──
  if (done) {
    return (
      <div className="min-h-screen bg-moka-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-moka-800 px-8 py-10 text-center">
            <div className="flex justify-center mb-4"><MokaLogo /></div>
          </div>
          <div className="px-8 py-10 text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-xl font-black text-moka-900 mb-2">Check your email</h2>
            <p className="text-moka-700 text-sm leading-relaxed mb-6">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate
              your account, then come back here to sign in.
            </p>
            <button
              onClick={() => { setDone(false); setTab('signin') }}
              className="w-full bg-moka-800 text-white font-bold py-3 rounded-xl hover:bg-moka-900 transition-colors text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-moka-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-moka-800 px-8 pt-10 pb-6 text-center">
            <div className="flex justify-center mb-3"><MokaLogo /></div>
            <h1 className="text-white text-2xl font-black tracking-tight">Moka</h1>
            <p className="text-moka-400 text-sm mt-1">Smart Farm Companion</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => switchTab('signin')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'signin'
                  ? 'text-moka-800 border-b-2 border-moka-800 -mb-px'
                  : 'text-gray-400 hover:text-moka-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab('signup')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'signup'
                  ? 'text-moka-800 border-b-2 border-moka-800 -mb-px'
                  : 'text-gray-400 hover:text-moka-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Forms */}
          <div className="px-8 py-7">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
                {error}
              </div>
            )}

            {tab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field label="Email address">
                  <input
                    type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </Field>

                <Field label="Password" right={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-xs text-moka-700 hover:text-moka-900">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                }>
                  <input
                    type={showPass ? 'text' : 'password'} autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className={inputCls}
                  />
                </Field>

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => switchTab('signup')} className="text-moka-800 font-semibold hover:underline">
                    Create one free
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field label="Full name">
                  <input
                    type="text" autoComplete="name" required
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Michael Kamau"
                    className={inputCls}
                  />
                </Field>

                <Field label="Email address">
                  <input
                    type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </Field>

                <Field label="Password (8+ characters)" right={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-xs text-moka-700 hover:text-moka-900">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                }>
                  <input
                    type={showPass ? 'text' : 'password'} autoComplete="new-password" required
                    minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={inputCls}
                  />
                </Field>

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? 'Creating account…' : 'Create Account — Free'}
                </button>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchTab('signin')} className="text-moka-800 font-semibold hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-moka-500 mt-5">
          <Link href="/" className="hover:text-moka-800">← Back to homepage</Link>
        </p>
      </div>
    </div>
  )
}

/* ─── helpers ─── */

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-moka-900 text-sm focus:outline-none focus:ring-2 focus:ring-moka-800 focus:border-transparent bg-gray-50 placeholder-gray-400'

const btnCls =
  'w-full bg-moka-800 text-white font-bold py-3.5 rounded-xl hover:bg-moka-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm'

function Field({
  label, right, children,
}: {
  label: string; right?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-moka-900">{label}</span>
        {right}
      </div>
      {children}
    </div>
  )
}
