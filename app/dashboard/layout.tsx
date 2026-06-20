import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import SignOutButton from './SignOutButton'
import { NavLink } from './NavLink'

const NAV = [
  { href: '/dashboard',           label: 'Overview',  icon: '⊞' },
  { href: '/dashboard/herd',      label: 'Herd',      icon: '🐄' },
  { href: '/dashboard/calves',    label: 'Calves',    icon: '🐮' },
  { href: '/dashboard/milk',      label: 'Milk Log',  icon: '🥛' },
  { href: '/dashboard/sales',     label: 'Sales',     icon: '💰' },
  { href: '/dashboard/health',    label: 'Health',    icon: '💊' },
  { href: '/dashboard/feeding',   label: 'Feeding',   icon: '🌾' },
  { href: '/dashboard/breeding',  label: 'Breeding',  icon: '🔄' },
  { href: '/dashboard/costs',     label: 'Costs',     icon: '💸' },
  { href: '/dashboard/reports',   label: 'Reports',   icon: '📊' },
  { href: '/dashboard/profile',   label: 'Profile',   icon: '⚙️' },
]

function MokaLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#2D5016" rx="180" />
      <path fill="white" d="M 185,850 L 185,250 L 295,250 L 512,575 L 729,250 L 839,250 L 839,850 L 729,850 L 729,410 L 555,688 L 469,688 L 295,410 L 295,850 Z" />
      <ellipse cx="476" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(-22, 476, 130)" />
      <ellipse cx="548" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(22, 548, 130)" />
      <rect x="508" y="188" width="8" height="65" rx="4" fill="#6DAA4A" />
    </svg>
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, farm_name, farm_logo_url, county, milk_market')
    .eq('id', user.id)
    .single()

  const displayName  = profile?.full_name ?? user.email ?? 'Admin'
  const farmName     = (profile?.farm_name as string) ?? 'My Farm'
  const farmLogoUrl  = profile?.farm_logo_url as string | null
  const initials     = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 bg-moka-900 flex flex-col">

        {/* Farm brand area */}
        <div className="px-5 py-5 border-b border-moka-800">
          <div className="flex items-center gap-3 mb-3">
            {farmLogoUrl ? (
              <Image
                src={farmLogoUrl}
                alt="Farm logo"
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-cover ring-2 ring-moka-700"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-moka-800 flex items-center justify-center">
                <MokaLogo />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">{farmName}</div>
              <div className="text-moka-400 text-[10px] mt-0.5 truncate">
                {profile?.county as string ?? 'Powered by Moka'}
              </div>
            </div>
          </div>
          {/* Powered by Moka badge */}
          <div className="flex items-center gap-1.5 bg-moka-800/60 rounded-lg px-2.5 py-1.5">
            <MokaLogo />
            <span className="text-moka-300 text-[10px] font-medium">Powered by Moka</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-moka-800">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-moka-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{displayName}</div>
              <div className="text-moka-400 text-[10px] truncate">{user.email}</div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  )
}
