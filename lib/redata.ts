// Cliente REData API (PVPC) — sin autenticación, datos públicos de Red Eléctrica
// Documentación: https://apidatos.ree.es

import type { RedataResponse, PvpcPrice } from '@/lib/types/redata'

const BASE_URL = 'https://apidatos.ree.es/es/datos'
const PVPC_ENDPOINT = '/mercados/precios-mercados-tiempo-real'

// ID del indicador PVPC peninsular
const PVPC_INDICATOR_ID = '1001'

function formatDateParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export async function getPvpcPrices(startDate: Date, endDate: Date): Promise<PvpcPrice[]> {
  const url = new URL(`${BASE_URL}${PVPC_ENDPOINT}`)
  url.searchParams.set('start_date', formatDateParam(startDate))
  url.searchParams.set('end_date', formatDateParam(endDate))
  url.searchParams.set('time_trunc', 'hour')
  url.searchParams.set('geo_trunc', 'electric_system')
  url.searchParams.set('geo_limit', 'peninsular')
  url.searchParams.set('geo_ids', '8741')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`REData error ${res.status}: ${res.statusText}`)
  }

  const data = (await res.json()) as RedataResponse

  // Buscar el indicador PVPC en los datos incluidos
  const pvpcData = data.included?.find(
    (item) => item.id === PVPC_INDICATOR_ID || item.type === 'PVPC'
  )

  if (!pvpcData?.attributes?.values) {
    // Intentar con el primero disponible si no encontramos por id exacto
    const firstData = data.included?.[0]
    if (!firstData?.attributes?.values) return []

    return firstData.attributes.values.map((v) => ({
      datetime: v.datetime,
      priceEurKwh: v.value / 1000, // La API devuelve €/MWh → convertir a €/kWh
    }))
  }

  return pvpcData.attributes.values.map((v) => ({
    datetime: v.datetime,
    priceEurKwh: v.value / 1000,
  }))
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
