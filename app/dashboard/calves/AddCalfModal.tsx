'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Cow = { local_id: string; name?: string | null; tag_number?: string | null }

export default function AddCalfModal({ cows }: { cows: Cow[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    name: '',
    gender: 'female',
    date_of_birth: today,
    dam_cow_local_id: cows[0]?.local_id ?? '',
    sire_code: '',
    birth_body_weight_kg: '',
    status: 'active',
    remarks: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error: err } = await supabase.from('calf_records').insert({
        local_id: crypto.randomUUID(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
        name: form.name || null,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        dam_cow_local_id: form.dam_cow_local_id || null,
        sire_code: form.sire_code || null,
        birth_body_weight_kg: form.birth_body_weight_kg ? parseFloat(form.birth_body_weight_kg) : null,
        status: form.status,
        remarks: form.remarks || null,
      })
      if (err) throw err
      setOpen(false)
      setForm({ name: '', gender: 'female', date_of_birth: today, dam_cow_local_id: cows[0]?.local_id ?? '', sire_code: '', birth_body_weight_kg: '', status: 'active', remarks: '' })
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
        + Add Calf
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-moka-900">Add Calf</h2>
              <button onClick={() => setOpen(false)} className="text-moka-400 hover:text-moka-900 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name">
                  <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Calf 01" />
                </Field>
                <Field label="Gender">
                  <select className={inp} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="female">Female (Heifer)</option>
                    <option value="male">Male (Bull)</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth">
                  <input type="date" className={inp} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                </Field>
                <Field label="Birth Weight (kg)">
                  <input type="number" step="0.1" className={inp} value={form.birth_body_weight_kg} onChange={e => set('birth_body_weight_kg', e.target.value)} placeholder="0.0" />
                </Field>
              </div>
              <Field label="Dam (Mother Cow)">
                <select className={inp} value={form.dam_cow_local_id} onChange={e => set('dam_cow_local_id', e.target.value)}>
                  <option value="">— select dam —</option>
                  {cows.map(c => <option key={c.local_id} value={c.local_id}>{c.tag_number ? `${c.tag_number} — ` : ''}{c.name ?? c.local_id.slice(0, 8)}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sire Code">
                  <input className={inp} value={form.sire_code} onChange={e => set('sire_code', e.target.value)} placeholder="optional" />
                </Field>
                <Field label="Status">
                  <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="weaned">Weaned</option>
                    <option value="sold">Sold</option>
                    <option value="dead">Dead</option>
                  </select>
                </Field>
              </div>
              <Field label="Remarks">
                <textarea className={inp} rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="optional" />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-moka-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-moka-800 text-white text-sm font-semibold hover:bg-moka-700 disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save Calf'}
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
