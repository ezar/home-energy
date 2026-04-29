import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete all user data in dependency order
  await (supabase as any).from('maximeter').delete().eq('user_id', user.id)
  await (supabase as any).from('consumption').delete().eq('user_id', user.id)
  await (supabase as any).from('user_supplies').delete().eq('user_id', user.id)
  await (supabase as any).from('profiles').delete().eq('id', user.id)

  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
