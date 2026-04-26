import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%', height: '100%',
        background: '#111114',
        borderRadius: '22%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
        <path d="M19 4L9 18h7l-3 10 13-14h-7L19 4z" fill="#f59e0b" />
      </svg>
    </div>,
    { ...size },
  )
}
