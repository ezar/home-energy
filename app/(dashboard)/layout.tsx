import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import type { ProfileRow } from '@/lib/supabase/types-helper'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, latestDataResult] = await Promise.all([
    supabase.from('profiles').select('last_sync_at').eq('id', user.id).single(),
    supabase.from('consumption').select('datetime').eq('user_id', user.id).order('datetime', { ascending: false }).limit(1),
  ])

  const lastSyncAt = (profileResult.data as Pick<ProfileRow, 'last_sync_at'> | null)?.last_sync_at ?? null
  const latestDataAt = (latestDataResult.data as { datetime: string }[] | null)?.[0]?.datetime ?? null

  return (
    <DashboardShell lastSyncAt={lastSyncAt} latestDataAt={latestDataAt}>
      {children}
    </DashboardShell>
  )
}
