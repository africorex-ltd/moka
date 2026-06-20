import { createClient } from '@/lib/supabase/server'
import AddMilkModal from './AddMilkModal'

export default async function MilkPage() {
  const supabase = await createClient()

  const [recordsRes, cowsRes] = await Promise.all([
    supabase
      .from('milk_log')
      .select('local_id, cow_local_id, date, session, quantity_litres, quality_notes')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(200),
    supabase
      .from('cows')
      .select('local_id, name, tag_number')
      .is('deleted_at', null)
      .order('name'),
  ])

  const records = recordsRes.data ?? []
  const cows = cowsRes.data ?? []

  // Build cow lookup
  const cowMap: Record<string, { name?: string; tag_number?: string }> = {}
  for (const c of cows) cowMap[c.local_id] = c

  // Monthly totals
  const byMonth: Record<string, number> = {}
  for (const r of records) {
    const key = new Date(r.date + 'T00:00:00').toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })
    byMonth[key] = (byMonth[key] ?? 0) + (r.quantity_litres ?? 0)
  }
  const months = Object.entries(byMonth).slice(0, 6)
  const totalLitres = records.reduce((s, r) => s + (r.quantity_litres ?? 0), 0)
  const avgDaily = records.length > 0 ? totalLitres / 30 : 0

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Milk Log</h1>
          <p className="text-moka-700 text-sm mt-1">{records.length} records</p>
        </div>
        <AddMilkModal cows={cows} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total (all time)</div>
          <div className="text-2xl font-black text-moka-900">{totalLitres.toFixed(0)} L</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Daily Average</div>
          <div className="text-2xl font-black text-moka-900">{avgDaily.toFixed(1)} L</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Records</div>
          <div className="text-2xl font-black text-moka-900">{records.length}</div>
        </div>
      </div>

      {months.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-bold text-moka-900 mb-4">Monthly production</h2>
          <div className="space-y-3">
            {months.map(([month, litres]) => {
              const max = Math.max(...months.map(([, v]) => v))
              return (
                <div key={month} className="flex items-center gap-4">
                  <div className="w-20 text-xs text-moka-700 text-right">{month}</div>
                  <div className="flex-1 bg-moka-50 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-moka-800 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(litres / max) * 100}%`, minWidth: 40 }}
                    >
                      <span className="text-[10px] text-white font-bold">{litres.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {records.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Date</Th>
                <Th>Cow</Th>
                <Th>Session</Th>
                <Th align="right">Litres</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 100).map((r) => {
                const cow = cowMap[r.cow_local_id]
                return (
                  <tr key={r.local_id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50">
                    <td className="px-5 py-3 text-moka-700 text-xs">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-moka-900">
                      {cow?.tag_number ?? cow?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <SessionBadge session={r.session} />
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-moka-900">
                      {r.quantity_litres ?? 0} L
                    </td>
                    <td className="px-5 py-3 text-moka-500 text-xs truncate max-w-[120px]">
                      {r.quality_notes ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">🥛</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No milk records yet</h3>
          <p className="text-moka-700 text-sm">Start logging milk using the button above.</p>
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

function SessionBadge({ session }: { session: string | null }) {
  const map: Record<string, string> = {
    morning: 'bg-amber-50 text-amber-700',
    midday: 'bg-blue-50 text-blue-700',
    evening: 'bg-indigo-50 text-indigo-700',
    total: 'bg-moka-100 text-moka-800',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[session ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
      {session ?? '—'}
    </span>
  )
}
