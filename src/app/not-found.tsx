'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Noise texture via inline SVG — no external file needed
const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

function FuzzyOverlay() {
  return (
    <motion.div
      initial={{ x: '-10%', y: '-10%' }}
      animate={{ x: '10%', y: '10%' }}
      transition={{ repeat: Infinity, duration: 0.2, ease: 'linear', repeatType: 'mirror' }}
      style={{ backgroundImage: NOISE, willChange: 'transform' }}
      className="pointer-events-none absolute -inset-[20%] opacity-[8%]"
    />
  )
}

export default function NotFound() {
  return (
    <div className="relative overflow-hidden min-h-screen bg-[#1c0e09] flex flex-col items-center justify-center px-6">
      <FuzzyOverlay />

      <div className="relative z-10 flex flex-col items-center text-center gap-0">
        {/* Brand mark */}
        <div className="size-11 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg mb-10 shadow-[0_4px_0_#c4612e]">
          F
        </div>

        {/* 404 */}
        <h1
          className="font-black leading-none select-none tabular-nums text-white"
          style={{ fontSize: 'clamp(7rem, 28vw, 16rem)' }}
        >
          <span className="text-primary">4</span>
          <span>0</span>
          <span className="text-primary">4</span>
        </h1>

        {/* Glow under the number */}
        <div
          className="w-48 h-4 rounded-full blur-2xl opacity-40 -mt-4 mb-8"
          style={{ background: '#ff8052' }}
        />

        {/* Message */}
        <p className="text-lg font-bold text-white">Lost in translation</p>
        <p className="text-sm text-white/35 mt-2 max-w-[22rem] leading-relaxed">
          This page doesn't exist in any language we know.
        </p>

        {/* CTA */}
        <Link href="/dashboard" className="mt-8">
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97, y: 2 }}
            className="flex items-center gap-2 bg-primary text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-[0_5px_0_#c4612e]"
          >
            <ArrowLeft size={15} />
            Back to learning
          </motion.button>
        </Link>
      </div>
    </div>
  )
}
