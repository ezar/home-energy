'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, ShieldCheck, Key, Plug, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default function WelcomePage() {
  const router = useRouter()
  const t = useTranslations('Welcome')

  async function handleContinue() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
    }
    router.push('/settings')
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(249,115,22,0.12))', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Zap size={28} color="#f59e0b" fill="rgba(245,158,11,0.2)" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('description')}</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Plug size={16} className="text-blue-400" />
              {t('step1Title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t('step1Body1')}</p>
            <p>{t('step1Body2')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Key size={16} className="text-yellow-400" />
              {t('step2Title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t('step2Body1')}</p>
            <p>{t('step2Body2')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap size={16} className="text-green-400" />
              {t('step3Title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t('step3Body1')}</p>
            <p className="text-xs">{t('step3Note')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-400" />
              {t('securityTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{t('securityBody')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button className="flex-1" onClick={handleContinue}>
          {t('cta')}
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/help">
            <HelpCircle size={15} className="mr-2" />
            {t('ctaHelp')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
