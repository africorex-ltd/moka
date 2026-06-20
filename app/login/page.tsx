'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function MokaLogo({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#2D5016" rx="180" />
      <path fill="white" d="M 185,850 L 185,250 L 295,250 L 512,575 L 729,250 L 839,250 L 839,850 L 729,850 L 729,410 L 555,688 L 469,688 L 295,410 L 295,850 Z" />
      <ellipse cx="476" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(-22, 476, 130)" />
      <ellipse cx="548" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(22, 548, 130)" />
      <rect x="508" y="188" width="8" height="65" rx="4" fill="#6DAA4A" />
    </svg>
  )
}

const MILK_MARKETS = [
  {
    id: 'kcc',
    label: 'KCC / Dairy Co-op',
    icon: '🏭',
    desc: 'Sell to Kenya Co-operative Creameries or a registered dairy co-operative',
  },
  {
    id: 'private',
    label: 'Private Buyers',
    icon: '🏪',
    desc: 'Sell directly to shops, hotels, schools, or individual buyers',
  },
  {
    id: 'retail',
    label: 'Direct to Consumers',
    icon: '🏠',
    desc: 'Home delivery, farm gate sales, or retail to end customers',
  },
  {
    id: 'multiple',
    label: 'Multiple Channels',
    icon: '📦',
    desc: 'You use a mix of the options above',
  },
]

const COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii',
  'Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera',
  'Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi',
  'Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta',
  'Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga',
  'Wajir','West Pokot',
]

type Step = 1 | 2 | 3
type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Sign-in fields
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Sign-up step 1
  const [fullName, setFullName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [showSuPass, setShowSuPass] = useState(false)

  // Sign-up step 2
  const [farmName, setFarmName] = useState('')
  const [county, setCounty] = useState('')
  const [phone, setPhone] = useState('')

  // Sign-up step 3
  const [milkMarket, setMilkMarket] = useState('private')

  function switchMode(m: Mode) {
    setMode(m)
    setStep(1)
    setError('')
  }

  function nextStep() {
    setError('')
    if (step === 1) {
      if (!fullName.trim()) return setError('Please enter your full name.')
      if (!suEmail.trim()) return setError('Please enter your email address.')
      if (suPassword.length < 8) return setError('Password must be at least 8 characters.')
      setStep(2)
    } else if (step === 2) {
      if (!farmName.trim()) return setError('Please enter your farm name.')
      if (!county) return setError('Please select your county.')
      setStep(3)
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({
      email: siEmail.trim().toLowerCase(),
      password: siPassword,
    })
    setLoading(false)
    if (err) return setError(err.message)
    router.push('/dashboard')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data, error: err } = await supabase.auth.signUp({
      email: suEmail.trim().toLowerCase(),
      password: suPassword,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (err) { setLoading(false); return setError(err.message) }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        farm_name: farmName.trim(),
        county: county,
        farm_phone: phone.trim() || null,
        milk_market: milkMarket,
        role: 'farmer',
        status: 'active',
      })

      // Trigger welcome email via Edge Function (non-blocking)
      supabase.functions.invoke('send-welcome-email', {
        body: {
          user_id: data.user.id,
          full_name: fullName.trim(),
          farm_name: farmName.trim(),
          email: suEmail.trim().toLowerCase(),
          milk_market: milkMarket,
        },
      }).catch(() => {/* edge fn may not be deployed yet */})
    }

    setLoading(false)
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
      <div className="min-h-screen bg-gradient-to-br from-moka-900 to-moka-700 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-16 h-16 bg-moka-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📬</span>
          </div>
          <h2 className="text-2xl font-black text-moka-900 mb-2">Check your email</h2>
          <p className="text-moka-600 text-sm leading-relaxed mb-2">
            We sent a confirmation link to
          </p>
          <p className="font-bold text-moka-900 mb-6">{suEmail}</p>
          <p className="text-moka-500 text-xs mb-8">
            Click the link in the email to activate your account, then sign in below.
            Check your spam folder if you don&apos;t see it.
          </p>
          <button
            onClick={() => { setDone(false); switchMode('signin'); setSiEmail(suEmail) }}
            className="w-full bg-moka-800 text-white font-bold py-3.5 rounded-xl hover:bg-moka-900 transition-colors text-sm"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL (branding) ── */}
      <div className="hidden lg:flex lg:w-2/5 bg-moka-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <MokaLogo size={44} />
            <div>
              <div className="text-white font-black text-xl">Moka</div>
              <div className="text-moka-400 text-xs">Smart Farm Management</div>
            </div>
          </div>
          <h2 className="text-white text-4xl font-black leading-tight mb-4">
            Run your dairy farm<br />
            <span className="text-moka-400">like a business.</span>
          </h2>
          <p className="text-moka-300 text-sm leading-relaxed mb-10">
            Track milk production, manage your herd, record sales and costs —
            all in one place, on your phone or computer.
          </p>
          <div className="space-y-5">
            {[
              { icon: '🐄', title: 'Herd Management', desc: 'Track every cow — health, breeding, calving' },
              { icon: '🥛', title: 'Milk Records', desc: 'Morning, midday and evening sessions' },
              { icon: '📊', title: 'Financial Reports', desc: 'P&L, costs and revenue at a glance' },
              { icon: '📱', title: 'Works Offline', desc: 'Mobile app syncs when you have data' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-moka-800 rounded-lg flex items-center justify-center text-lg shrink-0">{f.icon}</div>
                <div>
                  <div className="text-white text-sm font-semibold">{f.title}</div>
                  <div className="text-moka-400 text-xs">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            {[1,2,3,4,5].map(i => <span key={i} className="text-moka-400 text-sm">★</span>)}
          </div>
          <p className="text-moka-300 text-sm italic leading-relaxed">
            &ldquo;Moka helped me understand exactly how much money each cow is making me. My income
            from dairy has increased 35% since I started tracking properly.&rdquo;
          </p>
          <div className="text-moka-500 text-xs mt-2">— James K., Nakuru County</div>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="flex items-center gap-2">
              <MokaLogo size={40} />
              <div>
                <div className="text-moka-900 font-black text-lg">Moka</div>
                <div className="text-moka-500 text-xs">Smart Farm Management</div>
              </div>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-8">
            <button
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signin'
                  ? 'bg-moka-800 text-white shadow-sm'
                  : 'text-moka-600 hover:text-moka-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-moka-800 text-white shadow-sm'
                  : 'text-moka-600 hover:text-moka-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {mode === 'signin' ? (
            /* ── SIGN IN ── */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-black text-moka-900 mb-1">Welcome back</h2>
              <p className="text-moka-500 text-sm mb-7">Sign in to your Moka farm account</p>

              {error && <ErrorBanner message={error} />}

              <form onSubmit={handleSignIn} className="space-y-5">
                <Field label="Email address">
                  <input type="email" autoComplete="email" required value={siEmail}
                    onChange={e => setSiEmail(e.target.value)} placeholder="you@example.com"
                    className={inp} />
                </Field>
                <Field label="Password" right={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-xs text-moka-600 hover:text-moka-900 font-medium">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                }>
                  <input type={showPass ? 'text' : 'password'} autoComplete="current-password"
                    required value={siPassword} onChange={e => setSiPassword(e.target.value)}
                    placeholder="Your password" className={inp} />
                </Field>
                <button type="submit" disabled={loading} className={btn}>
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>
              </form>

              <p className="text-center text-xs text-moka-400 mt-6">
                New to Moka?{' '}
                <button onClick={() => switchMode('signup')} className="text-moka-800 font-semibold hover:underline">
                  Create a free account
                </button>
              </p>
            </div>
          ) : (
            /* ── SIGN UP (multi-step) ── */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Step progress */}
              <div className="px-8 pt-7 pb-5 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  {([1,2,3] as Step[]).map((s) => (
                    <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        step > s ? 'bg-moka-700 text-white' :
                        step === s ? 'bg-moka-800 text-white' :
                        'bg-gray-100 text-moka-400'
                      }`}>
                        {step > s ? '✓' : s}
                      </div>
                      {s < 3 && <div className={`h-0.5 flex-1 rounded ${step > s ? 'bg-moka-700' : 'bg-gray-100'}`} />}
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="text-xl font-black text-moka-900">
                    {step === 1 ? 'Create your account' : step === 2 ? 'Tell us about your farm' : 'Where do you sell your milk?'}
                  </h2>
                  <p className="text-moka-500 text-xs mt-0.5">
                    Step {step} of 3 — {step === 1 ? 'Your personal details' : step === 2 ? 'Your farm details' : 'We customise your dashboard to match'}
                  </p>
                </div>
              </div>

              <div className="p-8">
                {error && <ErrorBanner message={error} />}

                {step === 1 && (
                  <div className="space-y-5">
                    <Field label="Full name">
                      <input type="text" autoComplete="name" required value={fullName}
                        onChange={e => setFullName(e.target.value)} placeholder="Michael Kamau"
                        className={inp} />
                    </Field>
                    <Field label="Email address">
                      <input type="email" autoComplete="email" required value={suEmail}
                        onChange={e => setSuEmail(e.target.value)} placeholder="michael@example.com"
                        className={inp} />
                    </Field>
                    <Field label="Password" right={
                      <button type="button" onClick={() => setShowSuPass(!showSuPass)} className="text-xs text-moka-600 hover:text-moka-900 font-medium">
                        {showSuPass ? 'Hide' : 'Show'}
                      </button>
                    }>
                      <input type={showSuPass ? 'text' : 'password'} autoComplete="new-password"
                        value={suPassword} onChange={e => setSuPassword(e.target.value)}
                        placeholder="Minimum 8 characters" className={inp} />
                      {suPassword && (
                        <PasswordStrength password={suPassword} />
                      )}
                    </Field>
                    <button onClick={nextStep} className={btn}>Continue →</button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <Field label="Farm name">
                      <input type="text" required value={farmName}
                        onChange={e => setFarmName(e.target.value)} placeholder="e.g. Kilimo Dairy Farm"
                        className={inp} />
                    </Field>
                    <Field label="County">
                      <select value={county} onChange={e => setCounty(e.target.value)} className={inp}>
                        <option value="">— Select county —</option>
                        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Phone number (optional)">
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="+254 7XX XXX XXX" className={inp} />
                    </Field>
                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className={`flex-1 ${btnOutline}`}>← Back</button>
                      <button onClick={nextStep} className={`flex-1 ${btn}`}>Continue →</button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {MILK_MARKETS.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMilkMarket(m.id)}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                            milkMarket === m.id
                              ? 'border-moka-700 bg-moka-50'
                              : 'border-gray-100 hover:border-moka-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-2xl shrink-0 mt-0.5">{m.icon}</span>
                          <div>
                            <div className={`text-sm font-bold ${milkMarket === m.id ? 'text-moka-900' : 'text-moka-800'}`}>
                              {m.label}
                            </div>
                            <div className="text-xs text-moka-500 mt-0.5 leading-relaxed">{m.desc}</div>
                          </div>
                          <div className={`ml-auto shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                            milkMarket === m.id ? 'border-moka-700 bg-moka-700' : 'border-gray-300'
                          }`}>
                            {milkMarket === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setStep(2)} className={`flex-1 ${btnOutline}`}>← Back</button>
                      <button type="submit" disabled={loading} className={`flex-1 ${btn}`}>
                        {loading ? 'Creating account…' : 'Create My Farm →'}
                      </button>
                    </div>
                  </form>
                )}

                {mode === 'signup' && (
                  <p className="text-center text-xs text-moka-400 mt-5">
                    Already have an account?{' '}
                    <button onClick={() => switchMode('signin')} className="text-moka-800 font-semibold hover:underline">
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-moka-400 mt-5">
            <Link href="/" className="hover:text-moka-700">← Back to homepage</Link>
            {' · '}
            <span>By signing up you agree to our Terms of Service</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-moka-500', 'bg-moka-700']
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-100'}`} />
        ))}
      </div>
      <span className={`text-xs font-semibold ${score < 2 ? 'text-red-500' : score < 3 ? 'text-amber-600' : 'text-moka-700'}`}>
        {score > 0 ? labels[score - 1] : ''}
      </span>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
      <span className="shrink-0">⚠</span>
      <span>{message}</span>
    </div>
  )
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-moka-800">{label}</label>
        {right}
      </div>
      {children}
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-moka-900 text-sm focus:outline-none focus:ring-2 focus:ring-moka-700 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-shadow'
const btn = 'w-full bg-moka-800 text-white font-bold py-3.5 rounded-xl hover:bg-moka-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm'
const btnOutline = 'w-full border-2 border-moka-200 text-moka-700 font-semibold py-3.5 rounded-xl hover:bg-moka-50 transition-colors text-sm'
