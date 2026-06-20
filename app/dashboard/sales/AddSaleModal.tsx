'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AddSaleModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    date: today,
    buyer_name: '',
    quantity_litres: '',
    price_per_litre: '',
    payment_method: 'cash',
    mpesa_reference: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.quantity_litres || !form.price_per_litre) { setError('Enter quantity and price'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error: err } = await supabase.from('milk_sales').insert({
        local_id: crypto.randomUUID(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
        date: form.date,
        buyer_name: form.buyer_name || null,
        quantity_litres: parseFloat(form.quantity_litres),
        price_per_litre: parseFloat(form.price_per_litre),
        payment_method: form.payment_method,
        mpesa_reference: form.payment_method === 'mpesa' ? (form.mpesa_reference || null) : null,
      })
      if (err) throw err
      setOpen(false)
      setForm({ date: today, buyer_name: '', quantity_litres: '', price_per_litre: '', payment_method: 'cash', mpesa_reference: '' })
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
        + Record Sale
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-moka-900">Record Sale</h2>
              <button onClick={() => setOpen(false)} className="text-moka-400 hover:text-moka-900 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input type="date" className={inp} value={form.date} onChange={e => set('date', e.target.value)} required />
                </Field>
                <Field label="Buyer Name">
                  <input className={inp} value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} placeholder="e.g. KCC" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity (litres)">
                  <input type="number" step="0.1" min="0" className={inp} value={form.quantity_litres} onChange={e => set('quantity_litres', e.target.value)} placeholder="0.0" required />
                </Field>
                <Field label="Price per litre (KES)">
                  <input type="number" step="0.1" min="0" className={inp} value={form.price_per_litre} onChange={e => set('price_per_litre', e.target.value)} placeholder="0.0" required />
                </Field>
              </div>
              <Field label="Payment Method">
                <select className={inp} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </Field>
              {form.payment_method === 'mpesa' && (
                <Field label="M-Pesa Reference">
                  <input className={inp} value={form.mpesa_reference} onChange={e => set('mpesa_reference', e.target.value)} placeholder="Transaction code" />
                </Field>
              )}
              {form.quantity_litres && form.price_per_litre && (
                <div className="bg-moka-50 rounded-xl p-3 text-sm font-semibold text-moka-800">
                  Total: KES {(parseFloat(form.quantity_litres || '0') * parseFloat(form.price_per_litre || '0')).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-moka-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-moka-800 text-white text-sm font-semibold hover:bg-moka-700 disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save Sale'}
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
