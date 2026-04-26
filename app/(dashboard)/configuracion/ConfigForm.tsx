'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Eye, EyeOff, RefreshCw, Zap, Info } from 'lucide-react'
import type { ProfileRow } from '@/lib/supabase/types-helper'
import type { DatadisSupply } from '@/lib/types/datadis'
import { ColorBadge } from '@/components/dashboard/PeriodBadge'

type LogEntry = { id: number; type: string; msg: string }

interface ConfigFormProps {
  profile: ProfileRow | null
}

const LABEL: React.CSSProperties = { fontSize: 11, color: 'var(--muted-c)', fontWeight: 500, display: 'block', marginBottom: 5 }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
}
const CARD: React.CSSProperties = {
  background: 'var(--card-grad)', border: '1px solid var(--border-c)',
  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
}
const BTN_DEFAULT: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'var(--btn-bg)', color: 'var(--btn-text)', border: '1px solid var(--btn-border)',
  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
}
const BTN_PRIMARY: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#0f0f11',
  border: 'none', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
  boxShadow: '0 2px 12px rgba(245,158,11,0.3)', transition: 'all 0.15s',
}
const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 600, color: 'var(--dim)',
  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
}

export function ConfigForm({ profile }: ConfigFormProps) {
  const supabase = createClient()

  const [datadisUsername, setDatadisUsername] = useState(profile?.datadis_username ?? '')
  const [datadisPassword, setDatadisPassword] = useState('')
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

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncingDatadis, setSyncingDatadis] = useState(false)
  const [syncingPvpc, setSyncingPvpc] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; supplies?: DatadisSupply[]; error?: string } | null>(null)
  const [syncLogs, setSyncLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)
  const logBoxRef = useRef<HTMLDivElement>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)

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
    }
    if (datadisPassword) updates.datadis_password_encrypted = datadisPassword

    const { error } = await (supabase as any)
      .from('profiles').update(updates).eq('id', profile?.id ?? '')

    if (error) {
      setSaveMsg({ ok: false, text: (error as { message: string }).message })
    } else {
      setSaveMsg({ ok: true, text: 'Guardado' })
      setDatadisPassword('')
    }
    setSaving(false)
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/datadis/supplies')
      const data = await res.json()
      setTestResult(res.ok ? { ok: true, supplies: data.supplies ?? [] } : { ok: false, error: data.error ?? 'Error de conexión' })
    } catch {
      setTestResult({ ok: false, error: 'Error de red' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSyncDatadis() {
    setSyncingDatadis(true)
    setSyncLogs([])
    try {
      const res = await fetch('/api/datadis/sync', { method: 'POST' })
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
    } catch {
      setSyncLogs(prev => [...prev, { id: ++logIdRef.current, type: 'error', msg: 'Error de red' }])
    } finally {
      setSyncingDatadis(false)
    }
  }

  async function handleSyncPvpc() {
    setSyncingPvpc(true)
    setSyncLogs([])
    try {
      const res = await fetch('/api/pvpc/sync', { method: 'POST' })
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
    } catch {
      setSyncLogs(prev => [...prev, { id: ++logIdRef.current, type: 'error', msg: 'Error de red' }])
    } finally {
      setSyncingPvpc(false)
    }
  }

  // Auto-scroll log box to bottom on new entries
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
    }
  }, [syncLogs])

  const lastSync = profile?.last_sync_at
    ? new Date(profile.last_sync_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="g2" style={{ gap: 14 }}>
      {/* LEFT: form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={CARD}>
          <div style={SECTION_LABEL}>Perfil</div>
          <div>
            <label style={LABEL}>Nombre</label>
            <input style={INPUT} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tu nombre" />
          </div>
        </div>

        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={SECTION_LABEL as React.CSSProperties}>Credenciales Datadis</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--dim)', marginBottom: 12 }}>
              <ShieldCheck size={11} /> Solo en el servidor
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="g2" style={{ gap: 10 }}>
              <div>
                <label style={LABEL}>NIF / Usuario</label>
                <input style={INPUT} value={datadisUsername} onChange={e => setDatadisUsername(e.target.value)} placeholder="12345678A" autoComplete="off" />
              </div>
              <div>
                <label style={LABEL}>
                  Contraseña
                  {profile?.datadis_password_encrypted && <span style={{ color: 'var(--dim)', fontWeight: 400, marginLeft: 6 }}>(guardada)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...INPUT, paddingRight: 36 }}
                    type={showPassword ? 'text' : 'password'}
                    value={datadisPassword}
                    onChange={e => setDatadisPassword(e.target.value)}
                    placeholder={profile?.datadis_password_encrypted ? '••••••••' : 'Nueva contraseña'}
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
              <label style={LABEL}>NIF autorizado (opcional)</label>
              <input style={INPUT} value={authorizedNif} onChange={e => setAuthorizedNif(e.target.value)} placeholder="Solo si no eres el titular del contrato" autoComplete="off" />
            </div>
          </div>
        </div>

        <div style={CARD}>
          <div style={SECTION_LABEL}>Suministro</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="g2" style={{ gap: 10 }}>
              <div>
                <label style={LABEL}>CUPS</label>
                <input style={{ ...INPUT, fontFamily: 'var(--font-mono)', fontSize: 11 }} value={cups} onChange={e => setCups(e.target.value)} placeholder="ES0021000XXXXXXXXX" autoComplete="off" />
              </div>
              <div>
                <label style={LABEL}>Código distribuidora</label>
                <input style={INPUT} value={distributorCode} onChange={e => setDistributorCode(e.target.value)} placeholder="0022, 0023…" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={BTN_DEFAULT} onClick={handleTestConnection} disabled={testing || !datadisUsername}>
                {testing ? <Loader2 size={12} className="spin" /> : null}
                {testing ? 'Verificando...' : 'Verificar conexión'}
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
                    <div style={{ marginBottom: 6 }}>✓ Conexión OK · {testResult.supplies?.length ?? 0} suministro(s)</div>
                    {testResult.supplies?.map(s => (
                      <div key={s.cups} style={{ fontSize: 11, padding: '8px', background: 'var(--bg-inset)', borderRadius: 6, marginTop: 6 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{s.cups}</div>
                        <div style={{ color: 'var(--muted-c)', marginBottom: 4 }}>{s.address}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <ColorBadge color="#38bdf8">Dist. {s.distributorCode}</ColorBadge>
                          <ColorBadge color="#fbbf24">Tipo {s.pointType}</ColorBadge>
                        </div>
                      </div>
                    ))}
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
          <div style={SECTION_LABEL}>Tarifa eléctrica</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {(['pvpc', 'fixed'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTariffType(t)} style={{
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: tariffType === t ? 'rgba(245,158,11,0.12)' : 'var(--btn-bg)',
                color: tariffType === t ? 'var(--nav-active-text)' : 'var(--btn-text)',
                border: `1px solid ${tariffType === t ? 'rgba(245,158,11,0.25)' : 'var(--btn-border)'}`,
                fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
              }}>
                {t === 'pvpc' ? 'PVPC (variable)' : 'Tarifa fija'}
              </button>
            ))}
          </div>

          {tariffType === 'fixed' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>Precio por período (€/kWh)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'P1 Punta (10–14h y 18–22h lab.)', val: priceP1, set: setPriceP1, color: '#f87171' },
                  { label: 'P2 Llano', val: priceP2, set: setPriceP2, color: '#fbbf24' },
                  { label: 'P3 Valle (noches y fines de semana)', val: priceP3, set: setPriceP3, color: '#34d399' },
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
              Potencia contratada <span style={{ color: 'var(--dim2)' }}>(opcional — para calcular el término de potencia en la factura)</span>
            </div>
            <div className="g2" style={{ gap: 10 }}>
              <div>
                <label style={LABEL}>Potencia (kW)</label>
                <input style={{ ...INPUT, fontFamily: 'var(--font-mono)' }} value={powerKw} onChange={e => setPowerKw(e.target.value)} placeholder="4.6" type="number" step="0.1" min="0" />
              </div>
              <div>
                <label style={LABEL}>Precio (€/kW/mes)</label>
                <input style={{ ...INPUT, fontFamily: 'var(--font-mono)' }} value={powerPriceKwMonth} onChange={e => setPowerPriceKwMonth(e.target.value)} placeholder="3.17" type="number" step="0.01" min="0" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="submit" style={BTN_PRIMARY} disabled={saving}>
            {saving && <Loader2 size={12} className="spin" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
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
          <div style={SECTION_LABEL}>Estado de sincronización</div>
          {[
            { label: 'Última sync', val: lastSync ?? 'Nunca', color: lastSync ? '#34d399' : 'var(--dim)' },
            { label: 'Datos hasta', val: profile?.last_sync_at ? new Date(profile.last_sync_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—', color: 'var(--text-2)' },
            { label: 'Próxima sync automática', val: 'Diaria a las 05:00', color: 'var(--dim)' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted-c)' }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: item.color }}>{item.val}</span>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button style={BTN_DEFAULT} onClick={handleSyncDatadis} disabled={syncingDatadis} type="button">
              {syncingDatadis ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
              {syncingDatadis ? 'Sincronizando...' : 'Recargar Datadis'}
            </button>
            <button style={BTN_DEFAULT} onClick={handleSyncPvpc} disabled={syncingPvpc} type="button">
              {syncingPvpc ? <Loader2 size={11} className="spin" /> : <Zap size={11} />}
              {syncingPvpc ? 'Recargando...' : 'Recargar PVPC'}
            </button>
          </div>

          {/* Log en tiempo real */}
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
                  <span>Esperando respuesta...</span>
                </div>
              )}
            </div>
          )}

        </div>

        {profile?.cups && (
          <div style={CARD}>
            <div style={SECTION_LABEL}>Suministros detectados</div>
            <div style={{ padding: '12px', background: 'var(--bg-inset)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d39960' }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500 }}>Suministro principal</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--dim)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginBottom: 8 }}>
                {profile.cups}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {profile.distributor_code && <ColorBadge color="#38bdf8">Dist. {profile.distributor_code}</ColorBadge>}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--status-bg)', border: '1px solid var(--status-border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Info size={13} color="var(--dim)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: 'var(--dim2)', lineHeight: 1.65, margin: 0 }}>
            Datadis puede tener hasta <strong style={{ color: 'var(--muted-c)' }}>2 días de retraso</strong> y limita a <strong style={{ color: 'var(--muted-c)' }}>~1 petición/día</strong> por endpoint. Si ves error 429, espera 24h. El cron automático se ejecuta a las <strong style={{ color: 'var(--muted-c)' }}>05:00</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
