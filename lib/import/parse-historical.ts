import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

export type TournamentType = 'PGI' | 'PNC' | 'PGS' | 'PCS' | 'PGC' | 'EWC' | 'Other'

export interface HistoricalEntry {
  year: number
  name: string
  shortName: string
  type: TournamentType
  peak_ccv: number
  accv: number
  global_uv: number | null
  china_uv: number | null
}

function categorize(name: string): TournamentType {
  if (name.includes('Global Championship')) return 'PGC'
  if (name.includes('Nations Cup')) return 'PNC'
  if (name.includes('Global Series') || name.includes('Global Circuit')) return 'PGS'
  if (name.includes('Continental Series')) return 'PCS'
  if (name.includes('Global Invitational') || name.includes('Asia Invitational')) return 'PGI'
  if (name.includes('Esports World Cup')) return 'EWC'
  return 'Other'
}

function shortenName(name: string): string {
  return name
    .replace('PUBG Global Championship', 'PGC')
    .replace('PUBG Nations Cup', 'PNC')
    .replace('PUBG Global Invitational.S', 'PGI.S')
    .replace('PUBG Global Invitational', 'PGI')
    .replace('PUBG Asia Invitational', 'PAI')
    .replace('PUBG Global Series Circuit', 'PGS C')
    .replace('PUBG Global Series', 'PGS')
    .replace(/PUBG Continental Series (\d+): North America/, 'PCS $1 NA')
    .replace(/PUBG Continental Series (\d+): Asia Pacific/, 'PCS $1 APAC')
    .replace(/PUBG Continental Series (\d+): Asia(?!c)/, 'PCS $1 AS')
    .replace(/PUBG Continental Series (\d+): Americas/, 'PCS $1 AM')
    .replace(/PUBG Continental Series (\d+): Europe/, 'PCS $1 EU')
    .replace('Esports World Cup', 'EWC')
    .replace('PUBG Players Masters Invitational', 'PPMI')
    .replace(/(\d{4})/, (m) => `'${m.slice(2)}`)
    .trim()
}

// 같은 타입의 전년도 이벤트와 Peak CCV YoY 계산
// 단일 이벤트/연도 타입(PGC, PNC, PGI)만 유효 — PGS/PCS는 연내 복수 이벤트라 null 반환
const SINGLE_EVENT_TYPES: TournamentType[] = ['PGC', 'PNC', 'PGI', 'EWC']

export function calcHistoricalYoY(
  type: TournamentType,
  year: number,
): { peak_ccv: number | null; accv: number | null } {
  if (!SINGLE_EVENT_TYPES.includes(type)) return { peak_ccv: null, accv: null }

  const data = getHistoricalViewership()
  const current  = data.find((d) => d.type === type && d.year === year)
  const previous = data.find((d) => d.type === type && d.year === year - 1)

  if (!current || !previous || previous.peak_ccv === 0) return { peak_ccv: null, accv: null }

  return {
    peak_ccv: ((current.peak_ccv - previous.peak_ccv) / previous.peak_ccv) * 100,
    accv:     previous.accv > 0 ? ((current.accv - previous.accv) / previous.accv) * 100 : null,
  }
}

let _cache: HistoricalEntry[] | null = null

export function getHistoricalViewership(): HistoricalEntry[] {
  if (_cache) return _cache

  const filePath = path.join(process.cwd(), 'PUBG Esports 뷰어십 (2018-2025).xlsx')
  if (!fs.existsSync(filePath)) return []

  const buf = fs.readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets['글로벌 대회']
  if (!ws) return []

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const result: HistoricalEntry[] = []
  for (const row of rows) {
    const name = String(row['대회명'] ?? '').trim()
    const year = Number(row['연도'])
    const pcv = row['PCV (Peak)']
    const accvRaw = row['ACCV (Peak)']

    if (!name || name.includes('──') || typeof pcv !== 'number') continue

    result.push({
      year,
      name,
      shortName: shortenName(name),
      type: categorize(name),
      peak_ccv: pcv as number,
      accv: typeof accvRaw === 'number' ? (accvRaw as number) : 0,
      global_uv: typeof row['글로벌 UV (Peak)'] === 'number' ? (row['글로벌 UV (Peak)'] as number) : null,
      china_uv: typeof row['중국 UV (Peak)'] === 'number' ? (row['중국 UV (Peak)'] as number) : null,
    })
  }

  _cache = result
  return result
}
