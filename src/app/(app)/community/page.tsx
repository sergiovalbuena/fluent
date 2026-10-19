import { Suspense } from 'react'
import { CommunityContent } from '@/components/community/community-content'

export default function CommunityPage() {
  // useSearchParams (?code=… from an invite link) needs a Suspense boundary
  return (
    <Suspense>
      <CommunityContent />
    </Suspense>
  )
}
