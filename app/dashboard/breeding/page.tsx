import { createClient } from '@/lib/supabase/server'
import AddBreedingModal from './AddBreedingModal'

export default async function BreedingPage() {
  const supabase = await createClient()

  const [logsRes, cowsRes] = await Promise.all([
    supabase
      .from('breeding_log')
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

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Breeding Log</h1>
          <p className="text-moka-700 text-sm mt-1">{logs.length} events recorded</p>
        </div>
        <AddBreedingModal cows={cows} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Events</div>
          <div className="text-2xl font-black text-moka-900">{logs.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Expected Calvings</div>
          <div className="text-2xl font-black text-moka-900">
            {logs.filter(l => l.expected_calving_date && !l.actual_calving_date).length}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Successful Calvings</div>
          <div className="text-2xl font-black text-moka-900">
            {logs.filter(l => l.actual_calving_date).length}
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
                <Th>Sire Code</Th>
                <Th>Expected Calving</Th>
                <Th>Outcome</Th>
                <Th align="right">Cost</Th>
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
                    <td className="px-5 py-3 text-moka-900">{cow?.tag_number ?? cow?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">{l.event_type ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-moka-700">{l.sire_code ?? '—'}</td>
                    <td className="px-5 py-3 text-moka-700 text-xs">
                      {l.expected_calving_date ? new Date(l.expected_calving_date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {l.outcome ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-moka-100 text-moka-800">{l.outcome}</span> : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-moka-700">{l.cost ? `KES ${l.cost}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">🔄</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No breeding records yet</h3>
          <p className="text-moka-700 text-sm">Track AI events, pregnancies and calvings.</p>
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
