import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(_req: NextRequest, { params }: { params: { size: string } }) {
  const dim = params.size === '512' ? 512 : 192
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #1a1a1f, #111114)',
          borderRadius: `${Math.round(dim * 0.22)}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 512 512" width={dim * 0.65} height={dim * 0.65} fill="none">
          <path d="M296 72L144 280h96l-40 160 168-192h-96L296 72z" fill="#f59e0b" />
        </svg>
      </div>
    ),
    { width: dim, height: dim },
  )
}
