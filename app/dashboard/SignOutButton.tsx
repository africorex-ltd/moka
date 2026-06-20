'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full mt-3 text-moka-400 hover:text-white text-xs py-1.5 rounded-lg hover:bg-moka-800 transition-colors"
    >
      Sign out
    </button>
  )
}
