'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Cow = { local_id: string; name?: string | null; tag_number?: string | null }
const EVENT_TYPES = ['AI (Artificial Insemination)', 'Natural Service', 'PD (Pregnancy Diagnosis)', 'Drying Off', 'Calving', 'Other']

export default function AddBreedingModal({ cows }: { cows: Cow[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    cow_local_id: cows[0]?.local_id ?? '',
    date: today,
    event_type: 'AI (Artificial Insemination)',
    sire_code: '',
    bull_or_stud_details: '',
    expected_calving_date: '',
    pd_date: '',
    pd_result: '',
    cost: '',
    notes: '',
    outcome: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cow_local_id) { setError('Select a cow'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error: err } = await supabase.from('breeding_log').insert({
        local_id: crypto.randomUUID(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
        cow_local_id: form.cow_local_id,
        date: form.date,
        event_type: form.event_type,
        sire_code: form.sire_code || null,
        bull_or_stud_details: form.bull_or_stud_details || null,
        expected_calving_date: form.expected_calving_date || null,
        pd_date: form.pd_date || null,
        pd_result: form.pd_result || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        notes: form.notes || null,
        outcome: form.outcome || null,
      })
      if (err) throw err
      setOpen(false)
      setForm({ cow_local_id: cows[0]?.local_id ?? '', date: today, event_type: 'AI (Artificial Insemination)', sire_code: '', bull_or_stud_details: '', expected_calving_date: '', pd_date: '', pd_result: '', cost: '', notes: '', outcome: '' })
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
        + Log Breeding Event
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-moka-900">Log Breeding Event</h2>
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
                <Field label="Event Type">
                  <select className={inp} value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sire Code">
                  <input className={inp} value={form.sire_code} onChange={e => set('sire_code', e.target.value)} placeholder="optional" />
                </Field>
                <Field label="Bull / Stud Details">
                  <input className={inp} value={form.bull_or_stud_details} onChange={e => set('bull_or_stud_details', e.target.value)} placeholder="optional" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Expected Calving Date">
                  <input type="date" className={inp} value={form.expected_calving_date} onChange={e => set('expected_calving_date', e.target.value)} />
                </Field>
                <Field label="Cost (KES)">
                  <input type="number" className={inp} value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="PD Date">
                  <input type="date" className={inp} value={form.pd_date} onChange={e => set('pd_date', e.target.value)} />
                </Field>
                <Field label="PD Result">
                  <select className={inp} value={form.pd_result} onChange={e => set('pd_result', e.target.value)}>
                    <option value="">—</option>
                    <option value="positive">Positive (Pregnant)</option>
                    <option value="negative">Negative</option>
                  </select>
                </Field>
              </div>
              <Field label="Outcome">
                <input className={inp} value={form.outcome} onChange={e => set('outcome', e.target.value)} placeholder="e.g. Live calf, Twins, Stillbirth" />
              </Field>
              <Field label="Notes">
                <textarea className={inp} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="optional" />
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
