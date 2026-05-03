// GET /api/debug/pvpc-match — diagnóstico de desfase timestamps. ELIMINAR tras diagnóstico.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Foco en marzo 2026 para comparar períodos que se solapan
  const from = '2026-03-01T00:00:00.000Z'
  const to   = '2026-03-01T06:00:00.000Z'

  const [consumptionResult, pvpcResult] = await Promise.all([
    supabase.from('consumption')
      .select('datetime, consumption_kwh')
      .eq('user_id', user.id)
      .gte('datetime', from)
      .lt('datetime', to)
      .order('datetime', { ascending: true })
      .limit(6),
    supabase.from('pvpc_prices')
      .select('datetime, price_eur_kwh')
      .gte('datetime', '2026-02-28T22:00:00.000Z')   // un poco antes por si hay offset
      .lt('datetime',  '2026-03-01T09:00:00.000Z')   // un poco después
      .order('datetime', { ascending: true })
      .limit(12),
  ])

  const cons = consumptionResult.data ?? []
  const pvpc = pvpcResult.data ?? []

  const pvpcMap = new Map(pvpc.map(p => [p.datetime.substring(0, 13), p.price_eur_kwh]))

  const matches = cons.map(c => {
    const ms = new Date(c.datetime).getTime()
    const results: { offset: number; key: string; found: boolean }[] = []
    for (const offsetH of [-3, -2, -1, 0, 1, 2, 3]) {
      const key = new Date(ms - offsetH * 3_600_000).toISOString().substring(0, 13)
      results.push({ offset: offsetH, key, found: pvpcMap.has(key) })
    }
    return { consumption_datetime: c.datetime, results }
  })

  return NextResponse.json({
    pvpc_keys_loaded: Array.from(pvpcMap.keys()),
    consumption_sample: cons.map(c => c.datetime),
    matches,
  })
}
