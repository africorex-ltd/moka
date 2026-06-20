import { createClient } from '@/lib/supabase/server'
import AddSaleModal from './AddSaleModal'

export default async function SalesPage() {
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from('milk_sales')
    .select('*')
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(200)

  const allSales = sales ?? []
  const totalRevenue = allSales.reduce((s, r) => s + (r.quantity_litres ?? 0) * (r.price_per_litre ?? 0), 0)
  const totalLitres = allSales.reduce((s, r) => s + (r.quantity_litres ?? 0), 0)
  const avgPrice = totalLitres > 0 ? totalRevenue / totalLitres : 0

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-moka-900">Milk Sales</h1>
          <p className="text-moka-700 text-sm mt-1">{allSales.length} transactions</p>
        </div>
        <AddSaleModal />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Revenue</div>
          <div className="text-2xl font-black text-moka-900">KES {totalRevenue.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Total Sold</div>
          <div className="text-2xl font-black text-moka-900">{totalLitres.toFixed(0)} L</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-moka-700 uppercase tracking-wide mb-2">Avg Price / L</div>
          <div className="text-2xl font-black text-moka-900">KES {avgPrice.toFixed(1)}</div>
        </div>
      </div>

      {allSales.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-moka-50">
                <Th>Date</Th>
                <Th>Buyer</Th>
                <Th align="right">Litres</Th>
                <Th align="right">Price/L</Th>
                <Th align="right">Total</Th>
                <Th>Payment</Th>
                <Th>M-Pesa Ref</Th>
              </tr>
            </thead>
            <tbody>
              {allSales.map((s) => (
                <tr key={s.local_id} className="border-b border-gray-50 last:border-0 hover:bg-moka-50/50">
                  <td className="px-5 py-3 text-moka-700 text-xs">
                    {new Date(s.date + 'T00:00:00').toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-moka-900">{s.buyer_name ?? '—'}</td>
                  <td className="px-5 py-3 text-right text-moka-700">{s.quantity_litres} L</td>
                  <td className="px-5 py-3 text-right text-moka-700">KES {s.price_per_litre}</td>
                  <td className="px-5 py-3 text-right font-bold text-moka-900">
                    KES {((s.quantity_litres ?? 0) * (s.price_per_litre ?? 0)).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-5 py-3">
                    <PaymentBadge method={s.payment_method} />
                  </td>
                  <td className="px-5 py-3 text-moka-500 text-xs">{s.mpesa_reference ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">💰</div>
          <h3 className="text-lg font-bold text-moka-900 mb-2">No sales recorded yet</h3>
          <p className="text-moka-700 text-sm">Record your first sale using the button above.</p>
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

function PaymentBadge({ method }: { method: string | null }) {
  const map: Record<string, string> = {
    mpesa: 'bg-green-50 text-green-700',
    cash: 'bg-amber-50 text-amber-700',
    bank: 'bg-blue-50 text-blue-700',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[method ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
      {method ?? '—'}
    </span>
  )
}
