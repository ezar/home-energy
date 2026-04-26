import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(_req: NextRequest, { params }: { params: { size: string } }) {
  const dim = params.size === '512' ? 512 : 192
  const innerSize = Math.round(dim * 0.75)
  const br = Math.round(dim * 0.18)
  const fontSize = Math.round(dim * 0.43)

  return new ImageResponse(
    (
      <div
        style={{
          width: dim, height: dim,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#111114',
        }}
      >
        <div
          style={{
            width: innerSize, height: innerSize,
            borderRadius: br,
            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ color: '#0f0f11', fontSize, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1 }}>
            E
          </div>
        </div>
      </div>
    ),
    { width: dim, height: dim },
  )
}
