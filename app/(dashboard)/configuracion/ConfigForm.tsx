'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Eye, EyeOff, RefreshCw, Zap, Info } from 'lucide-react'
import type { ProfileRow } from '@/lib/supabase/types-helper'
import type { DatadisSupply } from '@/lib/types/datadis'
import { ColorBadge } from '@/components/dashboard/PeriodBadge'

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

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncingDatadis, setSyncingDatadis] = useState(false)
  const [syncingPvpc, setSyncingPvpc] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; supplies?: DatadisSupply[]; error?: string } | null>(null)
  const [syncDatadisMsg, setSyncDatadisMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncPvpcMsg, setSyncPvpcMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
    setSyncDatadisMsg(null)
    try {
      const res = await fetch('/api/datadis/sync', { method: 'POST' })
      const data = await res.json()
      setSyncDatadisMsg(res.ok
        ? { ok: true, text: `${data.synced} registros sincronizados` }
        : { ok: false, text: data.error ?? 'Error al sincronizar' })
    } catch {
      setSyncDatadisMsg({ ok: false, text: 'Error de red' })
    } finally {
      setSyncingDatadis(false)
    }
  }

  async function handleSyncPvpc() {
    setSyncingPvpc(true)
    setSyncPvpcMsg(null)
    try {
      const res = await fetch('/api/pvpc/sync', { method: 'POST' })
      const data = await res.json()
      setSyncPvpcMsg(res.ok
        ? { ok: true, text: `${data.pvpcSynced} precios sincronizados` }
        : { ok: false, text: data.error ?? 'Error al sincronizar' })
    } catch {
      setSyncPvpcMsg({ ok: false, text: 'Error de red' })
    } finally {
      setSyncingPvpc(false)
    }
  }

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
              {syncingDatadis ? 'Recargando...' : 'Recargar Datadis'}
            </button>
            <button style={BTN_DEFAULT} onClick={handleSyncPvpc} disabled={syncingPvpc} type="button">
              {syncingPvpc ? <Loader2 size={11} className="spin" /> : <Zap size={11} />}
              {syncingPvpc ? 'Recargando...' : 'Recargar PVPC'}
            </button>
          </div>
          {syncDatadisMsg && (
            <p style={{ fontSize: 11, marginTop: 8, color: syncDatadisMsg.ok ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
              {syncDatadisMsg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {syncDatadisMsg.text}
            </p>
          )}
          {syncPvpcMsg && (
            <p style={{ fontSize: 11, marginTop: 4, color: syncPvpcMsg.ok ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
              {syncPvpcMsg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {syncPvpcMsg.text}
            </p>
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
            Datadis puede tener hasta <strong style={{ color: 'var(--muted-c)' }}>2 días de retraso</strong>. El cron automático se ejecuta a las <strong style={{ color: 'var(--muted-c)' }}>05:00</strong> y sincroniza los últimos 3 días.
          </p>
        </div>
      </div>
    </div>
  )
}
