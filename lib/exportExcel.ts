import * as XLSX from 'xlsx'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import dayjs from 'dayjs'

async function shareWorkbook(wb: XLSX.WorkBook, fileName: string): Promise<void> {
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
  const uri = `${FileSystem.cacheDirectory}${fileName}.xlsx`
  await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 })
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      UTI: 'com.microsoft.excel.xlsx',
    })
  }
}

export async function exportMilkBoardExcel(
  month: string,
  cows: { local_id: string; name: string }[],
  data: Record<string, Record<string, number>>,
): Promise<void> {
  const daysInMonth = dayjs(month).daysInMonth()

  const headers = ['Day', ...cows.map((c) => c.name), 'Daily Total']
  const rows: (string | number)[][] = [headers]

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    const dayData = cows.map((c) => data[dateStr]?.[c.local_id] ?? 0)
    const total = dayData.reduce((s, v) => s + v, 0)
    rows.push([d, ...dayData, total])
  }

  // Totals row
  const cowTotals = cows.map((c) =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${month}-${String(i + 1).padStart(2, '0')}`
      return data[dateStr]?.[c.local_id] ?? 0
    }).reduce((s, v) => s + v, 0)
  )
  rows.push(['TOTAL', ...cowTotals, cowTotals.reduce((s, v) => s + v, 0)])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, dayjs(month).format('MMM YYYY'))
  await shareWorkbook(wb, `milk-board-${month}`)
}

export async function exportHerdDataExcel(
  cows: {
    name: string; breed: string; status: string; date_of_birth: string | null
    ear_tag: string | null; sire_code: string | null; live_weight_kg: number | null
    body_condition_score: number | null
  }[]
): Promise<void> {
  const headers = ['Name', 'Ear Tag', 'Breed', 'Status', 'Date of Birth', 'Age (months)', 'Sire Code', 'Live Weight (kg)', 'BCS']
  const rows: (string | number | null)[][] = [headers]

  for (const c of cows) {
    const ageMonths = c.date_of_birth ? dayjs().diff(dayjs(c.date_of_birth), 'month') : null
    rows.push([
      c.name, c.ear_tag ?? '', c.breed, c.status,
      c.date_of_birth ?? '', ageMonths, c.sire_code ?? '',
      c.live_weight_kg ?? '', c.body_condition_score ?? '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Herd')
  await shareWorkbook(wb, `herd-data-${dayjs().format('YYYY-MM-DD')}`)
}

export async function exportBreedingLogExcel(
  entries: {
    cow_name: string; date: string; event_type: string
    sire_code: string | null; expected_calving_date: string | null
    pd_result: string | null; actual_calving_date: string | null; notes: string | null
  }[]
): Promise<void> {
  const headers = ['Cow', 'Date', 'Event', 'Sire Code', 'Expected Calving', 'PD Result', 'Actual Calving', 'Notes']
  const rows: (string | null)[][] = [headers]

  for (const e of entries) {
    rows.push([
      e.cow_name, e.date, e.event_type, e.sire_code ?? '',
      e.expected_calving_date ?? '', e.pd_result ?? '',
      e.actual_calving_date ?? '', e.notes ?? '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Breeding Log')
  await shareWorkbook(wb, `breeding-log-${dayjs().format('YYYY-MM-DD')}`)
}
