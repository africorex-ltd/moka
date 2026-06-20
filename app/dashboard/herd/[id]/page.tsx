import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function CowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [cowRes, milkRes, healthRes] = await Promise.all([
    supabase.from('cows').select('*').eq('local_id', id).single(),
    supabase.from('milk_log').select('date, session, quantity_litres').eq('cow_local_id', id).is('deleted_at', null).order('date', { ascending: false }).limit(30),
    supabase.from('health_log').select('date, event_type, description, cost').eq('cow_local_id', id).is('deleted_at', null).order('date', { ascending: false }).limit(10),
  ])

  if (!cowRes.data || cowRes.error) notFound()

  const cow = cowRes.data
  const milk = milkRes.data ?? []
  const health = healthRes.data ?? []

  const totalMilk = milk.reduce((s, r) => s + (r.quantity_litres ?? 0), 0)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/herd" className="text-sm text-moka-600 hover:text-moka-900">← Back to Herd</Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-moka-900">
              {cow.name ?? cow.tag_number ?? cow.local_id.slice(0, 8)}
            </h1>
            {cow.tag_number && cow.name && (
              <p className="text-moka-600 text-sm mt-0.5">Tag: {cow.tag_number}</p>
            )}
          </div>
          <StatusBadge status={cow.status} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          <Detail label="Breed" value={cow.breed} />
          <Detail label="Date of Birth" value={cow.date_of_birth ? new Date(cow.date_of_birth + 'T00:00:00').toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
          <Detail label="Date Acquired" value={cow.date_acquired ? new Date(cow.date_acquired + 'T00:00:00').toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
          <Detail label="Acquisition Cost" value={cow.acquisition_cost ? `KES ${cow.acquisition_cost.toLocaleString()}` : null} />
          <Detail label="Live Weight" value={cow.live_weight_kg ? `${cow.live_weight_kg} kg` : null} />
          <Detail label="Body Condition Score" value={cow.body_condition_score?.toString()} />
          <Detail label="Sire Code" value={cow.sire_code} />
          <Detail label="Dam Name" value={cow.dam_name} />
        </div>

        {cow.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-moka-600 uppercase tracking-wide mb-1">Notes</div>
            <p className="text-sm text-moka-800">{cow.notes}</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-moka-900">Milk Production</h2>
            <span className="text-xs text-moka-500">Total: {totalMilk.toFixed(0)} L</span>
          </div>
          {milk.length > 0 ? (
            <div className="space-y-2">
              {milk.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-xs font-medium text-moka-900">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="ml-2 text-xs text-moka-500 capitalize">{r.session}</span>
                  </div>
                  <span className="text-sm font-bold text-moka-900">{r.quantity_litres} L</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-moka-400">No milk records yet.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-moka-900 mb-4">Health History</h2>
          {health.length > 0 ? (
            <div className="space-y-2">
              {health.map((h, i) => (
                <div key={i} className="py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-moka-900">
                      {new Date(h.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">{h.event_type}</span>
                  </div>
                  {h.description && <p className="text-xs text-moka-500 mt-0.5">{h.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-moka-400">No health events recorded.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold text-moka-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-medium text-moka-900">{value ?? '—'}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    active: 'bg-moka-100 text-moka-800',
    dry: 'bg-amber-50 text-amber-700',
    pregnant: 'bg-purple-50 text-purple-700',
    sold: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${map[status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
      {status ?? 'unknown'}
    </span>
  )
}
