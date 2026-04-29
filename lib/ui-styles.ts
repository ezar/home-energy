// Shared inline-style constants used across dashboard components.
// Keep in sync with globals.css custom properties.

export const CARD_STYLE: React.CSSProperties = {
  background: 'var(--card-grad)', border: '1px solid var(--border-c)',
  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
}

export const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
}

export const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, color: 'var(--muted-c)', fontWeight: 500, display: 'block', marginBottom: 5,
}

export const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 600, color: 'var(--dim)',
  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
}

export const BTN_DEFAULT_STYLE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'var(--btn-bg)', color: 'var(--btn-text)', border: '1px solid var(--btn-border)',
  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
}

export const BTN_PRIMARY_STYLE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#0f0f11',
  border: 'none', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
  boxShadow: '0 2px 12px rgba(245,158,11,0.3)', transition: 'all 0.15s',
}
