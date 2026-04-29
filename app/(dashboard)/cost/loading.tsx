import { SkeletonCard } from '@/components/layout/PageLoader'

export default function CostLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="g3">
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
      </div>
      <SkeletonCard height={200} />
      <SkeletonCard height={140} />
    </div>
  )
}
