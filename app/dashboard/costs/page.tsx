import { createClient } from '@/lib/supabase/server'
import AddCostModal from './AddCostModal'

export default async function CostsPage() {
  const supabase = await createClient()

  const { data: costs } = await supabase
    .from('business_costs')
    .select('*')
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(200)

  const allCosts = costs ?? []
  const total = allCosts.reduce((s, c) => s + (c.amount ?? 0), 0)

  // Group by category
  const byCategory: Record<string, number> = {}
  for (const c of allCosts) {
    const cat = c.category ?? 'Other'
    byCategory[cat] = (byCategory[cat] ?? 0) + (c.amount ?? 0)
  }
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Business Costs</h1>
          <p className="text-moka-700 text-sm mt-1">{allCosts.length} entries</p>
        </div>
        <AddCostModal />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Costs</div>
          <div className="text-2xl font-black text-red-600">KES {total.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Top Category</div>
          <div className="text-2xl font-black text-moka-900">{categories[0]?.[0] ?? '—'}</div>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-bold text-moka-900 mb-4">By category</h2>
          <div className="space-y-3">
            {categories.map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-24 text-xs text-moka-700">{cat}</div>
                  <div className="flex-1 bg-moka-50 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{ width: `${(amount / total) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-xs font-semibold text-moka-900 w-28 text-right">
                  KES {amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allCosts.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {allCosts.map((c) => (
                <tr key={c.local_id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50">
                  <td className="px-5 py-3 text-moka-700 text-xs">
                    {new Date(c.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-moka-900">{c.description ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 capitalize">{c.category ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-red-600">
                    KES {(c.amount ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">💸</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No costs recorded yet</h3>
          <p className="text-moka-700 text-sm">Track feed, vet, labour and other farm expenses.</p>
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
