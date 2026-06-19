import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { generateId } from './database'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

export interface ScannedRecord {
  type: 'milk' | 'breeding' | 'health' | 'feeding' | 'calf' | 'unknown'
  rows: Record<string, string>[]
  rawText: string
  confidence: 'high' | 'medium' | 'low'
  notes: string
}

export async function pickAndScanRecord(apiKey: string): Promise<ScannedRecord | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') return null

  const picked = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    base64: true,
  })

  if (picked.canceled || !picked.assets?.[0]?.base64) return null

  const base64 = picked.assets[0].base64
  return extractRecordsFromImage(base64, apiKey)
}

export async function scanImageUri(uri: string, apiKey: string): Promise<ScannedRecord | null> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
  return extractRecordsFromImage(base64, apiKey)
}

async function extractRecordsFromImage(base64: string, apiKey: string): Promise<ScannedRecord> {
  const prompt = `You are a data extraction assistant for a Kenyan dairy farm management app called Moka.
Analyse this farm record image and extract structured data.

The farm records could be:
1. Milk production records (cow name, date, morning/midday/evening/total litres)
2. Breeding records (cow name, date, event type like AI/heat/calved, sire code, pregnancy check result)
3. Health records (cow name, date, condition, treatment, cost)
4. Feeding records (cow name, date, feed type, quantity kg)
5. Calf records (calf name/number, gender, dam name, date of birth, weight)

Respond ONLY with a JSON object in this exact format:
{
  "type": "milk|breeding|health|feeding|calf|unknown",
  "confidence": "high|medium|low",
  "notes": "any important notes or warnings about the data quality",
  "rows": [
    { "key": "value", ... }
  ]
}

For milk records, each row should have: cow_name, date (YYYY-MM-DD), morning_litres, midday_litres, evening_litres, total_litres
For breeding records: cow_name, date (YYYY-MM-DD), event_type, sire_code, notes
For health records: cow_name, date (YYYY-MM-DD), event_type, description, treatment, cost_kes
For feeding records: cow_name, date (YYYY-MM-DD), feed_type, quantity_kg
For calf records: name, gender (male/female), dam_name, date_of_birth (YYYY-MM-DD), birth_weight_kg

If dates are in DD/MM/YYYY format, convert to YYYY-MM-DD.
If you cannot read the image clearly, set confidence to "low" and explain in notes.
Only return valid JSON, no other text.`

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} ${err}`)
  }

  const json = await response.json()
  const text = json.content?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(text)
    return {
      type: parsed.type ?? 'unknown',
      rows: parsed.rows ?? [],
      rawText: text,
      confidence: parsed.confidence ?? 'low',
      notes: parsed.notes ?? '',
    }
  } catch {
    return {
      type: 'unknown',
      rows: [],
      rawText: text,
      confidence: 'low',
      notes: 'Could not parse response from AI. Please try again.',
    }
  }
}

export async function applyScannedMilkRecords(
  records: ScannedRecord,
  db: import('expo-sqlite').SQLiteDatabase,
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (const row of records.rows) {
    const cowName = row.cow_name?.trim()
    const date = row.date
    if (!cowName || !date) continue

    const cow = await db.getFirstAsync<{ local_id: string }>(
      `SELECT local_id FROM cows WHERE LOWER(name) = LOWER(?) AND deleted = 0 LIMIT 1`,
      [cowName]
    )
    if (!cow) {
      errors.push(`Cow "${cowName}" not found`)
      continue
    }

    const total = parseFloat(row.total_litres) || (
      (parseFloat(row.morning_litres) || 0) +
      (parseFloat(row.midday_litres) || 0) +
      (parseFloat(row.evening_litres) || 0)
    )

    if (total > 0) {
      await db.runAsync(
        `INSERT OR IGNORE INTO milk_log (local_id, cow_local_id, date, session, quantity_litres, dirty)
         VALUES (?, ?, ?, 'total', ?, 1)`,
        [generateId(), cow.local_id, date, total]
      )
      imported++
    }
  }

  return { imported, errors }
}
