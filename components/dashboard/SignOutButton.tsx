'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      title="Cerrar sesión"
      style={{
        width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', border: '1px solid var(--border-c)',
        background: 'var(--btn-bg)', color: 'var(--dim)',
        transition: 'all 0.15s',
      }}
    >
      <LogOut size={13} />
    </button>
  )
}
