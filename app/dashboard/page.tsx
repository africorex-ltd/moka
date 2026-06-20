import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [cowsRes, milkRes, salesRes, profileRes] = await Promise.all([
    supabase.from('cows').select('local_id, status').is('deleted_at', null),
    supabase
      .from('milk_log')
      .select('date, quantity_litres')
      .is('deleted_at', null)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true }),
    supabase
      .from('milk_sales')
      .select('date, quantity_litres, price_per_litre')
      .is('deleted_at', null)
      .gte('date', sevenDaysAgo),
    supabase.from('profiles').select('full_name').limit(1).single(),
  ])

  const cows = cowsRes.data ?? []
  const milkRecords = milkRes.data ?? []
  const sales = salesRes.data ?? []

  const totalCows = cows.length
  const activeCows = cows.filter((c) => c.status === 'active').length
  const todayMilk = milkRecords
    .filter((r) => r.date === today)
    .reduce((s, r) => s + (r.quantity_litres ?? 0), 0)
  const weekMilk = milkRecords.reduce((s, r) => s + (r.quantity_litres ?? 0), 0)
  const weekRevenue = sales.reduce((s, r) => s + (r.quantity_litres ?? 0) * (r.price_per_litre ?? 0), 0)

  // Group by date for mini chart
  const byDay: Record<string, number> = {}
  for (const r of milkRecords) {
    byDay[r.date] = (byDay[r.date] ?? 0) + (r.quantity_litres ?? 0)
  }
  const chartDays = Object.entries(byDay).slice(-7)
  const maxVal = Math.max(...chartDays.map(([, v]) => v), 1)

  const name = profileRes.data?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-moka-900">
          Good {timeOfDay()}, {name} 👋
        </h1>
        <p className="text-moka-700 text-sm mt-1">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Cows" value={totalCows.toString()} sub="in your herd" icon="🐄" />
        <StatCard label="Today's Milk" value={`${todayMilk.toFixed(0)} L`} sub="litres collected" icon="🥛" />
        <StatCard label="This Week" value={`${weekMilk.toFixed(0)} L`} sub="last 7 days" icon="📅" />
        <StatCard label="Week Revenue" value={`KES ${weekRevenue.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`} sub="from sales" icon="💰" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active" value={activeCows.toString()} sub="producing milk" icon="✅" />
        <StatCard label="Dry" value={cows.filter(c => c.status === 'dry').length.toString()} sub="cows" icon="⏸️" />
        <StatCard label="Pregnant" value={cows.filter(c => c.status === 'pregnant').length.toString()} sub="cows" icon="🤰" />
        <StatCard label="Sold" value={cows.filter(c => c.status === 'sold').length.toString()} sub="cows" icon="🏷️" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-moka-900 mb-4">Milk production — last 7 days</h2>
          {chartDays.length > 0 ? (
            <div className="flex items-end gap-3 h-36">
              {chartDays.map(([day, val], i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-moka-700">{val.toFixed(0)}</span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${(val / maxVal) * 100}%`,
                      backgroundColor: i === chartDays.length - 1 ? '#2D5016' : '#EAF2E3',
                      minHeight: 4,
                    }}
                  />
                  <span className="text-[10px] text-moka-500">
                    {new Date(day + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No milk records in the last 7 days" />
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-moka-900 mb-4">Recent milk logs</h2>
          {milkRecords.length > 0 ? (
            <div className="space-y-3">
              {milkRecords.slice(-5).reverse().map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-moka-900">{r.quantity_litres} L</div>
                    <div className="text-xs text-moka-500">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span className="text-xs bg-moka-100 text-moka-800 px-2 py-0.5 rounded-full font-medium">logged</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No milk records yet." />
          )}
        </div>
      </div>
    </div>
  )
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-moka-700 uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-black text-moka-900">{value}</div>
      <div className="text-xs text-moka-500 mt-0.5">{sub}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-28 text-sm text-moka-400 text-center">{message}</div>
  )
}
