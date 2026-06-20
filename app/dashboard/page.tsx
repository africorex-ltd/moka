import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch stats in parallel
  const [cattleRes, milkRes, profileRes] = await Promise.all([
    supabase.from('cattle').select('id, status', { count: 'exact' }),
    supabase
      .from('milk_records')
      .select('quantity_litres, recorded_at')
      .gte('recorded_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('recorded_at', { ascending: true }),
    supabase.from('profiles').select('full_name').limit(1).single(),
  ])

  const totalCattle = cattleRes.count ?? 0
  const milkRecords = milkRes.data ?? []
  const todayMilk = milkRecords
    .filter((r) => new Date(r.recorded_at).toDateString() === new Date().toDateString())
    .reduce((s, r) => s + (r.quantity_litres ?? 0), 0)
  const weekMilk = milkRecords.reduce((s, r) => s + (r.quantity_litres ?? 0), 0)

  // Group by day for mini chart
  const byDay: Record<string, number> = {}
  for (const r of milkRecords) {
    const day = new Date(r.recorded_at).toLocaleDateString('en-KE', { weekday: 'short' })
    byDay[day] = (byDay[day] ?? 0) + (r.quantity_litres ?? 0)
  }
  const chartDays = Object.entries(byDay).slice(-7)
  const maxVal = Math.max(...chartDays.map(([, v]) => v), 1)

  const name = profileRes.data?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-moka-900">
          Good {timeOfDay()}, {name} 👋
        </h1>
        <p className="text-moka-700 text-sm mt-1">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Cattle" value={totalCattle.toString()} sub="in your herd" icon="🐄" />
        <StatCard label="Today's Milk" value={`${todayMilk.toFixed(0)} L`} sub="litres collected" icon="🥛" />
        <StatCard label="This Week" value={`${weekMilk.toFixed(0)} L`} sub="last 7 days" icon="📅" />
        <StatCard label="Active Cows" value={(cattleRes.data?.filter((c) => c.status === 'active').length ?? 0).toString()} sub="producing milk" icon="✅" />
      </div>

      {/* Chart + recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Milk chart */}
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
                  <span className="text-[10px] text-moka-500">{day}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No milk records in the last 7 days" />
          )}
        </div>

        {/* Recent milk records */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-moka-900 mb-4">Recent milk records</h2>
          {milkRecords.length > 0 ? (
            <div className="space-y-3">
              {milkRecords.slice(-5).reverse().map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-moka-900">{r.quantity_litres} L</div>
                    <div className="text-xs text-moka-500">
                      {new Date(r.recorded_at).toLocaleDateString('en-KE', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span className="text-xs bg-moka-100 text-moka-800 px-2 py-0.5 rounded-full font-medium">
                    logged
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No milk records yet. Start logging from the mobile app." />
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
    <div className="flex items-center justify-center h-28 text-sm text-moka-400 text-center">
      {message}
    </div>
  )
}
