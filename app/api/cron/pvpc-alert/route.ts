import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, vapidPublicKey } from '@/lib/webpush'
import type webpush from 'web-push'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!vapidPublicKey) {
    return NextResponse.json({ skipped: true, reason: 'VAPID keys no configuradas' })
  }

  const serviceClient = await createServiceClient()

  const { data: pvpcRaw } = await serviceClient
    .from('pvpc_prices')
    .select('price_eur_kwh, datetime')
    .order('datetime', { ascending: false })
    .limit(1)

  const latestPrice = pvpcRaw?.[0]?.price_eur_kwh
  if (!latestPrice) return NextResponse.json({ ok: true, sent: 0, reason: 'sin datos PVPC' })

  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, push_subscription, push_price_threshold')
    .not('push_subscription', 'is', null)
    .not('push_price_threshold', 'is', null)

  if (!profiles?.length) return NextResponse.json({ ok: true, sent: 0 })

  let sent = 0
  for (const profile of profiles) {
    if (!profile.push_price_threshold || latestPrice > profile.push_price_threshold) continue
    if (!profile.push_subscription) continue

    try {
      await sendPush(
        profile.push_subscription as unknown as webpush.PushSubscription,
        {
          title: `Precio bajo: ${latestPrice.toFixed(5)} €/kWh`,
          body: `El PVPC bajó de tu umbral (${(profile.push_price_threshold as number).toFixed(5)} €/kWh). ¡Buen momento para consumir!`,
        }
      )
      sent++
    } catch {
      await serviceClient.from('profiles').update({ push_subscription: null }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ ok: true, sent, price: latestPrice })
}
