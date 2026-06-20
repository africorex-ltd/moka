import { createClient } from '@/lib/supabase/server'
import AddCowModal from './AddCowModal'
import Link from 'next/link'

export default async function HerdPage() {
  const supabase = await createClient()

  const { data: cows } = await supabase
    .from('cows')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  const allCows = cows ?? []
  const active = allCows.filter((c) => c.status === 'active').length
  const dry = allCows.filter((c) => c.status === 'dry').length
  const pregnant = allCows.filter((c) => c.status === 'pregnant').length
  const sold = allCows.filter((c) => c.status === 'sold').length

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Herd Management</h1>
          <p className="text-moka-700 text-sm mt-1">{allCows.length} animals registered</p>
        </div>
        <AddCowModal />
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Chip label="Active" count={active} color="bg-moka-100 text-moka-800" />
        <Chip label="Dry" count={dry} color="bg-amber-50 text-amber-700" />
        <Chip label="Pregnant" count={pregnant} color="bg-purple-50 text-purple-700" />
        <Chip label="Sold" count={sold} color="bg-gray-100 text-gray-600" />
      </div>

      {allCows.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Tag / Name</Th>
                <Th>Breed</Th>
                <Th>Status</Th>
                <Th>Date Acquired</Th>
                <Th>Weight (kg)</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {allCows.map((cow) => (
                <tr key={cow.local_id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-moka-900">
                    {cow.tag_number ? `${cow.tag_number} — ` : ''}{cow.name ?? cow.local_id.slice(0, 8)}
                  </td>
                  <td className="px-5 py-3.5 text-moka-700">{cow.breed ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={cow.status} />
                  </td>
                  <td className="px-5 py-3.5 text-moka-500 text-xs">
                    {cow.date_acquired
                      ? new Date(cow.date_acquired + 'T00:00:00').toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-moka-700">{cow.live_weight_kg ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/herd/${cow.local_id}`} className="text-xs text-moka-600 hover:text-moka-900 font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">🐄</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No cows yet</h3>
          <p className="text-moka-700 text-sm mb-4">Add your first cow using the button above.</p>
          <AddCowModal />
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
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
    pregnant: 'bg-purple-50 text-purple-700',
    sold: 'bg-gray-100 text-gray-600',
  }
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status ?? 'unknown'}
    </span>
  )
}
