'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Lock, Check } from 'lucide-react'

export type PathNodeState = 'completed' | 'current' | 'available' | 'locked'

export type PathNode = {
  id: string
  slug: string
  title: string
  icon: string
  progress: number
  state: PathNodeState
  chapterLabel?: string // e.g. 'A1 · Beginner'
}

type Props = {
  nodes: PathNode[]
  languageName: string
  languageFlag: string
}

const LEVEL_LABELS = ['A1 · Beginner', 'A2 · Elementary', 'B1 · Intermediate']

// Progress ring around current node
function ProgressRing({ progress, size = 76 }: { progress: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 -rotate-90"
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,128,82,0.15)" strokeWidth={4} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#ff8052"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

function NodeButton({ node, index }: { node: PathNode; index: number }) {
  const isLeft = index % 2 === 0

  const nodeEl = (
    <div
      className={`relative flex flex-col items-center gap-2 ${
        isLeft ? 'translate-x-[-2.5rem] md:translate-x-[-4rem]' : 'translate-x-[2.5rem] md:translate-x-[4rem]'
      }`}
    >
      {/* Node circle */}
      <div className="relative">
        {node.state === 'current' && (
          <>
            {/* Pulsing outer ring */}
            <motion.div
              className="absolute inset-[-8px] rounded-full border-2 border-primary/30"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <ProgressRing progress={node.progress} size={76} />
          </>
        )}

        <motion.div
          whileHover={node.state !== 'locked' ? { scale: 1.08 } : {}}
          whileTap={node.state !== 'locked' ? { scale: 0.94 } : {}}
          transition={{ duration: 0.18 }}
          className={`size-[60px] rounded-[18px] flex items-center justify-center text-2xl relative shadow-md transition-shadow
            ${node.state === 'completed'
              ? 'bg-emerald-500 shadow-emerald-200 dark:shadow-emerald-900/40'
              : node.state === 'current'
              ? 'bg-primary shadow-primary/30'
              : node.state === 'available'
              ? 'bg-white dark:bg-[#2c1a12] border-2 border-primary/30 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 opacity-50'
            }`}
        >
          {node.state === 'completed' ? (
            <Check size={24} className="text-white" strokeWidth={3} />
          ) : node.state === 'locked' ? (
            <Lock size={20} className="text-slate-400" />
          ) : (
            <span>{node.icon}</span>
          )}
        </motion.div>
      </div>

      {/* Label */}
      <div className="text-center max-w-[100px]">
        <p className={`text-xs font-bold leading-tight ${
          node.state === 'locked' ? 'text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100'
        }`}>
          {node.title}
        </p>
        {node.state === 'current' && node.progress > 0 && (
          <p className="text-[10px] text-primary font-semibold mt-0.5">{node.progress}%</p>
        )}
        {node.state === 'completed' && (
          <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Done</p>
        )}
      </div>
    </div>
  )

  if (node.state === 'locked') return nodeEl

  return (
    <Link href={`/learn/${node.slug}`} className="focus:outline-none">
      {nodeEl}
    </Link>
  )
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] as const } },
}

export function PathMap({ nodes, languageName, languageFlag }: Props) {
  // Insert chapter separators every 4 real nodes
  type Item =
    | { type: 'node'; node: PathNode; index: number }
    | { type: 'chapter'; label: string }

  const items: Item[] = []
  let chapterIdx = 0

  nodes.forEach((node, i) => {
    if (i % 4 === 0) {
      items.push({ type: 'chapter', label: LEVEL_LABELS[chapterIdx] ?? `Level ${chapterIdx + 1}` })
      chapterIdx++
    }
    items.push({ type: 'node', node, index: i })
  })

  // 3 coming-soon locked placeholders at the end
  const comingSoon: PathNode[] = [
    { id: 'cs1', slug: '', title: 'Coming Soon', icon: '🔒', progress: 0, state: 'locked' },
    { id: 'cs2', slug: '', title: 'Coming Soon', icon: '🔒', progress: 0, state: 'locked' },
    { id: 'cs3', slug: '', title: 'Coming Soon', icon: '🔒', progress: 0, state: 'locked' },
  ]
  comingSoon.forEach((n, i) => {
    items.push({ type: 'node', node: n, index: nodes.length + i })
  })

  return (
    <motion.div
      className="flex flex-col items-center py-6 px-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Language header */}
      <motion.div variants={itemVariants} className="mb-8 text-center">
        <span className="text-4xl">{languageFlag}</span>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">{languageName} Path</p>
      </motion.div>

      {/* Trail */}
      <div className="relative w-full max-w-xs md:max-w-sm">
        {items.map((item, i) => {
          if (item.type === 'chapter') {
            return (
              <motion.div key={`chapter-${i}`} variants={itemVariants} className="flex items-center gap-3 my-5 px-2">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0">
                  {item.label}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </motion.div>
            )
          }

          const { node, index } = item
          const isLast = i === items.length - 1
          const isLeft = index % 2 === 0

          return (
            <motion.div
              key={node.id}
              variants={itemVariants}
              className="flex flex-col items-center"
            >
              {/* Node */}
              <div className="relative flex justify-center w-full py-1">
                <NodeButton node={node} index={index} />
              </div>

              {/* Connector — dotted line leading to next node */}
              {!isLast && (
                <div className="relative w-full flex justify-center my-1">
                  {/* Vertical dotted segment */}
                  <div
                    className="w-px h-10"
                    style={{
                      backgroundImage: `repeating-linear-gradient(
                        to bottom,
                        ${node.state === 'completed' ? '#86efac' : '#cbd5e1'} 0px,
                        ${node.state === 'completed' ? '#86efac' : '#cbd5e1'} 4px,
                        transparent 4px,
                        transparent 10px
                      )`,
                    }}
                  />
                  {/* Horizontal jog arrow hinting at next side */}
                  <div
                    className={`absolute bottom-0 w-8 h-px`}
                    style={{
                      backgroundImage: `repeating-linear-gradient(
                        to ${isLeft ? 'right' : 'left'},
                        #cbd5e1 0px,
                        #cbd5e1 4px,
                        transparent 4px,
                        transparent 10px
                      )`,
                      [isLeft ? 'left' : 'right']: '50%',
                    }}
                  />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
