// GET /api/cron/sync
// Sync automático diario — protegido con CRON_SECRET.
// Configura en vercel.json: { "crons": [{ "path": "/api/cron/sync", "schedule": "0 5 * * *" }] }

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getToken, getConsumption, datadisDatetimeToDate } from '@/lib/datadis'
import { getPvpcPrices } from '@/lib/redata'
import { getPeriod } from '@/lib/tariff'
import { format, subDays, startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function toDatadisMonth(date: Date): string {
  return format(date, 'yyyy/MM')
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  // Obtener todos los usuarios con Datadis configurado
  const { data: profiles, error } = await serviceClient
    .from('profiles')
    .select('id, datadis_username, datadis_password_encrypted, cups, distributor_code, point_type, datadis_authorized_nif')
    .not('datadis_username', 'is', null)
    .not('cups', 'is', null)

  if (error || !profiles) {
    return NextResponse.json({ error: 'Error obteniendo perfiles' }, { status: 500 })
  }

  // Sincronizar últimos 3 días para cubrir retrasos de Datadis
  const now = new Date()
  const startDate = startOfDay(subDays(now, 3))
  const startDateStr = toDatadisMonth(startDate)
  const endDateStr = toDatadisMonth(now)

  const results: Array<{ userId: string; synced: number; error?: string }> = []

  for (const profile of profiles) {
    if (!profile.datadis_username || !profile.datadis_password_encrypted || !profile.cups || !profile.distributor_code) {
      continue
    }

    try {
      const token = await getToken(profile.datadis_username, profile.datadis_password_encrypted)
      const consumptionData = await getConsumption(token, {
        cups: profile.cups,
        distributorCode: profile.distributor_code,
        startDate: startDateStr,
        endDate: endDateStr,
        measurementType: '0',
        pointType: String(profile.point_type ?? 5),
        authorizedNif: profile.datadis_authorized_nif ?? undefined,
      })

      if (consumptionData.timeCurve?.length) {
        const rows = consumptionData.timeCurve.map((entry) => {
          const datetime = datadisDatetimeToDate(entry.date, entry.time)
          return {
            user_id: profile.id,
            cups: profile.cups!,
            datetime: datetime.toISOString(),
            consumption_kwh: entry.consumptionKWh,
            period: getPeriod(datetime),
            obtained_by_real_or_max: entry.obtainMethod === 'Real',
          }
        })

        await serviceClient
          .from('consumption')
          .upsert(rows, { onConflict: 'user_id,cups,datetime' })

        await serviceClient
          .from('profiles')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', profile.id)

        results.push({ userId: profile.id, synced: rows.length })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      results.push({ userId: profile.id, synced: 0, error: msg })
    }
  }

  // Sincronizar PVPC una sola vez para todos los usuarios
  try {
    const pvpcPrices = await getPvpcPrices(startDate, now)
    if (pvpcPrices.length > 0) {
      await serviceClient
        .from('pvpc_prices')
        .upsert(
          pvpcPrices.map((p) => ({ datetime: p.datetime, price_eur_kwh: p.priceEurKwh })),
          { onConflict: 'datetime' }
        )
    }
  } catch {
    // PVPC fallo no interrumpe el cron
  }

  return NextResponse.json({ ok: true, users: results.length, results })
}
