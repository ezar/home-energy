import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPvpcPrices } from '@/lib/redata'
import type { PvpcPriceInsert } from '@/lib/supabase/types-helper'
import { subMonths, startOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const now = new Date()
  const startDate = startOfMonth(subMonths(now, 2))

  try {
    const pvpcPrices = await getPvpcPrices(startDate, now)

    if (pvpcPrices.length === 0) {
      return NextResponse.json({ pvpcSynced: 0 })
    }

    const serviceClient = await createServiceClient()
    const pvpcRows: PvpcPriceInsert[] = pvpcPrices.map((p) => ({
      datetime: p.datetime,
      price_eur_kwh: p.priceEurKwh,
    }))

    await (serviceClient as any)
      .from('pvpc_prices')
      .upsert(pvpcRows, { onConflict: 'datetime' })

    return NextResponse.json({ pvpcSynced: pvpcRows.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error sincronizando PVPC' },
      { status: 502 }
    )
  }
}
