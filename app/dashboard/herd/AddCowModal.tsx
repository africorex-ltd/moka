'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BREEDS = ['Friesian', 'Ayrshire', 'Jersey', 'Guernsey', 'Cross-breed', 'Local']
const STATUSES = ['active', 'dry', 'pregnant', 'sold']

export default function AddCowModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    tag_number: '',
    breed: 'Friesian',
    status: 'active',
    date_of_birth: '',
    date_acquired: '',
    acquisition_cost: '',
    sire_code: '',
    dam_name: '',
    live_weight_kg: '',
    body_condition_score: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name && !form.tag_number) {
      setError('Enter a name or tag number')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error: err } = await supabase.from('cows').insert({
        local_id: crypto.randomUUID(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
        name: form.name || null,
        tag_number: form.tag_number || null,
        breed: form.breed || null,
        status: form.status,
        date_of_birth: form.date_of_birth || null,
        date_acquired: form.date_acquired || null,
        acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : null,
        sire_code: form.sire_code || null,
        dam_name: form.dam_name || null,
        live_weight_kg: form.live_weight_kg ? parseFloat(form.live_weight_kg) : null,
        body_condition_score: form.body_condition_score ? parseFloat(form.body_condition_score) : null,
        notes: form.notes || null,
      })
      if (err) throw err
      setOpen(false)
      setForm({ name: '', tag_number: '', breed: 'Friesian', status: 'active', date_of_birth: '', date_acquired: '', acquisition_cost: '', sire_code: '', dam_name: '', live_weight_kg: '', body_condition_score: '', notes: '' })
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
        + Add Cow
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-moka-900">Add Cow</h2>
              <button onClick={() => setOpen(false)} className="text-moka-400 hover:text-moka-900 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name">
                  <input className={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Daisy" />
                </Field>
                <Field label="Tag Number">
                  <input className={input} value={form.tag_number} onChange={e => set('tag_number', e.target.value)} placeholder="e.g. KE-001" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Breed">
                  <select className={input} value={form.breed} onChange={e => set('breed', e.target.value)}>
                    {BREEDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={input} value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth">
                  <input type="date" className={input} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                </Field>
                <Field label="Date Acquired">
                  <input type="date" className={input} value={form.date_acquired} onChange={e => set('date_acquired', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Acquisition Cost (KES)">
                  <input type="number" className={input} value={form.acquisition_cost} onChange={e => set('acquisition_cost', e.target.value)} placeholder="0" />
                </Field>
                <Field label="Live Weight (kg)">
                  <input type="number" className={input} value={form.live_weight_kg} onChange={e => set('live_weight_kg', e.target.value)} placeholder="0" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sire Code">
                  <input className={input} value={form.sire_code} onChange={e => set('sire_code', e.target.value)} placeholder="optional" />
                </Field>
                <Field label="Dam Name">
                  <input className={input} value={form.dam_name} onChange={e => set('dam_name', e.target.value)} placeholder="optional" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Body Condition Score (1-5)">
                  <input type="number" min="1" max="5" step="0.5" className={input} value={form.body_condition_score} onChange={e => set('body_condition_score', e.target.value)} placeholder="3" />
                </Field>
              </div>
              <Field label="Notes">
                <textarea className={input} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="optional" />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-moka-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-moka-800 text-white text-sm font-semibold hover:bg-moka-700 disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save Cow'}
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

const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-moka-500 bg-white'
