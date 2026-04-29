// Cliente REData API (PVPC) — sin autenticación, datos públicos de Red Eléctrica
// Documentación: https://apidatos.ree.es

import type { RedataResponse, PvpcPrice } from '@/lib/types/redata'

const BASE_URL = 'https://apidatos.ree.es/es/datos'
const PVPC_ENDPOINT = '/mercados/precios-mercados-tiempo-real'

// Indicador PVPC peninsular — cambiar GEO_ID y GEO_LIMIT para Baleares (8742) o Canarias (8743)
const PVPC_INDICATOR_ID = '1001'
const GEO_LIMIT = 'peninsular'
const GEO_ID = '8741'
const GEO_TRUNC = 'electric_system'

function formatDateParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function fetchPvpcChunk(startDate: Date, endDate: Date): Promise<PvpcPrice[]> {
  const url = new URL(`${BASE_URL}${PVPC_ENDPOINT}`)
  url.searchParams.set('start_date', formatDateParam(startDate))
  url.searchParams.set('end_date', formatDateParam(endDate))
  url.searchParams.set('time_trunc', 'hour')
  url.searchParams.set('geo_trunc', GEO_TRUNC)
  url.searchParams.set('geo_limit', GEO_LIMIT)
  url.searchParams.set('geo_ids', GEO_ID)

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`REData error ${res.status}: ${res.statusText}`)
  }

  const data = (await res.json()) as RedataResponse

  const pvpcData = data.included?.find(
    (item) => item.id === PVPC_INDICATOR_ID || item.type === 'PVPC'
  ) ?? data.included?.[0]

  if (!pvpcData?.attributes?.values) return []

  return pvpcData.attributes.values.map((v) => ({
    datetime: v.datetime,
    priceEurKwh: v.value / 1000, // €/MWh → €/kWh
  }))
}

// REData limita a ~1 mes por petición — dividimos en chunks de 27 días
export async function getPvpcPrices(startDate: Date, endDate: Date): Promise<PvpcPrice[]> {
  const CHUNK_DAYS = 27
  const results: PvpcPrice[] = []
  const chunkMs = CHUNK_DAYS * 24 * 60 * 60 * 1000

  let cursor = new Date(startDate)
  while (cursor < endDate) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + chunkMs, endDate.getTime()))
    const chunk = await fetchPvpcChunk(cursor, chunkEnd)
    results.push(...chunk)
    cursor = new Date(chunkEnd.getTime() + 1)
  }

  return results
}

// Conveniencia: obtener precios del día actual
export async function getTodayPvpc(): Promise<PvpcPrice[]> {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 0, 0, 0)

  return getPvpcPrices(startOfDay, endOfDay)
}

// Conveniencia: obtener precios de los últimos N días
export async function getRecentPvpc(days: number): Promise<PvpcPrice[]> {
  const end = new Date()
  end.setHours(23, 0, 0, 0)
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)

  return getPvpcPrices(start, end)
}
