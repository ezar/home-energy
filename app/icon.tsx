import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        borderRadius: 8,
      }}
    >
      <div style={{ color: '#0f0f11', fontSize: 18, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1 }}>E</div>
    </div>,
    { ...size },
  )
}
