// POST /api/datadis/sync
// Emite Server-Sent Events con el progreso paso a paso.
// Siempre server-side — las credenciales nunca llegan al cliente.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getToken, getConsumption, getMaxPower, datadisDatetimeToDate } from '@/lib/datadis'
import { getPvpcPrices } from '@/lib/redata'
import { getPeriod } from '@/lib/tariff'
import { decrypt } from '@/lib/encrypt'
import type { ProfileRow, ConsumptionInsert, PvpcPriceInsert } from '@/lib/supabase/types-helper'
import { format, subMonths, subDays, startOfMonth, addMonths, parseISO, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
}

const TIMEOUT_MS = 55_000

type LogType = 'info' | 'ok' | 'warn' | 'error' | 'done'

function toDatadisMonth(date: Date): string {
  return format(date, 'yyyy/MM')
}

function maxPowerPeriod(p: string): 1 | 2 | 3 {
  if (p === 'PUNTA') return 1
  if (p === 'LLANO') return 2
  return 3
}

function makeStream(run: (send: (type: LogType, msg: string) => void) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (type: LogType, msg: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, msg })}\n\n`))
        } catch { /* stream already closed */ }
      }

      const timeout = new Promise<void>((resolve) =>
        setTimeout(() => {
          send('error', `Timeout: la operación superó ${TIMEOUT_MS / 1000}s`)
          resolve()
        }, TIMEOUT_MS)
      )

      try {
        await Promise.race([run(send), timeout])
      } catch (err) {
        send('error', err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        closed = true
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: SSE_HEADERS })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return makeStream(async (send) => { send('error', 'No autenticado') })
  }

  const serviceClient = await createServiceClient()
  const { data: profileRaw } = await serviceClient
    .from('profiles')
    .select('datadis_username, datadis_password_encrypted, cups, distributor_code, point_type, datadis_authorized_nif, last_sync_at')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Pick<
    ProfileRow,
    'datadis_username' | 'datadis_password_encrypted' | 'cups' | 'distributor_code' | 'point_type' | 'datadis_authorized_nif' | 'last_sync_at'
  > | null

  if (!profile || !profile.datadis_username || !profile.datadis_password_encrypted) {
    return makeStream(async (send) => { send('error', 'Credenciales Datadis no configuradas') })
  }

  const { datadis_username, datadis_password_encrypted, datadis_authorized_nif, last_sync_at } = profile

  const bodyJson = await request.json().catch(() => ({})) as { months?: unknown }
  const historyMonths = typeof bodyJson.months === 'number' && bodyJson.months > 0 ? bodyJson.months : 0

  return makeStream(async (send) => {
    if (!historyMonths && last_sync_at) {
      const hoursSince = (Date.now() - new Date(last_sync_at).getTime()) / 3_600_000
      if (hoursSince < 20) {
        send('warn', `Última sync hace ${hoursSince.toFixed(1)}h — Datadis limita ~1 petición/día por endpoint. Si da 429 es normal.`)
      }
    }

    // ── Suministros activos ───────────────────────────────────────────
    const { data: suppliesRaw } = await (serviceClient as any)
      .from('user_supplies')
      .select('cups, distributor_code, point_type, display_name')
      .eq('user_id', user.id)
      .eq('is_active', true)

    let supplies = (suppliesRaw ?? []) as { cups: string; distributor_code: string; point_type: number; display_name: string | null }[]

    // Backward compat: auto-migrate profile.cups
    if (supplies.length === 0 && profile.cups && profile.distributor_code) {
      await (serviceClient as any).from('user_supplies').upsert(
        { user_id: user.id, cups: profile.cups, distributor_code: profile.distributor_code, point_type: profile.point_type ?? 5 },
        { onConflict: 'user_id,cups' }
      )
      supplies = [{ cups: profile.cups, distributor_code: profile.distributor_code, point_type: profile.point_type ?? 5, display_name: null }]
    }

    if (supplies.length === 0) {
      send('error', 'No hay suministros configurados')
      return
    }

    // ── Token ─────────────────────────────────────────────────────────
    send('info', `Autenticando en Datadis como ${datadis_username}...`)
    const password = decrypt(datadis_password_encrypted!)
    const token = await getToken(datadis_username!, password)
    send('ok', 'Token obtenido')

    // ── Rango de fechas ───────────────────────────────────────────────
    const now = new Date()
    const startDate = historyMonths > 0
      ? startOfMonth(subMonths(now, historyMonths))
      : last_sync_at
        ? subDays(parseISO(last_sync_at), 5)
        : startOfMonth(subMonths(now, 2))

    const months: Date[] = []
    let cursor = startOfMonth(startDate)
    while (isBefore(cursor, now)) {
      months.push(cursor)
      cursor = addMonths(cursor, 1)
    }

    send('info', `Rango: ${format(startDate, 'dd MMM yyyy', { locale: es })} → ${format(now, 'dd MMM yyyy', { locale: es })} (${months.length} mes${months.length !== 1 ? 'es' : ''})`)

    // ── Por suministro ────────────────────────────────────────────────
    let totalSaved = 0

    for (const supply of supplies) {
      send('info', `Suministro: ${supply.display_name ?? supply.cups}`)

      // Consumo horario — guardado mes a mes para no perder progreso si hay timeout
      let datadisRateLimited = false
      for (const monthStart of months) {
        const monthLabel = format(monthStart, 'MMM yyyy', { locale: es })
        send('info', `Consultando consumo ${monthLabel}...`)

        let consumptionData
        try {
          consumptionData = await getConsumption(token, {
            cups: supply.cups,
            distributorCode: supply.distributor_code,
            startDate: toDatadisMonth(monthStart),
            endDate: toDatadisMonth(monthStart),
            measurementType: '0',
            pointType: String(supply.point_type ?? 5),
            authorizedNif: datadis_authorized_nif ?? undefined,
          })
        } catch (err) {
          if (err instanceof Error && err.message === 'DATADIS_429') {
            send('warn', `Datadis: límite diario de peticiones alcanzado en ${monthLabel}. Los meses anteriores están guardados. Espera ~24h para continuar.`)
            datadisRateLimited = true
            break
          }
          send('warn', `${monthLabel}: error — ${err instanceof Error ? err.message : 'error desconocido'}`)
          continue
        }

        const monthRows: ConsumptionInsert[] = (consumptionData.timeCurve ?? []).map(entry => {
          const datetime = datadisDatetimeToDate(entry.date, entry.time)
          return {
            user_id: user.id,
            cups: supply.cups,
            datetime: datetime.toISOString(),
            consumption_kwh: entry.consumptionKWh,
            period: getPeriod(datetime),
            obtained_by_real_or_max: entry.obtainMethod === 'Real',
          }
        })

        if (monthRows.length === 0) {
          send('info', `${monthLabel}: sin datos`)
          continue
        }

        const { error: upsertErr } = await (serviceClient as any)
          .from('consumption')
          .upsert(monthRows, { onConflict: 'user_id,cups,datetime' })

        if (upsertErr) {
          send('warn', `${monthLabel}: error guardando — ${(upsertErr as { message: string }).message}`)
        } else {
          totalSaved += monthRows.length
          send('ok', `${monthLabel}: ${monthRows.length} registros guardados`)
        }
      }

      if (datadisRateLimited) break

      // Maxímetro (potencia máxima mensual)
      try {
        send('info', `Consultando maxímetro para ${supply.display_name ?? supply.cups}...`)
        const maxPowerData = await getMaxPower(token, {
          cups: supply.cups,
          distributorCode: supply.distributor_code,
          startDate: toDatadisMonth(startDate),
          endDate: toDatadisMonth(now),
          authorizedNif: datadis_authorized_nif ?? undefined,
        })

        if (maxPowerData.maxPower?.length) {
          const maxRows = maxPowerData.maxPower.map(entry => {
            const datetime = datadisDatetimeToDate(entry.date, entry.time)
            return {
              user_id: user.id,
              cups: supply.cups,
              datetime: datetime.toISOString(),
              max_power_kw: entry.maxPower / 1000,
              period: maxPowerPeriod(entry.period),
            }
          })

          await (serviceClient as any)
            .from('maximeter')
            .upsert(maxRows, { onConflict: 'user_id,cups,datetime' })

          send('ok', `Maxímetro: ${maxRows.length} registros guardados`)
        } else {
          send('info', 'Maxímetro: sin datos en el rango')
        }
      } catch (err) {
        // Fallo de maxímetro no interrumpe el sync de consumo
        send('warn', `Maxímetro no disponible: ${err instanceof Error ? err.message : 'error'}`)
      }
    }

    // ── Precios PVPC (REData) — mismo rango, independiente de si Datadis falló ──
    try {
      send('info', `Sincronizando precios PVPC (${format(startDate, 'MMM yyyy', { locale: es })} → ${format(now, 'MMM yyyy', { locale: es })})...`)
      const pvpcPrices = await getPvpcPrices(startDate, now)
      if (pvpcPrices.length > 0) {
        const seen = new Map(pvpcPrices.map(p => [p.datetime, p]))
        const pvpcRows: PvpcPriceInsert[] = Array.from(seen.values()).map(p => ({
          datetime: p.datetime,
          price_eur_kwh: p.priceEurKwh,
        }))
        await (serviceClient as any)
          .from('pvpc_prices')
          .upsert(pvpcRows, { onConflict: 'datetime' })
        send('ok', `PVPC: ${pvpcRows.length} precios guardados`)
      } else {
        send('info', 'PVPC: sin precios en el rango')
      }
    } catch (err) {
      send('warn', `PVPC: error sincronizando — ${err instanceof Error ? err.message : 'error'}`)
    }

    // ── Finalizar ─────────────────────────────────────────────────────
    await (serviceClient as any).from('profiles').update({ last_sync_at: now.toISOString() }).eq('id', user.id)

    if (totalSaved === 0) {
      send('done', 'Sync completado — 0 registros de consumo (puede ser retraso de Datadis ~2 días)')
      return
    }

    send('done', `✓ Sync completado — ${totalSaved} registros de consumo guardados`)
  })
}
