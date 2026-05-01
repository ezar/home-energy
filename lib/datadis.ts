// Cliente Datadis API — solo para uso server-side
// Auth URL correcta: https://datadis.es/nikola-auth/tokens/login
// Documentación completa en docs/datadis-api.md

import type {
  DatadisSuppliesResponse,
  DatadisConsumptionResponse,
  DatadisMaxPowerResponse,
  DatadisContractResponse,
  DatadisDistributorsResponse,
} from '@/lib/types/datadis'

const BASE_URL = 'https://datadis.es/api-private/api'
const AUTH_URL = 'https://datadis.es/nikola-auth/tokens/login'

export async function getToken(username: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username, password })

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`Datadis auth failed: ${res.status} ${res.statusText}`)
  }

  const token = await res.text()
  if (!token || token.length < 10) {
    throw new Error('Datadis returned an empty or invalid token')
  }

  return token.trim()
}

async function datadisGet<T>(token: string, path: string, params: Record<string, string>, attempt = 1): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (res.status === 401) throw new Error('Datadis token expirado o inválido')

  if (res.status === 429) {
    // El límite es por combinación CUPS+mes/24h. No reintentamos.
    // Leer el body para mostrar el mensaje real ("Consulta ya realizada en las últimas 24 horas").
    const body = await res.text().catch(() => '')
    throw new Error(`DATADIS_429:${body.trim()}`)
  }

  if (!res.ok) throw new Error(`Datadis error ${res.status} en ${path}`)

  return res.json() as Promise<T>
}

export async function getSupplies(
  token: string,
  authorizedNif?: string
): Promise<DatadisSuppliesResponse> {
  const params: Record<string, string> = {}
  if (authorizedNif) params.authorizedNif = authorizedNif

  return datadisGet<DatadisSuppliesResponse>(token, '/get-supplies-v2', params)
}

export interface GetConsumptionParams {
  cups: string
  distributorCode: string
  startDate: string   // YYYY/MM
  endDate: string     // YYYY/MM
  measurementType?: '0' | '1'  // 0=horario, 1=cuarto de hora
  pointType: string
  authorizedNif?: string
}

export async function getConsumption(
  token: string,
  params: GetConsumptionParams
): Promise<DatadisConsumptionResponse> {
  // Sin delay: el límite real de Datadis es por combinación CUPS+mes/24h,
  // no por segundo. El delay solo causaba timeouts en cargas históricas largas.

  const queryParams: Record<string, string> = {
    cups: params.cups,
    distributorCode: params.distributorCode,
    startDate: params.startDate,
    endDate: params.endDate,
    measurementType: params.measurementType ?? '0',
    pointType: params.pointType,
  }
  if (params.authorizedNif) queryParams.authorizedNif = params.authorizedNif

  return datadisGet<DatadisConsumptionResponse>(token, '/get-consumption-data-v2', queryParams)
}

export interface GetMaxPowerParams {
  cups: string
  distributorCode: string
  startDate: string   // YYYY/MM
  endDate: string     // YYYY/MM
  authorizedNif?: string
}

export async function getMaxPower(
  token: string,
  params: GetMaxPowerParams
): Promise<DatadisMaxPowerResponse> {

  const queryParams: Record<string, string> = {
    cups: params.cups,
    distributorCode: params.distributorCode,
    startDate: params.startDate,
    endDate: params.endDate,
  }
  if (params.authorizedNif) queryParams.authorizedNif = params.authorizedNif

  return datadisGet<DatadisMaxPowerResponse>(token, '/get-max-power-v2', queryParams)
}

export async function getContractDetail(
  token: string,
  cups: string,
  distributorCode: string,
  authorizedNif?: string
): Promise<DatadisContractResponse> {

  const params: Record<string, string> = { cups, distributorCode }
  if (authorizedNif) params.authorizedNif = authorizedNif

  return datadisGet<DatadisContractResponse>(token, '/get-contract-detail-v2', params)
}

export async function getDistributors(
  token: string,
  authorizedNif?: string
): Promise<DatadisDistributorsResponse> {
  const params: Record<string, string> = {}
  if (authorizedNif) params.authorizedNif = authorizedNif

  return datadisGet<DatadisDistributorsResponse>(token, '/get-distributors-with-supplies-v2', params)
}

// Convierte "2022/07/01" + "01:00" → Date (inicio del intervalo = "2022-07-01T00:00")
// Datadis usa el FINAL del intervalo como timestamp, restamos 1 hora
export function datadisDatetimeToDate(date: string, time: string): Date {
  // date: "2022/07/01", time: "01:00"
  const [year, month, day] = date.split('/')
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  // El timestamp de Datadis es el FIN del intervalo → restamos 1h para obtener el inicio
  const d = new Date(
    Date.UTC(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hour - 1,
      minute
    )
  )
  return d
}
