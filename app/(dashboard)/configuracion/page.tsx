import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from './ConfigForm'
import type { ProfileRow } from '@/lib/supabase/types-helper'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as ProfileRow | null

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Credenciales Datadis y suministro eléctrico</p>
      </div>
      <ConfigForm profile={profile} />
    </div>
  )
}
