'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      style={{
        width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', border: '1px solid var(--border-c)',
        background: 'var(--btn-bg)', color: 'var(--muted-c)',
        transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}
