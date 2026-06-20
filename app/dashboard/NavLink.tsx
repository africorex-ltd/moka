'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname()
  const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive ? 'bg-moka-700 text-white' : 'text-moka-200 hover:bg-moka-800 hover:text-white'
      }`}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </Link>
  )
}
