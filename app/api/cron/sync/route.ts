// GET /api/cron/sync
// Sync automático diario — protegido con CRON_SECRET.
// Configura en vercel.json: { "crons": [{ "path": "/api/cron/sync", "schedule": "0 5 * * *" }] }

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getToken, getConsumption, getMaxPower, datadisDatetimeToDate } from '@/lib/datadis'
import { getPvpcPrices } from '@/lib/redata'
import { getPeriod } from '@/lib/tariff'
import { decrypt } from '@/lib/encrypt'
import { format, subDays, startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function toDatadisMonth(date: Date): string {
  return format(date, 'yyyy/MM')
}

function maxPowerPeriod(p: string): 1 | 2 | 3 {
  if (p === 'PUNTA') return 1
  if (p === 'LLANO') return 2
  return 3
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  const { data: profiles, error } = await serviceClient
    .from('profiles')
    .select('id, datadis_username, datadis_password_encrypted, datadis_authorized_nif')
    .not('datadis_username', 'is', null)
    .not('datadis_password_encrypted', 'is', null)
    .limit(500)

  if (error || !profiles) {
    return NextResponse.json({ error: 'Error obteniendo perfiles' }, { status: 500 })
  }

  const now = new Date()
  const startDate = startOfDay(subDays(now, 3))
  const startDateStr = toDatadisMonth(startDate)
  const endDateStr = toDatadisMonth(now)

  const results: Array<{ userId: string; cups: string; synced: number; maximeter: number; error?: string }> = []

  for (const profile of profiles) {
    if (!profile.datadis_username || !profile.datadis_password_encrypted) continue

    const { data: suppliesRaw } = await serviceClient
      .from('user_supplies')
      .select('cups, distributor_code, point_type')
      .eq('user_id', profile.id)
      .eq('is_active', true)

    const supplies = (suppliesRaw ?? []) as { cups: string; distributor_code: string; point_type: number }[]
    if (supplies.length === 0) continue

    try {
      const password = decrypt(profile.datadis_password_encrypted)
      const token = await getToken(profile.datadis_username, password)

      for (const supply of supplies) {
        let syncedCount = 0
        let maximeterCount = 0

        // Consumo
        const consumptionData = await getConsumption(token, {
          cups: supply.cups,
          distributorCode: supply.distributor_code,
          startDate: startDateStr,
          endDate: endDateStr,
          measurementType: '0',
          pointType: String(supply.point_type ?? 5),
          authorizedNif: profile.datadis_authorized_nif ?? undefined,
        })

        if (consumptionData.timeCurve?.length) {
          const rows = consumptionData.timeCurve.map((entry) => {
            const datetime = datadisDatetimeToDate(entry.date, entry.time)
            return {
              user_id: profile.id,
              cups: supply.cups,
              datetime: datetime.toISOString(),
              consumption_kwh: entry.consumptionKWh,
              period: getPeriod(datetime),
              obtained_by_real_or_max: entry.obtainMethod === 'Real',
            }
          })

          await serviceClient
            .from('consumption')
            .upsert(rows, { onConflict: 'user_id,cups,datetime' })

          syncedCount = rows.length
        }

        // Maxímetro
        try {
          const maxPowerData = await getMaxPower(token, {
            cups: supply.cups,
            distributorCode: supply.distributor_code,
            startDate: startDateStr,
            endDate: endDateStr,
            authorizedNif: profile.datadis_authorized_nif ?? undefined,
          })

          if (maxPowerData.maxPower?.length) {
            const maxRows = maxPowerData.maxPower.map(entry => {
              const datetime = datadisDatetimeToDate(entry.date, entry.time)
              return {
                user_id: profile.id,
                cups: supply.cups,
                datetime: datetime.toISOString(),
                max_power_kw: entry.maxPower / 1000,
                period: maxPowerPeriod(entry.period),
              }
            })

            await (serviceClient as any)
              .from('maximeter')
              .upsert(maxRows, { onConflict: 'user_id,cups,datetime' })

            maximeterCount = maxRows.length
          }
        } catch {
          // Fallo de maxímetro no interrumpe el sync
        }

        results.push({ userId: profile.id, cups: supply.cups, synced: syncedCount, maximeter: maximeterCount })
      }

      await serviceClient
        .from('profiles')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', profile.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      results.push({ userId: profile.id, cups: '?', synced: 0, maximeter: 0, error: msg })
    }
  }

  // PVPC — una sola vez para todos los usuarios
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
