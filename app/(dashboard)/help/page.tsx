import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plug, Key, Zap, ShieldCheck, Clock, TrendingUp, BarChart3, HelpCircle, RefreshCw } from 'lucide-react'

export default async function HelpPage() {
  const t = await getTranslations('Help')

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-10">
      <div>
        <h1 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <HelpCircle size={20} className="text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">{t('sectionDatadis')}</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plug size={14} className="text-blue-400" />
              {t('whatIsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t('whatIsBody1')}</p>
            <p>{t('whatIsBody2')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key size={14} className="text-yellow-400" />
              {t('credentialsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t('credentialsBody1')}</p>
            <p>{t('credentialsBody2')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck size={14} className="text-purple-400" />
              {t('securityTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{t('securityBody')}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">{t('sectionSync')}</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw size={14} className="text-green-400" />
              {t('syncTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t('syncBody1')}</p>
            <p>{t('syncBody2')}</p>
            <p>{t('syncBody3')}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">{t('sectionTariff')}</h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-3">
            <p>{t('tariffIntro')}</p>
            <div className="space-y-2">
              {([
                { color: '#ef4444', name: 'P1 Punta', desc: t('p1Desc') },
                { color: '#f59e0b', name: 'P2 Llano', desc: t('p2Desc') },
                { color: '#22c55e', name: 'P3 Valle', desc: t('p3Desc') },
              ]).map(({ color, name, desc }) => (
                <div key={name} className="flex items-start gap-3">
                  <span className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div>
                    <span className="font-medium text-foreground">{name}</span>
                    <p className="text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs pt-1">{t('tariffNote')}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">{t('sectionPages')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { icon: Zap,         color: 'text-yellow-400', tKey: 'summaryTitle',     dKey: 'summaryDesc' },
            { icon: BarChart3,   color: 'text-blue-400',   tKey: 'consumptionTitle', dKey: 'consumptionDesc' },
            { icon: Clock,       color: 'text-orange-400', tKey: 'costTitle',        dKey: 'costDesc' },
            { icon: TrendingUp,  color: 'text-sky-400',    tKey: 'pvpcTitle',        dKey: 'pvpcDesc' },
          ] as const).map(({ icon: Icon, color, tKey, dKey }) => (
            <Card key={tKey}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon size={14} className={color} />
                  {t(tKey)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{t(dKey)}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">{t('sectionFaq')}</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          {(['faq1', 'faq2', 'faq3', 'faq4'] as const).map((key) => (
            <div key={key}>
              <p className="font-medium text-foreground mb-1">{t(`${key}Q` as Parameters<typeof t>[0])}</p>
              <p>{t(`${key}A` as Parameters<typeof t>[0])}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
