import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="bg-white text-moka-900">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-moka-800/95 backdrop-blur-sm border-b border-moka-700">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MokaLogo />
            <span className="text-white font-bold text-xl tracking-tight">Moka</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-moka-200">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#download" className="hover:text-white transition-colors">Download</a>
          </div>
          <Link
            href="/login"
            className="bg-moka-400 text-moka-900 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-moka-200 transition-colors"
          >
            Sign In / Sign Up
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="bg-moka-800 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-moka-700 text-moka-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-moka-400" />
              Now available on Android
            </div>
            <h1 className="text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6">
              Your farm,<br />
              <span className="text-moka-400">finally managed.</span>
            </h1>
            <p className="text-moka-200 text-lg leading-relaxed mb-10 max-w-md">
              Moka tracks every cow, records your daily milk yield, and shows your
              profit & loss — so you can focus on farming, not paperwork.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#download"
                className="flex items-center gap-3 bg-white text-moka-900 font-semibold px-6 py-3.5 rounded-xl hover:bg-moka-100 transition-colors shadow-lg"
              >
                <AndroidIcon />
                Download for Android
              </a>
              <a
                href="#features"
                className="flex items-center gap-2 border border-moka-600 text-white px-6 py-3.5 rounded-xl hover:bg-moka-700 transition-colors"
              >
                Learn more ↓
              </a>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <Link
                href="/login"
                className="text-moka-400 text-sm font-semibold hover:text-white transition-colors underline underline-offset-4"
              >
                Or use Moka on the web →
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-6 text-sm text-moka-400">
              <span>✓ Free to start</span>
              <span>✓ Works offline</span>
              <span>✓ Secure & private</span>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-moka-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          {[
            { value: '500+', label: 'Cattle tracked' },
            { value: '50K+', label: 'Milk records logged' },
            { value: '3', label: 'Countries active' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-black text-moka-400">{s.value}</div>
              <div className="text-xs text-moka-200 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-moka-800 font-semibold text-sm tracking-wider uppercase">
              Everything you need
            </span>
            <h2 className="text-4xl font-black text-moka-900 mt-3">
              Built for real farms
            </h2>
            <p className="text-moka-700 mt-3 text-lg max-w-xl mx-auto">
              No spreadsheets. No guesswork. Just your farm data, clear and simple.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-moka-50 rounded-2xl p-8 hover:shadow-lg transition-shadow border border-moka-100">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold text-moka-900 mb-2">{f.title}</h3>
                <p className="text-moka-700 text-sm leading-relaxed mb-5">{f.desc}</p>
                <ul className="space-y-2">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-moka-800">
                      <span className="w-4 h-4 rounded-full bg-moka-400 flex items-center justify-center text-white text-[10px] shrink-0">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-20 bg-moka-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-moka-800 font-semibold text-sm tracking-wider uppercase">Simple setup</span>
            <h2 className="text-4xl font-black text-moka-900 mt-3">Up and running in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { n: '01', title: 'Create your account', desc: 'Sign up with your email. Your data is securely stored and synced across all your devices.' },
              { n: '02', title: 'Add your herd', desc: 'Enter your cattle one by one or in bulk. Each animal gets its own profile with full history.' },
              { n: '03', title: 'Start recording', desc: 'Log milk every day, track expenses, and watch your farm data come to life in real-time charts.' },
            ].map((step) => (
              <div key={step.n}>
                <div className="text-6xl font-black text-moka-200 leading-none mb-4">{step.n}</div>
                <h3 className="text-lg font-bold text-moka-900 mb-2">{step.title}</h3>
                <p className="text-moka-700 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section id="download" className="py-20 bg-moka-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🌿</div>
          <h2 className="text-4xl font-black text-white mb-4">
            Ready to transform your farm?
          </h2>
          <p className="text-moka-200 text-lg mb-10 max-w-xl mx-auto">
            Join dairy farmers across Africa who are managing their herds smarter with Moka.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="flex items-center justify-center gap-3 bg-white text-moka-900 font-bold px-8 py-4 rounded-xl hover:bg-moka-100 transition-colors text-base shadow-xl"
            >
              <AndroidIcon />
              Download for Android
            </a>
            <div className="flex items-center justify-center gap-3 border border-moka-600 text-moka-400 px-8 py-4 rounded-xl text-base opacity-70 cursor-not-allowed">
              <AppleIcon />
              iOS — Coming soon
            </div>
          </div>
          <p className="text-moka-400 text-xs mt-8">
            Requires Android 7.0 or later · Free · No ads
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-moka-950 text-moka-400 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <MokaLogo size={28} />
            <span className="text-white font-bold">Moka</span>
            <span className="text-moka-700 mx-2">·</span>
            <span className="text-xs">by Africorex Ltd</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:hello@africorex.com" className="hover:text-white transition-colors">Contact</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p className="text-xs text-moka-700">
            © {new Date().getFullYear()} Africorex Ltd · Nairobi, Kenya
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ─── Data ─── */

const FEATURES = [
  {
    icon: '🐄',
    title: 'Herd Management',
    desc: 'Record every animal — ear tag, breed, age, health events, calving dates, and milk yield per cow. Know your herd inside out.',
    points: ['Individual cow profiles', 'Health & vet records', 'Calving tracker', 'Breed performance'],
  },
  {
    icon: '🥛',
    title: 'Milk Records',
    desc: 'Log morning and evening sessions, see daily totals, and track production trends with beautiful visual charts.',
    points: ['AM/PM session logging', 'Production charts', 'Per-cow yield tracking', 'Monthly summaries'],
  },
  {
    icon: '📊',
    title: 'P&L Reports',
    desc: 'See your income, expenses, and profit at a glance. Generate PDF reports to share with your cooperative or bank.',
    points: ['Revenue & expense tracking', 'Monthly P&L', 'PDF export', 'Financial trend analysis'],
  },
]

/* ─── UI Components ─── */

function MokaLogo({ size = 36 }: { size?: number }) {
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

function AndroidIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 0 0 6 7h12a5.983 5.983 0 0 0-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function PhoneMockup() {
  return (
    <div className="relative">
      <div className="w-64 h-[480px] bg-moka-900 rounded-[44px] border-4 border-moka-700 shadow-2xl overflow-hidden relative">
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-moka-800 rounded-full z-10" />
        {/* Screen */}
        <div className="absolute inset-0 bg-moka-50 pt-10 flex flex-col">
          {/* App header */}
          <div className="bg-moka-800 px-4 pt-8 pb-4 shrink-0">
            <div className="text-moka-400 text-[10px]">Good morning</div>
            <div className="text-white font-bold text-sm">Michael&apos;s Farm</div>
          </div>
          {/* Cards */}
          <div className="px-3 py-3 space-y-2 overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-[10px] text-moka-700">Total Cattle</div>
                <div className="text-moka-900 font-black text-lg">48</div>
                <div className="text-[9px] text-moka-400">+2 this month</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-[10px] text-moka-700">Today&apos;s Milk</div>
                <div className="text-moka-900 font-black text-lg">312 L</div>
                <div className="text-[9px] text-moka-400">↑ 8% vs yesterday</div>
              </div>
            </div>
            <div className="bg-moka-800 rounded-xl p-3 text-white">
              <div className="text-[10px] text-moka-400">Monthly Revenue</div>
              <div className="font-black text-lg">KES 84,200</div>
              <div className="text-[9px] text-moka-200">After expenses: KES 51,400</div>
            </div>
            {/* Mini chart */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-[10px] text-moka-700 mb-2">Milk this week (L)</div>
              <div className="flex items-end gap-1 h-12">
                {[60, 75, 65, 80, 70, 85, 78].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${(h / 85) * 100}%`,
                      backgroundColor: i === 5 ? '#2D5016' : '#EAF2E3',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Glow effect */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-full scale-75 translate-y-8"
        style={{ backgroundColor: '#8FBA78' }}
      />
    </div>
  )
}
