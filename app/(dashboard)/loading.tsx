import { SkeletonCard } from '@/components/layout/PageLoader'

export default function HomeLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="g4">
        <SkeletonCard height={110} />
        <SkeletonCard height={110} />
        <SkeletonCard height={110} />
        <SkeletonCard height={110} />
      </div>
      <div className="g2">
        <SkeletonCard height={130} />
        <SkeletonCard height={130} />
      </div>
      <SkeletonCard height={180} />
    </div>
  )
}
