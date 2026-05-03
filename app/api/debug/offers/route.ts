// GET /api/debug/offers — replica exacta de las queries de la página Ofertas. TEMPORAL.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const now = new Date()
  const startDate = startOfMonth(subMonths(now, 23))

  const [consumptionResult, pvpcResult] = await Promise.all([
    supabase.from('consumption')
      .select('datetime, consumption_kwh, period')
      .eq('user_id', user.id)
      .gte('datetime', startDate.toISOString())
      .order('datetime', { ascending: false })
      .limit(20000),
    supabase.from('pvpc_prices')
      .select('datetime, price_eur_kwh')
      .gte('datetime', startDate.toISOString())
      .order('datetime', { ascending: true })
      .limit(18000),
  ])

  const consumptionRows = consumptionResult.data ?? []
  const pvpcRows = pvpcResult.data ?? []

  const pvpcMap = new Map<string, number>()
  for (const row of pvpcRows) {
    pvpcMap.set(row.datetime.substring(0, 13), row.price_eur_kwh)
  }

  let matched = 0
  let unmatched = 0
  const unmatchedSamples: string[] = []
  const matchedSamples: string[] = []

  for (const row of consumptionRows) {
    const key = row.datetime.substring(0, 13)
    if (pvpcMap.has(key)) {
      matched++
      if (matchedSamples.length < 3) matchedSamples.push(`${row.datetime} → ${pvpcMap.get(key)} €/kWh`)
    } else {
      unmatched++
      if (unmatchedSamples.length < 5) unmatchedSamples.push(row.datetime)
    }
  }

  return NextResponse.json({
    startDate: startDate.toISOString(),
    consumption: {
      count: consumptionRows.length,
      error: consumptionResult.error?.message ?? null,
      oldest: consumptionRows.at(-1)?.datetime ?? null,
      newest: consumptionRows[0]?.datetime ?? null,
    },
    pvpc: {
      count: pvpcRows.length,
      error: pvpcResult.error?.message ?? null,
      oldest: pvpcRows[0]?.datetime ?? null,
      newest: pvpcRows.at(-1)?.datetime ?? null,
    },
    matching: { matched, unmatched, matchedSamples, unmatchedSamples },
  })
}
