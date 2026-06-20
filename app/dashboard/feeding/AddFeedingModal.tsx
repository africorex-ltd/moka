'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Cow = { local_id: string; name?: string | null; tag_number?: string | null }
const FEED_TYPES = ['Hay', 'Silage', 'Napier grass', 'Maize stover', 'Concentrates', 'Dairy meal', 'Minerals', 'Other']

export default function AddFeedingModal({ cows }: { cows: Cow[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    cow_local_id: cows[0]?.local_id ?? '',
    date: today,
    feed_type: 'Hay',
    quantity_kg: '',
    cost_per_kg: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cow_local_id || !form.quantity_kg) { setError('Select a cow and enter quantity'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error: err } = await supabase.from('feeding_log').insert({
        local_id: crypto.randomUUID(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
        cow_local_id: form.cow_local_id,
        date: form.date,
        feed_type: form.feed_type,
        quantity_kg: parseFloat(form.quantity_kg),
        cost_per_kg: form.cost_per_kg ? parseFloat(form.cost_per_kg) : null,
        notes: form.notes || null,
      })
      if (err) throw err
      setOpen(false)
      setForm({ cow_local_id: cows[0]?.local_id ?? '', date: today, feed_type: 'Hay', quantity_kg: '', cost_per_kg: '', notes: '' })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-moka-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-moka-700 transition-colors">
        + Log Feeding
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-moka-900">Log Feeding</h2>
              <button onClick={() => setOpen(false)} className="text-moka-400 hover:text-moka-900 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Cow">
                <select className={inp} value={form.cow_local_id} onChange={e => set('cow_local_id', e.target.value)}>
                  {cows.map(c => <option key={c.local_id} value={c.local_id}>{c.tag_number ? `${c.tag_number} — ` : ''}{c.name ?? c.local_id.slice(0, 8)}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input type="date" className={inp} value={form.date} onChange={e => set('date', e.target.value)} required />
                </Field>
                <Field label="Feed Type">
                  <select className={inp} value={form.feed_type} onChange={e => set('feed_type', e.target.value)}>
                    {FEED_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity (kg)">
                  <input type="number" step="0.1" min="0" className={inp} value={form.quantity_kg} onChange={e => set('quantity_kg', e.target.value)} placeholder="0.0" required />
                </Field>
                <Field label="Cost per kg (KES)">
                  <input type="number" step="0.1" min="0" className={inp} value={form.cost_per_kg} onChange={e => set('cost_per_kg', e.target.value)} placeholder="0.0" />
                </Field>
              </div>
              <Field label="Notes">
                <input className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="optional" />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-moka-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading || cows.length === 0} className="flex-1 px-4 py-2.5 rounded-xl bg-moka-800 text-white text-sm font-semibold hover:bg-moka-700 disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-moka-700 mb-1">{label}</label>{children}</div>
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-moka-500 bg-white'
