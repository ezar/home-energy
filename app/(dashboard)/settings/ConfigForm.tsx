'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Eye, EyeOff, RefreshCw, Zap, Info } from 'lucide-react'
import type { ProfileRow, UserSupplyRow } from '@/lib/supabase/types-helper'
import type { DatadisSupply } from '@/lib/types/datadis'
import { ColorBadge } from '@/components/dashboard/PeriodBadge'
import { CARD_STYLE as CARD, INPUT_STYLE as INPUT, LABEL_STYLE as LABEL, SECTION_LABEL_STYLE as SECTION_LABEL, BTN_DEFAULT_STYLE as BTN_DEFAULT, BTN_PRIMARY_STYLE as BTN_PRIMARY } from '@/lib/ui-styles'

type LogEntry = { id: number; type: string; msg: string }

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

interface ConfigFormProps {
  profile: ProfileRow | null
  supplies: UserSupplyRow[]
}

export function ConfigForm({ profile, supplies: initialSupplies }: ConfigFormProps) {
  const t = useTranslations('Settings')
  const tc = useTranslations('Common')
  const supabase = createClient()

  const [datadisUsername, setDatadisUsername] = useState(profile?.datadis_username ?? '')
  const passwordRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [authorizedNif, setAuthorizedNif] = useState(profile?.datadis_authorized_nif ?? '')
  const [cups, setCups] = useState(profile?.cups ?? '')
  const [distributorCode, setDistributorCode] = useState(profile?.distributor_code ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [tariffType, setTariffType] = useState<'pvpc' | 'fixed'>(profile?.tariff_type ?? 'pvpc')
  const [priceP1, setPriceP1] = useState(profile?.price_p1_eur_kwh?.toString() ?? '')
  const [priceP2, setPriceP2] = useState(profile?.price_p2_eur_kwh?.toString() ?? '')
  const [priceP3, setPriceP3] = useState(profile?.price_p3_eur_kwh?.toString() ?? '')
  const [powerKw, setPowerKw] = useState(profile?.power_kw?.toString() ?? '')
  const [powerPriceKwMonth, setPowerPriceKwMonth] = useState(profile?.power_price_eur_kw_month?.toString() ?? '')
  const [monthlyTarget, setMonthlyTarget] = useState(profile?.monthly_kwh_target?.toString() ?? '')

  const [localSupplies, setLocalSupplies] = useState<UserSupplyRow[]>(initialSupplies)
  const [pushThreshold, setPushThreshold] = useState(profile?.push_price_threshold?.toString() ?? '')
  const [pushEnabled, setPushEnabled] = useState(!!profile?.push_subscription)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushMsg, setPushMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncingDatadis, setSyncingDatadis] = useState(false)
  const [syncingPvpc, setSyncingPvpc] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; supplies?: DatadisSupply[]; error?: string } | null>(null)
  const [syncLogs, setSyncLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)
  const logBoxRef = useRef<HTMLDivElement>(null)
  const testAbortRef = useRef<AbortController | null>(null)
  const syncAbortRef = useRef<AbortController | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveMsg(null)

    // Validation
    if (tariffType === 'fixed') {
      const p1 = parseFloat(priceP1)
      const p2 = parseFloat(priceP2)
      const p3 = parseFloat(priceP3)
      if (isNaN(p1) || isNaN(p2) || isNaN(p3)) {
        setSaveMsg({ ok: false, text: t('validationPriceRequired') })
        return
      }
      if (p1 <= 0 || p2 <= 0 || p3 <= 0) {
        setSaveMsg({ ok: false, text: t('validationPricePositive') })
        return
      }
    }
    if (cups && !/^ES.{18,20}$/i.test(cups.trim())) {
      setSaveMsg({ ok: false, text: t('validationCupsFormat') })
      return
    }
    if (distributorCode && !/^\d+$/.test(distributorCode.trim())) {
      setSaveMsg({ ok: false, text: t('validationDistributorFormat') })
      return
    }

    setSaving(true)

    const updates: Record<string, unknown> = {
      display_name: displayName || null,
      datadis_username: datadisUsername || null,
      datadis_authorized_nif: authorizedNif || null,
      cups: cups || null,
      distributor_code: distributorCode || null,
      tariff_type: tariffType,
      price_p1_eur_kwh: tariffType === 'fixed' ? (parseFloat(priceP1) || null) : null,
      price_p2_eur_kwh: tariffType === 'fixed' ? (parseFloat(priceP2) || null) : null,
      price_p3_eur_kwh: tariffType === 'fixed' ? (parseFloat(priceP3) || null) : null,
      power_kw: parseFloat(powerKw) || null,
      power_price_eur_kw_month: parseFloat(powerPriceKwMonth) || null,
      monthly_kwh_target: parseFloat(monthlyTarget) || null,
    }

    const { error } = await (supabase as any)
      .from('profiles').update(updates).eq('id', profile?.id ?? '')

    if (error) {
      setSaveMsg({ ok: false, text: (error as { message: string }).message })
      setSaving(false)
      return
    }

    const newPassword = passwordRef.current?.value ?? ''
    if (newPassword) {
      const res = await fetch('/api/datadis/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (passwordRef.current) passwordRef.current.value = ''
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setSaveMsg({ ok: false, text: d.error ?? t('errorSavingPassword') })
        setSaving(false)
        return
      }
    }

    setSaveMsg({ ok: true, text: t('saved') })
    setSaving(false)
  }

  async function handleTestConnection() {
    testAbortRef.current?.abort()
    const controller = new AbortController()
    testAbortRef.current = controller
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/datadis/supplies', { signal: controller.signal })
      const data = await res.json()
      setTestResult(res.ok ? { ok: true, supplies: data.supplies ?? [] } : { ok: false, error: data.error ?? t('errorConnection') })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setTestResult({ ok: false, error: t('errorNetwork') })
    } finally {
      setTesting(false)
    }
  }

  async function handleSyncDatadis() {
    syncAbortRef.current?.abort()
    const controller = new AbortController()
    syncAbortRef.current = controller
    setSyncingDatadis(true)
    setSyncLogs([])
    try {
      const res = await fetch('/api/datadis/sync', { method: 'POST', signal: controller.signal })
      if (!res.body) throw new Error('Sin respuesta del servidor')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; msg: string }
            setSyncLogs(prev => [...prev, { id: ++logIdRef.current, ...event }])
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setSyncLogs(prev => [...prev, { id: ++logIdRef.current, type: 'error', msg: t('errorNetwork') }])
    } finally {
      setSyncingDatadis(false)
    }
  }

  async function handleSyncPvpc() {
    syncAbortRef.current?.abort()
    const controller = new AbortController()
    syncAbortRef.current = controller
    setSyncingPvpc(true)
    setSyncLogs([])
    try {
      const res = await fetch('/api/pvpc/sync', { method: 'POST', signal: controller.signal })
      if (!res.body) throw new Error('Sin respuesta del servidor')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; msg: string }
            setSyncLogs(prev => [...prev, { id: ++logIdRef.current, ...event }])
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setSyncLogs(prev => [...prev, { id: ++logIdRef.current, type: 'error', msg: t('errorNetwork') }])
    } finally {
      setSyncingPvpc(false)
    }
  }

  async function handleAddSupply(cups: string, distributorCode: string) {
    const newSupply: UserSupplyRow = {
      id: crypto.randomUUID(), user_id: profile?.id ?? '',
      cups, distributor_code: distributorCode, point_type: 5,
      display_name: null, is_active: true, created_at: new Date().toISOString(),
    }
    const { error } = await (supabase as any)
      .from('user_supplies')
      .upsert({ user_id: profile?.id, cups, distributor_code: distributorCode, point_type: 5 }, { onConflict: 'user_id,cups' })
    if (!error) {
      setLocalSupplies(prev => prev.find(s => s.cups === cups) ? prev : [...prev, newSupply])
    }
  }

  async function handleToggleSupply(id: string, isActive: boolean) {
    await (supabase as any).from('user_supplies').update({ is_active: isActive }).eq('id', id)
    setLocalSupplies(prev => prev.map(s => s.id === id ? { ...s, is_active: isActive } : s))
  }

  async function handleDeleteSupply(id: string) {
    await (supabase as any).from('user_supplies').delete().eq('id', id)
    setLocalSupplies(prev => prev.filter(s => s.id !== id))
  }

  async function handlePushToggle() {
    setPushLoading(true)
    setPushMsg(null)
    try {
      if (pushEnabled) {
        await fetch('/api/push', { method: 'DELETE' })
        setPushEnabled(false)
        setPushMsg({ ok: true, text: t('notificationsDisabled') })
      } else {
        if (!('Notification' in window)) {
          setPushMsg({ ok: false, text: t('browserNotSupported') })
          return
        }
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setPushMsg({ ok: false, text: t('notificationDenied') })
          return
        }
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const { publicKey } = await fetch('/api/push').then(r => r.json()) as { publicKey: string }
        if (!publicKey) {
          setPushMsg({ ok: false, text: t('vapidNotConfigured') })
          return
        }
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            threshold: parseFloat(pushThreshold) || undefined,
          }),
        })
        setPushEnabled(true)
        setPushMsg({ ok: true, text: t('notificationsEnabled') })
      }
    } catch (err) {
      setPushMsg({ ok: false, text: err instanceof Error ? err.message : t('unknownError') })
    } finally {
      setPushLoading(false)
    }
  }

  async function handleDeleteData() {
    if (!window.confirm(t('deleteDataConfirm'))) return
    setDeleting(true)
    setDeleteMsg(null)
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setDeleteMsg(d.error ?? t('errorNetwork'))
      } else {
        window.location.href = '/login'
      }
    } catch {
      setDeleteMsg(t('errorNetwork'))
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
    }
  }, [syncLogs])

  const lastSync = profile?.last_sync_at
    ? new Date(profile.last_sync_at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}
      className="config-cols">

      {/* LEFT: form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={CARD}>
          <div style={SECTION_LABEL}>{t('profile')}</div>
          <div>
            <label style={LABEL}>{t('name')}</label>
            <input style={INPUT} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('namePlaceholder')} />
          </div>
        </div>

        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={SECTION_LABEL as React.CSSProperties}>{t('datadisCredentials')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--dim)', marginBottom: 12 }}>
              <ShieldCheck size={11} /> {t('serverOnly')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="g2" style={{ gap: 10 }}>
              <div>
                <label style={LABEL}>{t('nif')}</label>
                <input style={INPUT} value={datadisUsername} onChange={e => setDatadisUsername(e.target.value)} placeholder={t('nifPlaceholder')} autoComplete="off" />
              </div>
              <div>
                <label style={LABEL}>
                  {t('password')}
                  {profile?.datadis_password_encrypted && <span style={{ color: 'var(--dim)', fontWeight: 400, marginLeft: 6 }}>{t('passwordSaved')}</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={passwordRef}
                    style={{ ...INPUT, paddingRight: 36 }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={profile?.datadis_password_encrypted ? t('passwordSavedPlaceholder') : t('newPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', display: 'flex' }}>
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label style={LABEL}>{t('authorizedNif')}</label>
              <input style={INPUT} value={authorizedNif} onChange={e => setAuthorizedNif(e.target.value)} placeholder={t('authorizedNifPlaceholder')} autoComplete="off" />
            </div>
          </div>
        </div>

        <div style={CARD}>
          <div style={SECTION_LABEL}>{t('supply')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="g2" style={{ gap: 10 }}>
              <div>
                <label style={LABEL}>{t('cups')}</label>
                <input style={{ ...INPUT, fontFamily: 'var(--font-mono)', fontSize: 11 }} value={cups} onChange={e => setCups(e.target.value)} placeholder={t('cupsPlaceholder')} autoComplete="off" />
              </div>
              <div>
                <label style={LABEL}>{t('distributorCode')}</label>
                <input style={INPUT} value={distributorCode} onChange={e => setDistributorCode(e.target.value)} placeholder={t('distributorPlaceholder')} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={BTN_DEFAULT} onClick={handleTestConnection} disabled={testing || !datadisUsername}>
                {testing ? <Loader2 size={12} className="spin" /> : null}
                {testing ? t('verifying') : t('verify')}
              </button>
            </div>

            {testResult && (
              <div style={{
                padding: '10px 12px', borderRadius: 8, fontSize: 12,
                background: testResult.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                color: testResult.ok ? '#34d399' : '#f87171',
                border: `1px solid ${testResult.ok ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
              }}>
                {testResult.ok ? (
                  <div>
                    <div style={{ marginBottom: 6 }}>{t('verifyOk', { count: testResult.supplies?.length ?? 0 })}</div>
                    {testResult.supplies?.map(s => {
                      const already = localSupplies.some(ls => ls.cups === s.cups)
                      return (
                        <div key={s.cups} style={{ fontSize: 11, padding: '8px', background: 'var(--bg-inset)', borderRadius: 6, marginTop: 6 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{s.cups}</div>
                          <div style={{ color: 'var(--muted-c)', marginBottom: 6 }}>{s.address}</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <ColorBadge color="#38bdf8">Dist. {s.distributorCode}</ColorBadge>
                            <ColorBadge color="#fbbf24">Tipo {s.pointType}</ColorBadge>
                            {already
                              ? <ColorBadge color="#34d399">{t('added')}</ColorBadge>
                              : (
                                <button type="button" onClick={() => handleAddSupply(s.cups, s.distributorCode)} style={{
                                  padding: '2px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 500,
                                  background: 'rgba(245,158,11,0.12)', color: 'var(--nav-active-text)',
                                  border: '1px solid rgba(245,158,11,0.25)', fontFamily: 'var(--font-sans)',
                                }}>
                                  {t('addSupply')}
                                </button>
                              )
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <span>✗ {testResult.error}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tarifa */}
        <div style={CARD}>
          <div style={SECTION_LABEL}>{t('tariff')}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {(['pvpc', 'fixed'] as const).map(tt => (
              <button key={tt} type="button" onClick={() => setTariffType(tt)} style={{
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: tariffType === tt ? 'rgba(245,158,11,0.12)' : 'var(--btn-bg)',
                color: tariffType === tt ? 'var(--nav-active-text)' : 'var(--btn-text)',
                border: `1px solid ${tariffType === tt ? 'rgba(245,158,11,0.25)' : 'var(--btn-border)'}`,
                fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
              }}>
                {tt === 'pvpc' ? t('tariffPvpc') : t('tariffFixed')}
              </button>
            ))}
          </div>

          {tariffType === 'fixed' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>{t('priceByPeriod')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: t('p1Label'), val: priceP1, set: setPriceP1, color: '#f87171' },
                  { label: t('p2Label'), val: priceP2, set: setPriceP2, color: '#fbbf24' },
                  { label: t('p3Label'), val: priceP3, set: setPriceP3, color: '#34d399' },
                ].map(({ label, val, set, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--muted-c)', flex: 1, minWidth: 0 }}>{label}</span>
                    <input
                      style={{ ...INPUT, width: 100, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      value={val} onChange={e => set(e.target.value)}
                      placeholder="0.12345" type="number" step="0.00001" min="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: tariffType === 'fixed' ? '1px solid var(--border-subtle)' : 'none', paddingTop: tariffType === 'fixed' ? 14 : 0 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>
              {t('contractedPower')} <span style={{ color: 'var(--dim2)' }}>{t('contractedPowerNote')}</span>
            </div>
            <div className="g2" style={{ gap: 10 }}>
              <div>
                <label style={LABEL}>{t('powerKw')}</label>
                <input style={{ ...INPUT, fontFamily: 'var(--font-mono)' }} value={powerKw} onChange={e => setPowerKw(e.target.value)} placeholder={t('powerKwPlaceholder')} type="number" step="0.1" min="0" />
              </div>
              <div>
                <label style={LABEL}>{t('powerPrice')}</label>
                <input style={{ ...INPUT, fontFamily: 'var(--font-mono)' }} value={powerPriceKwMonth} onChange={e => setPowerPriceKwMonth(e.target.value)} placeholder={t('powerPricePlaceholder')} type="number" step="0.01" min="0" />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>
              {t('monthlyTarget')} <span style={{ color: 'var(--dim2)' }}>{t('monthlyTargetNote')}</span>
            </div>
            <div style={{ maxWidth: 160 }}>
              <label style={LABEL}>{t('monthlyTargetKwh')}</label>
              <input style={{ ...INPUT, fontFamily: 'var(--font-mono)' }} value={monthlyTarget} onChange={e => setMonthlyTarget(e.target.value)} placeholder={t('monthlyTargetPlaceholder')} type="number" step="10" min="0" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="submit" style={BTN_PRIMARY} disabled={saving}>
            {saving && <Loader2 size={12} className="spin" />}
            {saving ? t('saving') : t('save')}
          </button>
          {saveMsg && (
            <span style={{ fontSize: 12, color: saveMsg.ok ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
              {saveMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {saveMsg.text}
            </span>
          )}
        </div>
      </form>

      {/* RIGHT: status + sync */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={CARD}>
          <div style={SECTION_LABEL}>{t('syncStatus')}</div>
          {[
            { label: t('lastSync'), val: lastSync ?? tc('never'), color: lastSync ? '#34d399' : 'var(--dim)' },
            { label: t('dataUpTo'), val: profile?.last_sync_at ? new Date(profile.last_sync_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—', color: 'var(--text-2)' },
            { label: t('nextAutoSync'), val: t('nextAutoSyncValue'), color: 'var(--dim)' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted-c)' }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: item.color }}>{item.val}</span>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button style={BTN_DEFAULT} onClick={handleSyncDatadis} disabled={syncingDatadis} type="button">
              {syncingDatadis ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
              {syncingDatadis ? t('reloading') : t('reloadDatadis')}
            </button>
            <button style={BTN_DEFAULT} onClick={handleSyncPvpc} disabled={syncingPvpc} type="button">
              {syncingPvpc ? <Loader2 size={11} className="spin" /> : <Zap size={11} />}
              {syncingPvpc ? t('reloadingPvpc') : t('reloadPvpc')}
            </button>
          </div>

          {syncLogs.length > 0 && (
            <div
              ref={logBoxRef}
              style={{
                marginTop: 10, padding: '8px 10px',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8, maxHeight: 180, overflowY: 'auto',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              {syncLogs.map(log => (
                <div key={log.id} style={{
                  display: 'flex', gap: 7, alignItems: 'flex-start',
                  color: log.type === 'error' ? '#f87171'
                       : log.type === 'warn'  ? '#fbbf24'
                       : log.type === 'ok' || log.type === 'done' ? '#34d399'
                       : 'var(--muted-c)',
                }}>
                  <span style={{ flexShrink: 0, opacity: 0.7 }}>
                    {log.type === 'error' ? '✗' : log.type === 'warn' ? '⚠' : log.type === 'ok' || log.type === 'done' ? '✓' : '·'}
                  </span>
                  <span style={{ lineHeight: 1.5 }}>{log.msg}</span>
                </div>
              ))}
              {(syncingDatadis || syncingPvpc) && (
                <div style={{ color: 'var(--dim)', display: 'flex', gap: 7 }}>
                  <Loader2 size={10} className="spin" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{t('waitingResponse')}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {localSupplies.length > 0 && (
          <div style={CARD}>
            <div style={SECTION_LABEL}>{t('activeSupplies')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {localSupplies.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: 'var(--bg-inset)', borderRadius: 8, border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: s.is_active ? '#34d399' : 'var(--dim)', boxShadow: s.is_active ? '0 0 6px #34d39960' : 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.cups}
                    </div>
                    {s.display_name && <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{s.display_name}</div>}
                  </div>
                  {s.distributor_code && <ColorBadge color="#38bdf8">Dist. {s.distributor_code}</ColorBadge>}
                  <button type="button" onClick={() => handleToggleSupply(s.id, !s.is_active)} style={{
                    padding: '2px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 500,
                    background: s.is_active ? 'rgba(52,211,153,0.1)' : 'var(--btn-bg)',
                    color: s.is_active ? '#34d399' : 'var(--dim)',
                    border: `1px solid ${s.is_active ? 'rgba(52,211,153,0.25)' : 'var(--btn-border)'}`,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {s.is_active ? t('active') : t('inactive')}
                  </button>
                  <button type="button" onClick={() => handleDeleteSupply(s.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 14, lineHeight: 1, padding: '2px 4px', flexShrink: 0,
                  }} title={t('deleteSupply')}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={CARD}>
          <div style={SECTION_LABEL}>{t('priceNotifications')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={LABEL}>{t('pvpcThreshold')}</label>
              <input
                style={{ ...INPUT, fontFamily: 'var(--font-mono)', maxWidth: 160 }}
                value={pushThreshold}
                onChange={e => setPushThreshold(e.target.value)}
                placeholder={t('pvpcThresholdPlaceholder')}
                type="number"
                step="0.001"
                min="0"
              />
              <div style={{ fontSize: 10.5, color: 'var(--dim2)', marginTop: 4 }}>
                {t('notificationDesc')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                style={pushEnabled ? BTN_DEFAULT : BTN_PRIMARY}
                onClick={handlePushToggle}
                disabled={pushLoading}
              >
                {pushLoading && <Loader2 size={12} className="spin" />}
                {pushEnabled ? t('disableNotifications') : t('enableNotifications')}
              </button>
              {pushMsg && (
                <span style={{ fontSize: 12, color: pushMsg.ok ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {pushMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {pushMsg.text}
                </span>
              )}
            </div>
            {pushEnabled && !pushMsg && (
              <div style={{ fontSize: 11, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✓</span> {t('notificationsActive')}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--status-bg)', border: '1px solid var(--status-border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Info size={13} color="var(--dim)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: 'var(--dim2)', lineHeight: 1.65, margin: 0 }}>
            {t('datadisNote')}
          </p>
        </div>

        {/* Danger zone */}
        <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {t('dangerZone')}
          </div>
          <p style={{ fontSize: 11, color: 'var(--dim2)', lineHeight: 1.6, margin: '0 0 10px 0' }}>
            {t('deleteDataDesc')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleDeleteData}
              disabled={deleting}
            >
              {deleting && <Loader2 size={12} className="spin" />}
              {deleting ? t('deleting') : t('deleteData')}
            </button>
            {deleteMsg && (
              <span style={{ fontSize: 12, color: '#f87171' }}>{deleteMsg}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
