'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Cow = { local_id: string; name?: string | null; tag_number?: string | null }

export default function AddMilkModal({ cows }: { cows: Cow[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    cow_local_id: cows[0]?.local_id ?? '',
    date: today,
    session: 'morning',
    quantity_litres: '',
    quality_notes: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cow_local_id) { setError('Select a cow'); return }
    if (!form.quantity_litres) { setError('Enter quantity'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error: err } = await supabase.from('milk_log').insert({
        local_id: crypto.randomUUID(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
        cow_local_id: form.cow_local_id,
        date: form.date,
        session: form.session,
        quantity_litres: parseFloat(form.quantity_litres),
        quality_notes: form.quality_notes || null,
      })
      if (err) throw err
      setOpen(false)
      setForm({ cow_local_id: cows[0]?.local_id ?? '', date: today, session: 'morning', quantity_litres: '', quality_notes: '' })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-moka-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-moka-700 transition-colors"
      >
        + Log Milk
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-moka-900">Log Milk</h2>
              <button onClick={() => setOpen(false)} className="text-moka-400 hover:text-moka-900 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Cow">
                <select className={inp} value={form.cow_local_id} onChange={e => set('cow_local_id', e.target.value)}>
                  {cows.length === 0 && <option value="">No cows — add one first</option>}
                  {cows.map(c => (
                    <option key={c.local_id} value={c.local_id}>
                      {c.tag_number ? `${c.tag_number} — ` : ''}{c.name ?? c.local_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input type="date" className={inp} value={form.date} onChange={e => set('date', e.target.value)} />
                </Field>
                <Field label="Session">
                  <select className={inp} value={form.session} onChange={e => set('session', e.target.value)}>
                    <option value="morning">Morning</option>
                    <option value="midday">Midday</option>
                    <option value="evening">Evening</option>
                    <option value="total">Total</option>
                  </select>
                </Field>
              </div>
              <Field label="Quantity (litres)">
                <input type="number" step="0.1" min="0" className={inp} value={form.quantity_litres} onChange={e => set('quantity_litres', e.target.value)} placeholder="0.0" required />
              </Field>
              <Field label="Quality Notes">
                <input className={inp} value={form.quality_notes} onChange={e => set('quality_notes', e.target.value)} placeholder="optional" />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-moka-700 hover:bg-gray-50">
                  Cancel
                </button>
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
  return (
    <div>
      <label className="block text-xs font-semibold text-moka-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-moka-500 bg-white'
