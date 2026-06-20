import { createClient } from '@/lib/supabase/server'

export default async function ReportsPage() {
  const supabase = await createClient()

  const [milkRes, expenseRes] = await Promise.all([
    supabase
      .from('milk_records')
      .select('quantity_litres, price_per_litre, recorded_at')
      .order('recorded_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('amount, type, category, recorded_at, description')
      .order('recorded_at', { ascending: false })
      .limit(50),
  ])

  const milkRecords = milkRes.data ?? []
  const transactions = expenseRes.data ?? []

  // Monthly P&L
  const monthly: Record<string, { revenue: number; expenses: number }> = {}

  for (const r of milkRecords) {
    const key = new Date(r.recorded_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })
    if (!monthly[key]) monthly[key] = { revenue: 0, expenses: 0 }
    const rev = (r.quantity_litres ?? 0) * (r.price_per_litre ?? 0)
    monthly[key].revenue += rev
  }

  for (const t of transactions) {
    const key = new Date(t.recorded_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })
    if (!monthly[key]) monthly[key] = { revenue: 0, expenses: 0 }
    if (t.type === 'expense') monthly[key].expenses += t.amount ?? 0
    else monthly[key].revenue += t.amount ?? 0
  }

  const months = Object.entries(monthly).slice(-6)
  const totalRev = months.reduce((s, [, m]) => s + m.revenue, 0)
  const totalExp = months.reduce((s, [, m]) => s + m.expenses, 0)
  const profit = totalRev - totalExp

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-moka-900">Financial Reports</h1>
        <p className="text-moka-700 text-sm mt-1">Last 6 months summary</p>
      </div>

      {/* P&L summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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
      </div>

      {/* Monthly P&L table */}
      {months.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-moka-900">Monthly breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">Month</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-moka-700 uppercase tracking-wide">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-moka-700 uppercase tracking-wide">Expenses</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-moka-700 uppercase tracking-wide">Profit</th>
              </tr>
            </thead>
            <tbody>
              {months.reverse().map(([month, { revenue, expenses }]) => {
                const p = revenue - expenses
                return (
                  <tr key={month} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3.5 font-medium text-moka-900">{month}</td>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No financial data yet</h3>
          <p className="text-moka-700 text-sm">Start recording income and expenses in the Moka mobile app.</p>
        </div>
      )}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-moka-900">Recent transactions</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">Category</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-moka-700 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50">
                  <td className="px-6 py-3 text-moka-500 text-xs">
                    {new Date(t.recorded_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-3 text-moka-900">{t.description ?? '—'}</td>
                  <td className="px-6 py-3 text-moka-700 capitalize">{t.category ?? '—'}</td>
                  <td className={`px-6 py-3 text-right font-bold ${t.type === 'expense' ? 'text-red-600' : 'text-moka-800'}`}>
                    {t.type === 'expense' ? '−' : '+'}KES {(t.amount ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
