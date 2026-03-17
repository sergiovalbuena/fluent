'use client'

import { useEffect, useRef } from 'react'
import { animate, useInView } from 'framer-motion'

interface StatProps {
  num: number
  suffix: string
  decimals?: number
  subheading: string
}

const Stat = ({ num, suffix, decimals = 0, subheading }: StatProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    animate(0, num, {
      duration: 2.5,
      onUpdate(value) {
        if (!ref.current) return
        ref.current.textContent = value.toFixed(decimals)
      },
    })
  }, [num, decimals, isInView])

  return (
    <div className="flex w-64 flex-col items-center py-8 sm:py-0">
      <p className="mb-2 text-center text-4xl md:text-5xl font-bold text-primary">
        <span ref={ref} />
        {suffix}
      </p>
      <p className="max-w-44 text-center text-sm text-slate-500 dark:text-slate-400 font-medium leading-snug">
        {subheading}
      </p>
    </div>
  )
}

export function CountUpStats() {
  return (
    <section className="border-y border-primary/10 bg-white/50 dark:bg-slate-800/20">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <p className="mb-10 md:mb-16 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          Built for learners who want{' '}
          <span className="text-primary">real results</span>
        </p>
        <div className="flex flex-col items-center justify-center sm:flex-row">
          <Stat
            num={8}
            suffix="+"
            subheading="Languages available with more launching soon"
          />
          <div className="h-px w-12 bg-primary/20 sm:h-16 sm:w-px" />
          <Stat
            num={10}
            suffix=" min"
            subheading="Per day is all you need to build real fluency"
          />
          <div className="h-px w-12 bg-primary/20 sm:h-16 sm:w-px" />
          <Stat
            num={50}
            suffix="+"
            subheading="Modules covering vocabulary, phrases and stories"
          />
          <div className="h-px w-12 bg-primary/20 sm:h-16 sm:w-px" />
          <Stat
            num={88}
            suffix="%"
            subheading="Average accuracy rate among active learners"
          />
        </div>
      </div>
    </section>
  )
}
