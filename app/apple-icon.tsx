import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180, height: 180,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#111114',
      }}
    >
      <div style={{
        width: 136, height: 136,
        borderRadius: 32,
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#0f0f11', fontSize: 78, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1 }}>E</div>
      </div>
    </div>,
    { ...size },
  )
}
