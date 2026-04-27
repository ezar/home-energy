'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { UserSupplyRow } from '@/lib/supabase/types-helper'

interface Props {
  supplies: Pick<UserSupplyRow, 'cups' | 'display_name'>[]
  selected: string | null
}

const PILL = (active: boolean): React.CSSProperties => ({
  padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
  fontSize: 11.5, fontWeight: active ? 600 : 400,
  background: active ? 'rgba(245,158,11,0.14)' : 'var(--btn-bg)',
  color: active ? 'var(--nav-active-text)' : 'var(--dim)',
  border: `1px solid ${active ? 'rgba(245,158,11,0.3)' : 'var(--btn-border)'}`,
  fontFamily: 'var(--font-sans)', transition: 'all 0.15s', whiteSpace: 'nowrap',
})

function label(s: Pick<UserSupplyRow, 'cups' | 'display_name'>): string {
  return s.display_name ?? `···${s.cups.slice(-8)}`
}

export function CupsSelector({ supplies, selected }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function select(cups: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (cups) params.set('cups', cups)
    else params.delete('cups')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10.5, color: 'var(--dim)', fontWeight: 500, marginRight: 2 }}>Suministro</span>
      <button style={PILL(!selected)} onClick={() => select(null)}>Todos</button>
      {supplies.map(s => (
        <button key={s.cups} style={PILL(selected === s.cups)} onClick={() => select(s.cups)}>
          {label(s)}
        </button>
      ))}
    </div>
  )
}
