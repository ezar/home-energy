// GET /api/pvpc?from=YYYY-MM-DD&to=YYYY-MM-DD
// Proxy a REData — devuelve precios PVPC del período solicitado.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPvpcPrices } from '@/lib/redata'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  const to = toStr ? new Date(toStr) : new Date()

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: 'Parámetros de fecha inválidos' }, { status: 400 })
  }

  try {
    const prices = await getPvpcPrices(from, to)
    return NextResponse.json(prices)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error obteniendo precios PVPC'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
