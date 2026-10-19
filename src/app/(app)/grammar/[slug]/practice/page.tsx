import { Suspense } from 'react'
import { GrammarPractice } from '@/components/grammar/grammar-practice'

export default function GrammarPracticePage() {
  // useSearchParams (?ex=…) needs a Suspense boundary
  return (
    <Suspense>
      <GrammarPractice />
    </Suspense>
  )
}
