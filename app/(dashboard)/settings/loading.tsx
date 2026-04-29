import { SkeletonCard } from '@/components/layout/PageLoader'

export default function SettingsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonCard height={100} />
      <SkeletonCard height={220} />
      <SkeletonCard height={160} />
      <SkeletonCard height={120} />
    </div>
  )
}
