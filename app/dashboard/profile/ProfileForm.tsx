'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = {
  id?: string
  full_name?: string | null
  farm_name?: string | null
  location?: string | null
  default_milk_price?: number | null
  role?: string | null
}

export default function ProfileForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    farm_name: profile?.farm_name ?? '',
    location: profile?.location ?? '',
    default_milk_price: profile?.default_milk_price?.toString() ?? '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: form.full_name || null,
          farm_name: form.farm_name || null,
          location: form.location || null,
          default_milk_price: form.default_milk_price ? parseFloat(form.default_milk_price) : null,
        })
      if (err) throw err
      setSaved(true)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full Name">
          <input className={inp} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Farm Name">
          <input className={inp} value={form.farm_name} onChange={e => set('farm_name', e.target.value)} placeholder="e.g. Kilimo Farm" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Location">
          <input className={inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Nakuru, Kenya" />
        </Field>
        <Field label="Default Milk Price (KES/L)">
          <input type="number" step="0.1" min="0" className={inp} value={form.default_milk_price} onChange={e => set('default_milk_price', e.target.value)} placeholder="e.g. 45" />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-moka-700 font-medium">Profile saved successfully.</p>}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-moka-800 text-white text-sm font-semibold hover:bg-moka-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-moka-700 mb-1">{label}</label>{children}</div>
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-moka-500 bg-white'
