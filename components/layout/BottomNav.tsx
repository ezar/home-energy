'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Zap, BarChart3, DollarSign, TrendingUp, Scale, Settings, HelpCircle } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations('Nav')

  const navItems = [
    { href: '/',             label: t('summary'),       icon: Zap },
    { href: '/consumption',  label: t('consumption'),   icon: BarChart3 },
    { href: '/cost',         label: t('cost'),          icon: DollarSign },
    { href: '/pvpc',         label: t('pvpc'),          icon: TrendingUp },
    { href: '/offers',       label: t('offers'),        icon: Scale },
    { href: '/settings',     label: t('settingsShort'), icon: Settings },
    { href: '/help',         label: t('help'),          icon: HelpCircle },
  ]

  return (
    <nav className="bottom-nav">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href} prefetch scroll={false} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 0',
              color: active ? 'var(--nav-active-text)' : 'var(--dim)',
              transition: 'color 0.1s',
            }}>
              <Icon size={20} />
              <span style={{ fontSize: 9.5, fontWeight: active ? 600 : 400, fontFamily: 'var(--font-sans)' }}>{label}</span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
