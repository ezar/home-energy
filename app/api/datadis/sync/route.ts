// POST /api/datadis/sync
// Emite Server-Sent Events con el progreso paso a paso.
// Siempre server-side — las credenciales nunca llegan al cliente.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getToken, getConsumption, datadisDatetimeToDate } from '@/lib/datadis'
import { getPeriod } from '@/lib/tariff'
import type { ProfileRow, ConsumptionInsert } from '@/lib/supabase/types-helper'
import { format, subMonths, subDays, startOfMonth, addMonths, parseISO, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
}

type LogType = 'info' | 'ok' | 'warn' | 'error' | 'done'

function toDatadisMonth(date: Date): string {
  return format(date, 'yyyy/MM')
}

function makeStream(run: (send: (type: LogType, msg: string) => void) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: LogType, msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, msg })}\n\n`))
      }
      try {
        await run(send)
      } catch (err) {
        send('error', err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: SSE_HEADERS })
}

export async function POST() {
  const encoder = new TextEncoder()

  // Auth y perfil deben resolverse antes de crear el stream (usan next/headers)
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
  if (!profile.cups || !profile.distributor_code) {
    return makeStream(async (send) => { send('error', 'CUPS o distribuidora no configurados') })
  }

  // Capturar valores para usarlos en el closure
  const { datadis_username, datadis_password_encrypted, cups, distributor_code, point_type, datadis_authorized_nif, last_sync_at } = profile

  return makeStream(async (send) => {
    // ── Aviso rate limit ──────────────────────────────────────────────
    if (last_sync_at) {
      const hoursSince = (Date.now() - new Date(last_sync_at).getTime()) / 3_600_000
      if (hoursSince < 20) {
        send('warn', `Última sync hace ${hoursSince.toFixed(1)}h — Datadis limita ~1 petición/día por endpoint. Si da 429 es normal.`)
      }
    }

    // ── Token ─────────────────────────────────────────────────────────
    send('info', `Autenticando en Datadis como ${datadis_username}...`)
    const token = await getToken(datadis_username!, datadis_password_encrypted!)
    send('ok', 'Token obtenido')

    // ── Chunks mensuales ─────────────────────────────────────────────
    // Datadis da 429 si el rango es demasiado grande — máx 1 mes por petición
    const now = new Date()
    const startDate = last_sync_at
      ? subDays(parseISO(last_sync_at), 5)
      : startOfMonth(subMonths(now, 2))

    const months: Date[] = []
    let cursor = startOfMonth(startDate)
    while (isBefore(cursor, now)) {
      months.push(cursor)
      cursor = addMonths(cursor, 1)
    }

    send('info', `Rango: ${format(startDate, 'dd MMM yyyy', { locale: es })} → ${format(now, 'dd MMM yyyy', { locale: es })} (${months.length} mes${months.length !== 1 ? 'es' : ''})`)

    // ── Consumo por chunks ────────────────────────────────────────────
    const allRows: ConsumptionInsert[] = []

    for (const monthStart of months) {
      const monthLabel = format(monthStart, 'MMM yyyy', { locale: es })
      send('info', `Consultando ${monthLabel}...`)

      const consumptionData = await getConsumption(token, {
        cups: cups!,
        distributorCode: distributor_code!,
        startDate: toDatadisMonth(monthStart),
        endDate: toDatadisMonth(monthStart),   // mismo mes en ambos extremos
        measurementType: '0',
        pointType: String(point_type ?? 5),
        authorizedNif: datadis_authorized_nif ?? undefined,
      })

      const chunkCount = consumptionData.timeCurve?.length ?? 0
      send('ok', `${monthLabel}: ${chunkCount} registros`)

      for (const entry of consumptionData.timeCurve ?? []) {
        const datetime = datadisDatetimeToDate(entry.date, entry.time)
        allRows.push({
          user_id: user.id,
          cups: cups!,
          datetime: datetime.toISOString(),
          consumption_kwh: entry.consumptionKWh,
          period: getPeriod(datetime),
          obtained_by_real_or_max: entry.obtainMethod === 'Real',
        })
      }
    }

    const count = allRows.length

    if (count === 0) {
      send('warn', 'Sin datos en el rango consultado — puede ser retraso de Datadis (~2 días)')
      await (serviceClient as any).from('profiles').update({ last_sync_at: now.toISOString() }).eq('id', user.id)
      send('done', 'Sync completado (0 registros nuevos)')
      return
    }

    // ── Guardar ───────────────────────────────────────────────────────
    send('info', `Guardando ${count} registros en base de datos...`)

    const rows = allRows

    const { error: upsertError } = await (serviceClient as any)
      .from('consumption')
      .upsert(rows, { onConflict: 'user_id,cups,datetime' })

    if (upsertError) throw new Error(`Error guardando: ${(upsertError as { message: string }).message}`)

    await (serviceClient as any).from('profiles').update({ last_sync_at: now.toISOString() }).eq('id', user.id)

    send('done', `✓ Sync completado — ${count} registros guardados`)
  })
}
