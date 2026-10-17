import { Suspense } from 'react'
import { VerbPractice } from '@/components/verbs/verb-practice'

export default function VerbPracticePage() {
  // useSearchParams (?verb=…) needs a Suspense boundary
  return (
    <Suspense>
      <VerbPractice />
    </Suspense>
  )
}
