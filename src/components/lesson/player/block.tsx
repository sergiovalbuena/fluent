'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { HINT_AREA } from '@/components/lesson/title-hint'

// ─── Bento Block primitive ────────────────────────────────────────────────────
export type BlockProps = { className?: string; children?: React.ReactNode } & MotionProps

export const Block = ({ className, children, ...rest }: BlockProps) => (
  <motion.div
    variants={{
      initial: { scale: 0.5, y: 50, opacity: 0 },
      animate: { scale: 1, y: 0, opacity: 1 },
    }}
    transition={{ type: 'spring', mass: 3, stiffness: 400, damping: 50 }}
    whileTap={{ scale: 0.97 }}
    className={cn(
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638]',
      className
    )}
    {...HINT_AREA}
    {...rest}
  >
    {children}
  </motion.div>
)
