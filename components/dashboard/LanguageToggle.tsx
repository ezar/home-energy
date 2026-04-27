'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

export function LanguageToggle() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('Topbar')

  function toggle() {
    const next = locale === 'es' ? 'en' : 'es'
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      title={t('switchLang')}
      style={{
        height: 32, padding: '0 10px', borderRadius: 8,
        display: 'flex', alignItems: 'center',
        cursor: 'pointer', border: '1px solid var(--border-c)',
        background: 'var(--btn-bg)', color: 'var(--dim)',
        fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)',
        transition: 'all 0.15s', flexShrink: 0, letterSpacing: '0.04em',
      }}
    >
      {locale === 'es' ? 'EN' : 'ES'}
    </button>
  )
}
