// GET /api/debug/pvpc-match
// Muestra los primeros timestamps de consumption y pvpc_prices para diagnosticar desfase.
// ELIMINAR después de diagnosticar.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [consumptionResult, pvpcResult] = await Promise.all([
    supabase.from('consumption')
      .select('datetime, consumption_kwh, period')
      .eq('user_id', user.id)
      .order('datetime', { ascending: true })
      .limit(3),
    supabase.from('pvpc_prices')
      .select('datetime, price_eur_kwh')
      .order('datetime', { ascending: true })
      .limit(3),
  ])

  const cons = consumptionResult.data ?? []
  const pvpc = pvpcResult.data ?? []

  // Try to match first consumption row against pvpc
  const matches = cons.map(c => {
    const ms = new Date(c.datetime).getTime()
    const attempts: { offset: number; key: string; found: boolean }[] = []
    for (const offsetH of [-3, -2, -1, 0, 1, 2, 3]) {
      const key = new Date(ms - offsetH * 3_600_000).toISOString().substring(0, 13)
      const pvpcRow = pvpc.find(p => p.datetime.substring(0, 13) === key)
      attempts.push({ offset: offsetH, key, found: !!pvpcRow })
    }
    return { consumption_datetime: c.datetime, attempts }
  })

  return NextResponse.json({
    consumption_sample: cons,
    pvpc_sample: pvpc,
    match_attempts: matches,
  })
}
