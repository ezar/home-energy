// POST /api/datadis/sync
// Sincroniza consumo Datadis para el usuario autenticado.
// Siempre server-side — las credenciales nunca llegan al cliente.

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getToken, getConsumption, datadisDatetimeToDate } from '@/lib/datadis'
import { getPeriod } from '@/lib/tariff'
import type { SyncResult } from '@/lib/types/consumption'
import type { ProfileRow, ConsumptionInsert } from '@/lib/supabase/types-helper'
import { format, subMonths, subDays, startOfMonth, parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function toDatadisMonth(date: Date): string {
  return format(date, 'yyyy/MM')
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()
  const { data: profileRaw } = await serviceClient
    .from('profiles')
    .select('datadis_username, datadis_password_encrypted, cups, distributor_code, point_type, datadis_authorized_nif, last_sync_at')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Pick<ProfileRow, 'datadis_username' | 'datadis_password_encrypted' | 'cups' | 'distributor_code' | 'point_type' | 'datadis_authorized_nif' | 'last_sync_at'> | null

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  if (!profile.datadis_username || !profile.datadis_password_encrypted) return NextResponse.json({ error: 'Credenciales Datadis no configuradas' }, { status: 400 })
  if (!profile.cups || !profile.distributor_code) return NextResponse.json({ error: 'CUPS o distribuidora no configurados' }, { status: 400 })

  let token: string
  try {
    token = await getToken(profile.datadis_username, profile.datadis_password_encrypted)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error de autenticación' }, { status: 502 })
  }

  const now = new Date()
  // Si ya hay un sync previo, pedir solo desde (last_sync_at - 5 días)
  // para cubrir el retraso de Datadis (~2 días). Si es el primer sync, 2 meses.
  const startDate = profile.last_sync_at
    ? subDays(parseISO(profile.last_sync_at), 5)
    : startOfMonth(subMonths(now, 2))

  try {
    const consumptionData = await getConsumption(token, {
      cups: profile.cups,
      distributorCode: profile.distributor_code,
      startDate: toDatadisMonth(startDate),
      endDate: toDatadisMonth(now),
      measurementType: '0',
      pointType: String(profile.point_type ?? 5),
      authorizedNif: profile.datadis_authorized_nif ?? undefined,
    })

    let consumptionSynced = 0

    if (consumptionData.timeCurve?.length) {
      const rows: ConsumptionInsert[] = consumptionData.timeCurve.map((entry) => {
        const datetime = datadisDatetimeToDate(entry.date, entry.time)
        return {
          user_id: user.id,
          cups: profile.cups!,
          datetime: datetime.toISOString(),
          consumption_kwh: entry.consumptionKWh,
          period: getPeriod(datetime),
          obtained_by_real_or_max: entry.obtainMethod === 'Real',
        }
      })

      
      const { error } = await (serviceClient as any)
        .from('consumption')
        .upsert(rows, { onConflict: 'user_id,cups,datetime' })

      if (error) throw new Error(`Error guardando consumo: ${(error as { message: string }).message}`)
      consumptionSynced = rows.length
    }

    await (serviceClient as any)
      .from('profiles')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', user.id)

    const result: SyncResult = {
      synced: consumptionSynced,
      from: startDate.toISOString(),
      to: now.toISOString(),
      pvpcSynced: 0,
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error durante sync' }, { status: 502 })
  }
}
