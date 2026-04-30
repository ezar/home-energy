import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from './ConfigForm'
import type { ProfileRow, UserSupplyRow } from '@/lib/supabase/types-helper'
import pkg from '@/package.json'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profileRaw }, { data: suppliesRaw }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_supplies').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
  ])

  const profile = profileRaw as ProfileRow | null
  const supplies = (suppliesRaw ?? []) as UserSupplyRow[]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Credenciales Datadis, suministros y notificaciones</p>
      </div>
      <ConfigForm profile={profile} supplies={supplies} />
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--dim2)', fontFamily: 'var(--font-mono)' }}>
          v{pkg.version}
        </span>
      </div>
    </div>
  )
}
