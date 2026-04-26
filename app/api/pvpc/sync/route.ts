// POST /api/pvpc/sync
// Emite Server-Sent Events con el progreso de sincronización de precios PVPC.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPvpcPrices } from '@/lib/redata'
import type { PvpcPriceInsert } from '@/lib/supabase/types-helper'
import { format, subMonths, startOfMonth } from 'date-fns'
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
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return makeStream(async (send) => { send('error', 'No autenticado') })
  }

  return makeStream(async (send) => {
    const now = new Date()
    const startDate = startOfMonth(subMonths(now, 2))

    send('info', `Consultando precios REData (${format(startDate, 'dd MMM', { locale: es })} → ${format(now, 'dd MMM yyyy', { locale: es })})...`)

    const pvpcPrices = await getPvpcPrices(startDate, now)

    if (pvpcPrices.length === 0) {
      send('warn', 'Sin precios en el rango consultado')
      send('done', 'PVPC sync completado (0 precios)')
      return
    }

    send('info', `Guardando ${pvpcPrices.length} precios en base de datos...`)

    const serviceClient = await createServiceClient()
    const pvpcRows: PvpcPriceInsert[] = pvpcPrices.map((p) => ({
      datetime: p.datetime,
      price_eur_kwh: p.priceEurKwh,
    }))

    const { error: upsertError } = await serviceClient
      .from('pvpc_prices')
      .upsert(pvpcRows, { onConflict: 'datetime' })

    if (upsertError) throw new Error(`Error guardando: ${(upsertError as { message: string }).message}`)

    send('done', `✓ PVPC sync completado — ${pvpcPrices.length} precios guardados`)
  })
}
