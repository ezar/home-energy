import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vapidPublicKey } from '@/lib/webpush'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ publicKey: vapidPublicKey })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json() as { subscription: Record<string, unknown>; threshold?: number }
  const updates: Record<string, unknown> = { push_subscription: body.subscription }
  if (body.threshold !== undefined) updates.push_price_threshold = body.threshold

  const { error } = await (supabase as any).from('profiles').update(updates).eq('id', user.id)
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await (supabase as any).from('profiles').update({ push_subscription: null }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
