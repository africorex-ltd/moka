import { createClient } from '@/lib/supabase/server'

export default async function ReportsPage() {
  const supabase = await createClient()

  const [milkRes, salesRes, costsRes] = await Promise.all([
    supabase
      .from('milk_log')
      .select('date, quantity_litres')
      .is('deleted_at', null)
      .order('date', { ascending: true }),
    supabase
      .from('milk_sales')
      .select('date, quantity_litres, price_per_litre, buyer_name')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(100),
    supabase
      .from('business_costs')
      .select('date, amount, category, description')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(100),
  ])

  const milkRecords = milkRes.data ?? []
  const sales = salesRes.data ?? []
  const costs = costsRes.data ?? []

  // Monthly P&L
  const monthly: Record<string, { revenue: number; expenses: number; litres: number }> = {}

  for (const s of sales) {
    const key = new Date(s.date + 'T00:00:00').toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })
    if (!monthly[key]) monthly[key] = { revenue: 0, expenses: 0, litres: 0 }
    monthly[key].revenue += (s.quantity_litres ?? 0) * (s.price_per_litre ?? 0)
    monthly[key].litres += s.quantity_litres ?? 0
  }

  for (const c of costs) {
    const key = new Date(c.date + 'T00:00:00').toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })
    if (!monthly[key]) monthly[key] = { revenue: 0, expenses: 0, litres: 0 }
    monthly[key].expenses += c.amount ?? 0
  }

  const months = Object.entries(monthly).slice(-6)
  const totalRev = months.reduce((s, [, m]) => s + m.revenue, 0)
  const totalExp = months.reduce((s, [, m]) => s + m.expenses, 0)
  const profit = totalRev - totalExp

  // Milk production total
  const totalMilk = milkRecords.reduce((s, r) => s + (r.quantity_litres ?? 0), 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-moka-900">Reports</h1>
        <p className="text-moka-700 text-sm mt-1">Financial summary — last 6 months</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Revenue</div>
          <div className="text-2xl font-black text-moka-900">
            KES {totalRev.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Expenses</div>
          <div className="text-2xl font-black text-red-600">
            KES {totalExp.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm border ${profit >= 0 ? 'bg-moka-800 border-moka-700' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${profit >= 0 ? 'text-moka-400' : 'text-red-500'}`}>
            Net Profit
          </div>
          <div className={`text-2xl font-black ${profit >= 0 ? 'text-white' : 'text-red-700'}`}>
            KES {Math.abs(profit).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
            {profit < 0 && ' loss'}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Milk</div>
          <div className="text-2xl font-black text-moka-900">{totalMilk.toFixed(0)} L</div>
        </div>
      </div>

      {months.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-moka-900">Monthly breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Month</Th>
                <Th align="right">Milk Sold (L)</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">Expenses</Th>
                <Th align="right">Profit</Th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map(([month, { revenue, expenses, litres }]) => {
                const p = revenue - expenses
                return (
                  <tr key={month} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3.5 font-medium text-moka-900">{month}</td>
                    <td className="px-6 py-3.5 text-right text-moka-700">{litres > 0 ? `${litres.toFixed(0)} L` : '—'}</td>
                    <td className="px-6 py-3.5 text-right text-moka-800">
                      {revenue > 0 ? `KES ${revenue.toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right text-red-600">
                      {expenses > 0 ? `KES ${expenses.toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className={`px-6 py-3.5 text-right font-bold ${p >= 0 ? 'text-moka-800' : 'text-red-600'}`}>
                      {p !== 0 ? `KES ${Math.abs(p).toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center mb-6">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No financial data yet</h3>
          <p className="text-moka-700 text-sm">Record sales and costs to see your P&L.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent sales */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-moka-900">Recent Sales</h2>
          </div>
          {sales.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-moka-50">
                  <Th>Date</Th>
                  <Th>Buyer</Th>
                  <Th align="right">Litres</Th>
                  <Th align="right">Revenue</Th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-moka-500 text-xs">
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-moka-900">{s.buyer_name ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-moka-700">{s.quantity_litres} L</td>
                    <td className="px-5 py-3 text-right font-bold text-moka-800">
                      KES {((s.quantity_litres ?? 0) * (s.price_per_litre ?? 0)).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-moka-400 text-sm">No sales recorded yet.</div>
          )}
        </div>

        {/* Recent costs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-moka-900">Recent Costs</h2>
          </div>
          {costs.length > 0 ? (
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
                {costs.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-moka-500 text-xs">
                      {new Date(c.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-moka-900">{c.description ?? '—'}</td>
                    <td className="px-5 py-3 text-moka-700 capitalize">{c.category ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-600">
                      KES {(c.amount ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-moka-400 text-sm">No costs recorded yet.</div>
          )}
        </div>
      </div>
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
