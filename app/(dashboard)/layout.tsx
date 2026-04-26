import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('last_sync_at')
    .eq('id', user.id)
    .single()

  const lastSyncAt = (profileRaw as { last_sync_at: string | null } | null)?.last_sync_at ?? null

  return (
    <DashboardShell lastSyncAt={lastSyncAt}>
      {children}
    </DashboardShell>
  )
}
