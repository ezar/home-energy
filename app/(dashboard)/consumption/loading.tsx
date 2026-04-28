import { SkeletonCard } from '@/components/layout/PageLoader'

export default function ConsumptionLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonCard height={44} />
      <div className="g4">
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
      </div>
      <SkeletonCard height={260} />
      <SkeletonCard height={120} />
    </div>
  )
}
