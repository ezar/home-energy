// GET /api/cron/consumption-alert
// Sends push notifications when yesterday's consumption exceeds 1.5× weekday average.
// Run after the sync cron (e.g. 06:00 daily in vercel.json).

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, vapidPublicKey } from '@/lib/webpush'
import { startOfDay, subDays, getDay } from 'date-fns'
import type webpush from 'web-push'

export const dynamic = 'force-dynamic'

const ANOMALY_THRESHOLD = 1.5  // 50% above average triggers alert
const HISTORY_WEEKS = 8         // use last 8 same-weekdays for the baseline

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!vapidPublicKey) {
    return NextResponse.json({ skipped: true, reason: 'VAPID keys no configuradas' })
  }

  const serviceClient = await createServiceClient()

  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, push_subscription')
    .not('push_subscription', 'is', null)
    .limit(500)

  if (!profiles?.length) return NextResponse.json({ ok: true, sent: 0 })

  const now = new Date()
  const yesterday = startOfDay(subDays(now, 1))
  const yesterdayEnd = startOfDay(now)
  const historyStart = startOfDay(subDays(now, HISTORY_WEEKS * 7 + 1))
  const yesterdayDow = getDay(yesterday)

  let sent = 0
  const details: { userId: string; cups: string; kwh: number; avg: number; pct: number }[] = []

  for (const profile of profiles) {
    if (!profile.push_subscription) continue

    // Get all active CUPS for this user
    const { data: suppliesRaw } = await serviceClient
      .from('user_supplies')
      .select('cups')
      .eq('user_id', profile.id)
      .eq('is_active', true)

    const cups = (suppliesRaw ?? []).map((s: { cups: string }) => s.cups)
    if (cups.length === 0) continue

    // Aggregate yesterday's consumption across all CUPS
    const { data: yesterdayRaw } = await serviceClient
      .from('consumption')
      .select('consumption_kwh')
      .eq('user_id', profile.id)
      .gte('datetime', yesterday.toISOString())
      .lt('datetime', yesterdayEnd.toISOString())

    const yesterdayKwh = (yesterdayRaw ?? []).reduce((s: number, r: { consumption_kwh: number }) => s + r.consumption_kwh, 0)
    if (yesterdayKwh === 0) continue

    // Get 8 weeks of history for the same weekday to build baseline
    const { data: historyRaw } = await serviceClient
      .from('consumption')
      .select('datetime, consumption_kwh')
      .eq('user_id', profile.id)
      .gte('datetime', historyStart.toISOString())
      .lt('datetime', yesterday.toISOString())

    if (!historyRaw || historyRaw.length < 24) continue  // need at least 1 day of data

    // Aggregate by day, then filter same weekday
    const dailyMap = new Map<string, number>()
    for (const r of historyRaw as { datetime: string; consumption_kwh: number }[]) {
      const day = r.datetime.substring(0, 10)
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + r.consumption_kwh)
    }

    const sameWeekdayTotals = Array.from(dailyMap.entries())
      .filter(([day]) => getDay(new Date(day)) === yesterdayDow)
      .map(([, kwh]) => kwh)

    if (sameWeekdayTotals.length < 2) continue  // not enough history

    const avg = sameWeekdayTotals.reduce((a, b) => a + b, 0) / sameWeekdayTotals.length

    if (yesterdayKwh <= avg * ANOMALY_THRESHOLD) continue

    const pct = Math.round(((yesterdayKwh - avg) / avg) * 100)

    try {
      await sendPush(
        profile.push_subscription as unknown as webpush.PushSubscription,
        {
          title: `Consumo elevado ayer: ${yesterdayKwh.toFixed(1)} kWh`,
          body: `Un ${pct}% por encima de tu media habitual (${avg.toFixed(1)} kWh). Revisa si dejaste algo encendido.`,
        }
      )
      sent++
      details.push({ userId: profile.id, cups: cups.join(','), kwh: yesterdayKwh, avg, pct })
    } catch {
      await serviceClient.from('profiles').update({ push_subscription: null }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ ok: true, sent, details })
}
