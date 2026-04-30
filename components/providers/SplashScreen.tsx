'use client'

import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 600)
    const t2 = setTimeout(() => setVisible(false), 950)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#0f0f11',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.35s ease',
      pointerEvents: fading ? 'none' : 'all',
    }}>
      <div style={{
        width: 64, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        borderRadius: 18,
        boxShadow: '0 0 40px rgba(245,158,11,0.35)',
        marginBottom: 20,
        animation: 'splashPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <span style={{ color: '#0f0f11', fontSize: 36, fontWeight: 900, lineHeight: 1 }}>E</span>
      </div>
      <span style={{
        fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em',
        textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
        animation: 'splashFadeIn 0.4s 0.2s ease both',
      }}>
        Energy Dashboard
      </span>
    </div>
  )
}
