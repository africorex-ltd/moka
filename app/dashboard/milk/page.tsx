import { createClient } from '@/lib/supabase/server'

export default async function MilkPage() {
  const supabase = await createClient()

  const { data: records, count } = await supabase
    .from('milk_records')
    .select('*, cattle(tag_number, name)', { count: 'exact' })
    .order('recorded_at', { ascending: false })
    .limit(100)

  // Monthly totals
  const byMonth: Record<string, number> = {}
  for (const r of records ?? []) {
    const key = new Date(r.recorded_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })
    byMonth[key] = (byMonth[key] ?? 0) + (r.quantity_litres ?? 0)
  }
  const months = Object.entries(byMonth).slice(-6).reverse()

  const totalLitres = (records ?? []).reduce((s, r) => s + (r.quantity_litres ?? 0), 0)
  const avgDaily = totalLitres / 30

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-moka-900">Milk Records</h1>
        <p className="text-moka-700 text-sm mt-1">{count ?? 0} records total</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total (30 days)</div>
          <div className="text-2xl font-black text-moka-900">{totalLitres.toFixed(0)} L</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Daily Average</div>
          <div className="text-2xl font-black text-moka-900">{avgDaily.toFixed(1)} L</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Records</div>
          <div className="text-2xl font-black text-moka-900">{count ?? 0}</div>
        </div>
      </div>

      {/* Monthly breakdown */}
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
                      style={{ width: `${(litres / max) * 100}%` }}
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

      {/* Records table */}
      {records && records.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">Date & Time</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">Cow</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">Session</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-moka-700 uppercase tracking-wide">Litres</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 30).map((r) => {
                const cow = r.cattle as { tag_number?: string; name?: string } | null
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50">
                    <td className="px-5 py-3 text-moka-700 text-xs">
                      {new Date(r.recorded_at).toLocaleDateString('en-KE', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-moka-900">
                      {cow?.tag_number ?? cow?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.session === 'am' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {r.session?.toUpperCase() ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-moka-900">
                      {r.quantity_litres ?? 0} L
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
          <p className="text-moka-700 text-sm">Start recording milk production from the Moka mobile app.</p>
        </div>
      )}
    </div>
  )
}
