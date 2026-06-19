import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  farm_name: string | null
  location: string | null
  role: string
  status: string
  business_mode_enabled: boolean
  default_milk_price: number
  suspension_reason: string | null
}

interface AuthStore {
  session: Session | null
  profile: Profile | null
  loading: boolean
  setSession: (s: Session | null) => void
  setProfile: (p: Profile | null) => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}))
