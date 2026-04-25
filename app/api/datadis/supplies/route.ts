// GET /api/datadis/supplies
// Devuelve los suministros Datadis del usuario autenticado.

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getToken, getSupplies } from '@/lib/datadis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('datadis_username, datadis_password_encrypted, datadis_authorized_nif')
    .eq('id', user.id)
    .single()

  if (!profile?.datadis_username || !profile?.datadis_password_encrypted) {
    return NextResponse.json({ error: 'Credenciales Datadis no configuradas' }, { status: 400 })
  }

  try {
    const token = await getToken(profile.datadis_username, profile.datadis_password_encrypted)
    const data = await getSupplies(token, profile.datadis_authorized_nif ?? undefined)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error obteniendo suministros'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
