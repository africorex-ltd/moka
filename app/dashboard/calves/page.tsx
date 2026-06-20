import { createClient } from '@/lib/supabase/server'
import AddCalfModal from './AddCalfModal'

export default async function CalvesPage() {
  const supabase = await createClient()

  const [calvesRes, cowsRes] = await Promise.all([
    supabase
      .from('calf_records')
      .select('*')
      .is('deleted_at', null)
      .order('date_of_birth', { ascending: false }),
    supabase
      .from('cows')
      .select('local_id, name, tag_number')
      .is('deleted_at', null)
      .order('name'),
  ])

  const calves = calvesRes.data ?? []
  const cows = cowsRes.data ?? []

  const cowMap: Record<string, { name?: string; tag_number?: string }> = {}
  for (const c of cows) cowMap[c.local_id] = c

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Calves</h1>
          <p className="text-moka-700 text-sm mt-1">{calves.length} calves registered</p>
        </div>
        <AddCalfModal cows={cows} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Calves</div>
          <div className="text-2xl font-black text-moka-900">{calves.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Heifers</div>
          <div className="text-2xl font-black text-moka-900">{calves.filter(c => c.gender === 'female').length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Bulls</div>
          <div className="text-2xl font-black text-moka-900">{calves.filter(c => c.gender === 'male').length}</div>
        </div>
      </div>

      {calves.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Name</Th>
                <Th>Gender</Th>
                <Th>Born</Th>
                <Th>Dam</Th>
                <Th align="right">Birth Weight</Th>
                <Th align="right">Current Weight</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {calves.map((calf) => {
                const dam = cowMap[calf.dam_cow_local_id]
                return (
                  <tr key={calf.local_id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50">
                    <td className="px-5 py-3 font-medium text-moka-900">{calf.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${calf.gender === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                        {calf.gender === 'female' ? 'Heifer' : calf.gender === 'male' ? 'Bull' : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-moka-700 text-xs">
                      {calf.date_of_birth ? new Date(calf.date_of_birth + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-moka-700">
                      {dam?.tag_number ?? dam?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-moka-700">
                      {calf.birth_body_weight_kg ? `${calf.birth_body_weight_kg} kg` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-moka-700">
                      {calf.current_weight_kg ? `${calf.current_weight_kg} kg` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-moka-100 text-moka-800 capitalize">
                        {calf.status ?? 'active'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">🐮</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No calves yet</h3>
          <p className="text-moka-700 text-sm">Register calves born on your farm.</p>
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
