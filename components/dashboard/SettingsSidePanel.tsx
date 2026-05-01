'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Zap, Info, History } from 'lucide-react'
import type { UserSupplyRow } from '@/lib/supabase/types-helper'
import { ColorBadge } from '@/components/dashboard/PeriodBadge'
import { CARD_STYLE as CARD, LABEL_STYLE as LABEL, SECTION_LABEL_STYLE as SECTION_LABEL, BTN_DEFAULT_STYLE as BTN_DEFAULT, BTN_PRIMARY_STYLE as BTN_PRIMARY, INPUT_STYLE as INPUT } from '@/lib/ui-styles'

type LogEntry = { id: number; type: string; msg: string }

interface Props {
  lastSync: string | null
  profile: { last_sync_at?: string | null } | null
  localSupplies: UserSupplyRow[]
  syncLogs: LogEntry[]
  logBoxRef: React.RefObject<HTMLDivElement>
  syncingDatadis: boolean
  syncingPvpc: boolean
  pushEnabled: boolean
  pushLoading: boolean
  pushMsg: { ok: boolean; text: string } | null
  pushThreshold: string
  deleting: boolean
  deleteMsg: string | null
  onSyncDatadis: (months?: number) => void
  onSyncPvpc: () => void
  onToggleSupply: (id: string, isActive: boolean) => void
  onDeleteSupply: (id: string) => void
  onSetPushThreshold: (v: string) => void
  onPushToggle: () => void
  onDeleteData: () => void
}

const HISTORY_OPTIONS = [1, 3, 6, 12, 24] as const

export function SettingsSidePanel({
  lastSync, profile, localSupplies,
  syncLogs, logBoxRef, syncingDatadis, syncingPvpc,
  pushEnabled, pushLoading, pushMsg, pushThreshold,
  deleting, deleteMsg,
  onSyncDatadis, onSyncPvpc, onToggleSupply, onDeleteSupply,
  onSetPushThreshold, onPushToggle, onDeleteData,
}: Props) {
  const t = useTranslations('Settings')
  const tc = useTranslations('Common')
  const [historyMonths, setHistoryMonths] = useState<number>(12)

  const dataUpTo = profile?.last_sync_at
    ? new Date(profile.last_sync_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Sync status */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>{t('syncStatus')}</div>
        {[
          { label: t('lastSync'), val: lastSync ?? tc('never'), color: lastSync ? '#34d399' : 'var(--dim)' },
          { label: t('dataUpTo'), val: dataUpTo, color: 'var(--text-2)' },
          { label: t('nextAutoSync'), val: t('nextAutoSyncValue'), color: 'var(--dim)' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted-c)' }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: item.color }}>{item.val}</span>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button style={BTN_DEFAULT} onClick={() => onSyncDatadis()} disabled={syncingDatadis} type="button">
            {syncingDatadis ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
            {syncingDatadis ? t('reloading') : t('reloadDatadis')}
          </button>
          <button style={BTN_DEFAULT} onClick={onSyncPvpc} disabled={syncingPvpc} type="button">
            {syncingPvpc ? <Loader2 size={11} className="spin" /> : <Zap size={11} />}
            {syncingPvpc ? t('reloadingPvpc') : t('reloadPvpc')}
          </button>
        </div>

        {/* Historical load */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            {t('historyLoad')}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--dim2)', marginBottom: 10, lineHeight: 1.5 }}>
            {t('historyLoadNote')}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={historyMonths}
              onChange={e => setHistoryMonths(Number(e.target.value))}
              disabled={syncingDatadis}
              style={{
                padding: '5px 8px', borderRadius: 7, fontSize: 12, fontFamily: 'var(--font-sans)',
                background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              {HISTORY_OPTIONS.map(m => (
                <option key={m} value={m}>{t('historyOption', { months: m })}</option>
              ))}
            </select>
            <button
              style={BTN_DEFAULT}
              onClick={() => onSyncDatadis(historyMonths)}
              disabled={syncingDatadis}
              type="button"
            >
              {syncingDatadis ? <Loader2 size={11} className="spin" /> : <History size={11} />}
              {syncingDatadis ? t('reloading') : t('historyStart')}
            </button>
          </div>
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

      {/* Active supplies */}
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
                <button type="button" onClick={() => onToggleSupply(s.id, !s.is_active)} style={{
                  padding: '2px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 500,
                  background: s.is_active ? 'rgba(52,211,153,0.1)' : 'var(--btn-bg)',
                  color: s.is_active ? '#34d399' : 'var(--dim)',
                  border: `1px solid ${s.is_active ? 'rgba(52,211,153,0.25)' : 'var(--btn-border)'}`,
                  fontFamily: 'var(--font-sans)',
                }}>
                  {s.is_active ? t('active') : t('inactive')}
                </button>
                <button type="button" onClick={() => onDeleteSupply(s.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 14, lineHeight: 1, padding: '2px 4px', flexShrink: 0,
                }} title={t('deleteSupply')}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Push notifications */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>{t('priceNotifications')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={LABEL}>{t('pvpcThreshold')}</label>
            <input
              style={{ ...INPUT, fontFamily: 'var(--font-mono)', maxWidth: 160 }}
              value={pushThreshold}
              onChange={e => onSetPushThreshold(e.target.value)}
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
              onClick={onPushToggle}
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

      {/* Info note */}
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
            onClick={onDeleteData}
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
  )
}
