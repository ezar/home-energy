import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Energy Dashboard',
    short_name: 'Energy',
    description: 'Monitor de consumo eléctrico doméstico',
    start_url: '/',
    display: 'standalone',
    background_color: '#111114',
    theme_color: '#111114',
    orientation: 'portrait-primary',
    categories: ['utilities'],
    icons: [
      {
        src: '/api/icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
