import * as Sharing from 'expo-sharing'
import { Alert } from 'react-native'
import dayjs from 'dayjs'

// react-native-html-to-pdf uses TurboModuleRegistry.getEnforcing at init time,
// which throws in Expo Go. Lazy-require it at call time so we can catch the error.
function getPDFGenerator(): ((opts: {
  html: string; fileName: string; directory: string; base64: boolean
}) => Promise<{ filePath: string | null }>) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-html-to-pdf').generatePDF
  } catch {
    return null
  }
}

interface MilkRow {
  name: string
  days: Record<string, number>
}

export async function exportMilkBoardPDF(
  month: string,
  cows: { local_id: string; name: string }[],
  data: Record<string, Record<string, number>>,
): Promise<void> {
  const daysInMonth = dayjs(month).daysInMonth()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const cowHeaders = cows.map((c) => `<th>${c.name}</th>`).join('')
  const rows = days
    .map((d) => {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      const cells = cows
        .map((c) => {
          const v = data[dateStr]?.[c.local_id]
          return `<td>${v ? v.toFixed(1) : '-'}</td>`
        })
        .join('')
      const dayTotal = cows.reduce((s, c) => s + (data[dateStr]?.[c.local_id] ?? 0), 0)
      return `<tr><td class="day">${d}</td>${cells}<td class="total">${dayTotal > 0 ? dayTotal.toFixed(1) : '-'}</td></tr>`
    })
    .join('')

  const cowTotals = cows
    .map((c) => {
      const total = days.reduce((s, d) => {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`
        return s + (data[dateStr]?.[c.local_id] ?? 0)
      }, 0)
      return `<td class="total">${total.toFixed(0)}</td>`
    })
    .join('')

  const grandTotal = days.reduce((s, d) => {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    return s + cows.reduce((cs, c) => cs + (data[dateStr]?.[c.local_id] ?? 0), 0)
  }, 0)

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 9px; margin: 10mm; }
  h2 { color: #2D5016; font-size: 14px; margin-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: center; }
  th { background: #2D5016; color: white; font-size: 8px; }
  .day { font-weight: bold; background: #f5f5f5; color: #2D5016; }
  .total { font-weight: bold; background: #EAF2E3; }
  .grand-total { font-weight: bold; background: #2D5016; color: white; }
  tr:nth-child(even) { background: #f9f9f9; }
</style>
</head>
<body>
<h2>Moka Dairy - Milk Production Board</h2>
<p style="color:#666; margin-bottom:8px;">${dayjs(month).format('MMMM YYYY')} &nbsp;|&nbsp; Generated: ${dayjs().format('D MMM YYYY')}</p>
<table>
  <tr>
    <th>Day</th>${cowHeaders}<th>Total</th>
  </tr>
  ${rows}
  <tr>
    <td class="grand-total">TOT</td>${cowTotals}<td class="grand-total">${grandTotal.toFixed(0)}</td>
  </tr>
</table>
<p style="margin-top:12px; color:#666; font-size:8px;">
  Grand total: ${grandTotal.toFixed(1)} L &nbsp;|&nbsp;
  Average/day: ${(grandTotal / daysInMonth).toFixed(1)} L &nbsp;|&nbsp;
  Average/cow: ${cows.length > 0 ? (grandTotal / cows.length / daysInMonth).toFixed(1) : '0'} L
</p>
</body>
</html>`

  const generatePDF = getPDFGenerator()
  if (!generatePDF) {
    Alert.alert('PDF export not available', 'PDF export requires a native build. Use Excel export instead.')
    return
  }
  const result = await generatePDF({
    html,
    fileName: `milk-board-${month}`,
    directory: 'Documents',
    base64: false,
  })

  if (result.filePath && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(result.filePath, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
  }
}

export async function exportFarmPLPDF(params: {
  month: string
  revenue: number
  costs: { feed: number; health: number; farm: number }
  litres: number
  topCows: { name: string; litres: number }[]
}): Promise<void> {
  const { month, revenue, costs, litres, topCows } = params
  const totalCosts = costs.feed + costs.health + costs.farm
  const profit = revenue - totalCosts
  const costPerLitre = litres > 0 ? totalCosts / litres : 0
  const revenuePerLitre = litres > 0 ? revenue / litres : 0

  const cowRows = topCows
    .map((c) => `<tr><td>${c.name}</td><td>${c.litres.toFixed(1)} L</td></tr>`)
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 15mm; color: #333; }
  h2 { color: #2D5016; }
  .section { margin-top: 16px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
  .label { color: #666; }
  .value { font-weight: bold; }
  .profit { color: ${profit >= 0 ? '#27AE60' : '#C0392B'}; font-size: 16px; font-weight: bold; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  th { background: #EAF2E3; color: #2D5016; }
</style>
</head>
<body>
<h2>Moka Farm P&amp;L Report - ${dayjs(month).format('MMMM YYYY')}</h2>
<p style="color:#888">Generated: ${dayjs().format('D MMM YYYY, h:mm A')}</p>

<div class="section">
  <div class="row"><span class="label">Milk revenue</span><span class="value">KES ${revenue.toLocaleString()}</span></div>
  <div class="row"><span class="label">Feed costs</span><span class="value">KES ${costs.feed.toLocaleString()}</span></div>
  <div class="row"><span class="label">Health &amp; veterinary</span><span class="value">KES ${costs.health.toLocaleString()}</span></div>
  <div class="row"><span class="label">Farm operating costs</span><span class="value">KES ${costs.farm.toLocaleString()}</span></div>
  <div class="row"><span class="label">Total costs</span><span class="value">KES ${totalCosts.toLocaleString()}</span></div>
  <div class="row" style="margin-top:8px; border-bottom: 2px solid #2D5016;">
    <span style="font-weight:bold">Net profit</span>
    <span class="profit">${profit >= 0 ? '+' : ''}KES ${profit.toLocaleString()}</span>
  </div>
</div>

<div class="section">
  <div class="row"><span class="label">Total litres produced</span><span class="value">${litres.toFixed(1)} L</span></div>
  <div class="row"><span class="label">Revenue per litre</span><span class="value">KES ${revenuePerLitre.toFixed(2)}</span></div>
  <div class="row"><span class="label">Cost per litre</span><span class="value">KES ${costPerLitre.toFixed(2)}</span></div>
</div>

${topCows.length > 0 ? `
<div class="section">
  <h3 style="color:#2D5016">Cow Production</h3>
  <table>
    <tr><th>Cow</th><th>Litres this month</th></tr>
    ${cowRows}
  </table>
</div>` : ''}
</body>
</html>`

  const generatePDF = getPDFGenerator()
  if (!generatePDF) {
    Alert.alert('PDF export not available', 'PDF export requires a native build. Use Excel export instead.')
    return
  }
  const result = await generatePDF({
    html,
    fileName: `farm-pl-${month}`,
    directory: 'Documents',
    base64: false,
  })

  if (result.filePath && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(result.filePath, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
  }
}
