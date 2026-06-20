import { createClient } from '@/lib/supabase/server'

export default async function HerdPage() {
  const supabase = await createClient()

  const { data: cattle, count } = await supabase
    .from('cattle')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  const active = cattle?.filter((c) => c.status === 'active').length ?? 0
  const dry = cattle?.filter((c) => c.status === 'dry').length ?? 0
  const sick = cattle?.filter((c) => c.status === 'sick').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Herd Management</h1>
          <p className="text-moka-700 text-sm mt-1">{count ?? 0} animals registered</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Chip label="Active" count={active} color="bg-moka-100 text-moka-800" />
        <Chip label="Dry" count={dry} color="bg-amber-50 text-amber-700" />
        <Chip label="Sick" count={sick} color="bg-red-50 text-red-700" />
      </div>

      {/* Table */}
      {cattle && cattle.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Tag / Name</Th>
                <Th>Breed</Th>
                <Th>Status</Th>
                <Th>Date Added</Th>
              </tr>
            </thead>
            <tbody>
              {cattle.map((cow) => (
                <tr key={cow.id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-moka-900">
                    {cow.tag_number || cow.name || cow.id.slice(0, 8)}
                  </td>
                  <td className="px-5 py-3.5 text-moka-700">{cow.breed ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={cow.status} />
                  </td>
                  <td className="px-5 py-3.5 text-moka-500 text-xs">
                    {new Date(cow.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">🐄</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No cattle yet</h3>
          <p className="text-moka-700 text-sm">Add your first animal from the Moka mobile app.</p>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-left text-xs font-semibold text-moka-700 uppercase tracking-wide">{children}</th>
}

function Chip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
      {label}: {count}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    active: 'bg-moka-100 text-moka-800',
    dry: 'bg-amber-50 text-amber-700',
    sick: 'bg-red-50 text-red-700',
    sold: 'bg-gray-100 text-gray-600',
  }
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status ?? 'unknown'}
    </span>
  )
}
