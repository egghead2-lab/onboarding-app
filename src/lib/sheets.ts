const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY!

export type AreaRow = {
  area: string
  trainer: string
  fieldManager: string
  scheduler: string
}

// Columns: E=4, F=5, H=7, U=20 (0-indexed)
const COL = { area: 4, scheduler: 5, fieldManager: 7, trainer: 20 }

export async function getSheetRows(): Promise<AreaRow[]> {
  const range = 'A:U'
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`

  const res = await fetch(url, { next: { revalidate: 300 } }) // cache 5 mins
  if (!res.ok) return []

  const data = await res.json()
  const rows: string[][] = data.values ?? []

  // Skip header row, filter rows that have an area value
  return rows.slice(1)
    .filter((row) => row[COL.area]?.trim())
    .map((row) => ({
      area: row[COL.area]?.trim() ?? '',
      trainer: row[COL.trainer]?.trim() ?? '',
      fieldManager: row[COL.fieldManager]?.trim() ?? '',
      scheduler: row[COL.scheduler]?.trim() ?? '',
    }))
    .filter((row, index, self) =>
      // Deduplicate by area
      index === self.findIndex((r) => r.area === row.area)
    )
}

export async function getAreas(): Promise<string[]> {
  const rows = await getSheetRows()
  return [...new Set(rows.map((r) => r.area))].filter(Boolean).sort()
}

export async function getTrainers(): Promise<string[]> {
  const rows = await getSheetRows()
  return [...new Set(rows.map((r) => r.trainer))].filter(Boolean).sort()
}

export async function getFieldManagers(): Promise<string[]> {
  const rows = await getSheetRows()
  return [...new Set(rows.map((r) => r.fieldManager))].filter(Boolean).sort()
}

export async function getSchedulers(): Promise<string[]> {
  const rows = await getSheetRows()
  return [...new Set(rows.map((r) => r.scheduler))].filter(Boolean).sort()
}

export async function lookupArea(area: string): Promise<Omit<AreaRow, 'area'> | null> {
  const rows = await getSheetRows()
  const match = rows.find((r) => r.area === area)
  if (!match) return null
  return {
    trainer: match.trainer,
    fieldManager: match.fieldManager,
    scheduler: match.scheduler,
  }
}
