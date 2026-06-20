'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['Feed', 'Veterinary', 'Labour', 'Medicine', 'Equipment', 'Utilities', 'Transport', 'Other']

export default function AddCostModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    date: today,
    category: 'Feed',
    description: '',
    amount: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) { setError('Enter an amount'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error: err } = await supabase.from('business_costs').insert({
        local_id: crypto.randomUUID(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
        date: form.date,
        category: form.category,
        description: form.description || null,
        amount: parseFloat(form.amount),
      })
      if (err) throw err
      setOpen(false)
      setForm({ date: today, category: 'Feed', description: '', amount: '' })
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
        + Add Cost
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-moka-900">Add Cost</h2>
              <button onClick={() => setOpen(false)} className="text-moka-400 hover:text-moka-900 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input type="date" className={inp} value={form.date} onChange={e => set('date', e.target.value)} required />
                </Field>
                <Field label="Category">
                  <select className={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description">
                <input className={inp} value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Dairy meal 50kg" />
              </Field>
              <Field label="Amount (KES)">
                <input type="number" step="0.01" min="0" className={inp} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" required />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-moka-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-moka-800 text-white text-sm font-semibold hover:bg-moka-700 disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save Cost'}
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
