import { SkeletonCard } from '@/components/layout/PageLoader'

export default function PvpcLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="g3">
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
        <SkeletonCard height={88} />
      </div>
      <SkeletonCard height={280} />
      <div className="g2">
        <SkeletonCard height={140} />
        <SkeletonCard height={140} />
      </div>
    </div>
  )
}
