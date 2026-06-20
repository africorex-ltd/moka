import { createClient } from '@/lib/supabase/server'
import AddHealthModal from './AddHealthModal'

export default async function HealthPage() {
  const supabase = await createClient()

  const [logsRes, cowsRes] = await Promise.all([
    supabase
      .from('health_log')
      .select('*')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(200),
    supabase
      .from('cows')
      .select('local_id, name, tag_number')
      .is('deleted_at', null)
      .order('name'),
  ])

  const logs = logsRes.data ?? []
  const cows = cowsRes.data ?? []

  const cowMap: Record<string, { name?: string; tag_number?: string }> = {}
  for (const c of cows) cowMap[c.local_id] = c

  const totalCost = logs.reduce((s, r) => s + (r.cost ?? 0), 0)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Health Log</h1>
          <p className="text-moka-700 text-sm mt-1">{logs.length} events recorded</p>
        </div>
        <AddHealthModal cows={cows} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Events</div>
          <div className="text-2xl font-black text-moka-900">{logs.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Vet Cost</div>
          <div className="text-2xl font-black text-moka-900">KES {totalCost.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Upcoming Follow-ups</div>
          <div className="text-2xl font-black text-moka-900">
            {logs.filter(l => l.next_due_date && new Date(l.next_due_date) >= new Date()).length}
          </div>
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Date</Th>
                <Th>Cow</Th>
                <Th>Event</Th>
                <Th>Description</Th>
                <Th>Drug / Dosage</Th>
                <Th align="right">Cost</Th>
                <Th>Follow-up</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const cow = cowMap[l.cow_local_id]
                return (
                  <tr key={l.local_id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50">
                    <td className="px-5 py-3 text-moka-700 text-xs">
                      {new Date(l.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-moka-900">
                      {cow?.tag_number ?? cow?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">{l.event_type ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-moka-700 max-w-[140px] truncate">{l.description ?? '—'}</td>
                    <td className="px-5 py-3 text-moka-500 text-xs">
                      {[l.drug_used, l.dosage].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-moka-900">
                      {l.cost ? `KES ${l.cost}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-moka-500 text-xs">
                      {l.next_due_date ? new Date(l.next_due_date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">💊</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No health events yet</h3>
          <p className="text-moka-700 text-sm">Log vaccinations, treatments and vet visits.</p>
        </div>
      )}
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th className={`px-5 py-3 text-xs font-semibold text-moka-700 uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}
