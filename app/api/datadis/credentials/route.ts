// PATCH /api/datadis/credentials
// Guarda la contraseña de Datadis cifrada en el servidor.
// La contraseña NUNCA debe enviarse directamente al cliente de Supabase.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encrypt'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
  }

  const encrypted = encrypt(password.trim())
  const serviceClient = await createServiceClient()
  const { error } = await serviceClient
    .from('profiles')
    .update({ datadis_password_encrypted: encrypted })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
