import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #1a1a1f, #111114)',
        borderRadius: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 180 180" width="120" height="120" fill="none">
        <path d="M108 24L52 100h40l-18 56 74-80H108L108 24z" fill="#f59e0b" />
      </svg>
    </div>,
    { ...size },
  )
}
