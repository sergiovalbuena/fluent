'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Send, RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
type Role = 'user' | 'assistant'
type Message = { role: Role; content: string; id: string }

// ── Quick-start prompts ────────────────────────────────────────────────────────
const STARTERS = [
  { emoji: '🛒', text: 'Practice ordering at a market' },
  { emoji: '🗺️', text: 'Ask for directions' },
  { emoji: '🍽️', text: 'Order food at a restaurant' },
  { emoji: '🤝', text: 'Introduce yourself' },
  { emoji: '🔄', text: 'Correct my last sentence' },
  { emoji: '💬', text: 'Free conversation' },
]

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', pt: 'Portuguese',
  de: 'German', it: 'Italian', ja: 'Japanese',
}

// ── Typing dots ────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-rose-300"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isUser && (
        <div
          className="size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
        >
          <Bot size={12} className="text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'text-white rounded-tr-sm'
            : 'bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100 rounded-tl-sm',
        )}
        style={isUser ? { background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' } : {}}
      >
        {message.content}
      </div>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MariaPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [languageCode, setLanguageCode] = useState('es')
  const [apiReady, setApiReady] = useState<boolean | null>(null) // null = unknown
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Load user's active language ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_languages')
        .select('language_code')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.language_code) setLanguageCode(data.language_code)
        })
    })
  }, [])

  // ── Initial greeting ─────────────────────────────────────────────────────────
  useEffect(() => {
    const langName = LANG_NAMES[languageCode] ?? 'your language'
    setMessages([{
      role: 'assistant',
      id: 'welcome',
      content: `¡Hola! I'm MarIA 👋 I'm here to help you practice ${langName}. You can chat freely, practice real-life scenarios, or ask me to correct your sentences. What would you like to do today?`,
    }])
  }, [languageCode])

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Send message ─────────────────────────────────────────────────────────────
  async function sendMessage(text: string) {
    const userText = text.trim()
    if (!userText || loading) return

    const userMsg: Message = { role: 'user', content: userText, id: Date.now().toString() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    // Resize textarea
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/maria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          languageCode,
        }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setApiReady(false)
        setMessages(prev => [...prev, {
          role: 'assistant',
          id: Date.now().toString(),
          content: err.error ?? 'Something went wrong. Please try again.',
        }])
        setLoading(false)
        return
      }

      setApiReady(true)

      // Stream response
      const assistantId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, { role: 'assistant', id: assistantId, content: '' }])
      setLoading(false)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value)
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          ))
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        id: Date.now().toString(),
        content: 'Connection error. Please check your internet and try again.',
      }])
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  function resetChat() {
    const langName = LANG_NAMES[languageCode] ?? 'your language'
    setMessages([{
      role: 'assistant',
      id: 'welcome-' + Date.now(),
      content: `¡Hola! I'm MarIA 👋 I'm here to help you practice ${langName}. What would you like to do today?`,
    }])
    setInput('')
  }

  const langName = LANG_NAMES[languageCode] ?? 'Language'
  const hasMessages = messages.length > 1

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="MarIA" />

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-3 md:px-5 py-4 gap-3">

        {/* ── Header card ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl overflow-hidden border border-black/[0.04] dark:border-white/[0.05]"
          style={{ background: 'linear-gradient(160deg, #4c0519 0%, #881337 50%, #be123c 100%)' }}
        >
          <div className="relative p-5 flex items-center gap-4">
            {/* Glow */}
            <div className="absolute -top-8 -right-8 size-32 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="size-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Bot size={22} className="text-white" />
              </div>
              {/* Pulse */}
              <motion.div
                className="absolute -inset-1 rounded-[18px] border border-white/25"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">MarIA</h2>
                <span className="flex items-center gap-1 text-[10px] font-bold text-white/60 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full">
                  <Sparkles size={8} />
                  AI Tutor
                </span>
              </div>
              <p className="text-xs text-white/55 mt-0.5">
                Practicing <span className="text-white/80 font-semibold">{langName}</span> · Ask me anything
              </p>
            </div>
            <button
              onClick={resetChat}
              className="shrink-0 size-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors"
              title="New conversation"
            >
              <RotateCcw size={14} className="text-white/70" />
            </button>
          </div>

          {/* API not ready banner */}
          {apiReady === false && (
            <div className="mx-4 mb-4 px-4 py-2.5 bg-yellow-500/20 border border-yellow-400/30 rounded-xl">
              <p className="text-xs text-yellow-200 font-medium">
                ⚠️ Add <code className="font-mono bg-black/20 px-1 rounded">OPENAI_API_KEY</code> to <code className="font-mono bg-black/20 px-1 rounded">.env.local</code> to enable AI chat.
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Chat window ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex-1 flex flex-col rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#2c1a12] overflow-hidden min-h-[400px]"
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <Bubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-2 items-center">
                <div
                  className="size-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
                >
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-white/[0.07] rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick starters — show when only welcome message */}
          {!hasMessages && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Quick start</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STARTERS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => void sendMessage(s.text)}
                    className="flex items-center gap-2 text-left px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] hover:bg-primary/5 dark:hover:bg-primary/10 border border-black/[0.04] dark:border-white/[0.05] transition-colors"
                  >
                    <span className="text-base">{s.emoji}</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-tight">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="px-4 pb-4 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-white/[0.04] rounded-2xl px-3 py-2 border border-black/[0.05] dark:border-white/[0.06]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type in any language… (Enter to send)"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none py-1 leading-relaxed max-h-[120px] overflow-y-auto"
              />
              <button
                onClick={() => void sendMessage(input)}
                disabled={!input.trim() || loading}
                className="shrink-0 size-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mt-1.5">
              Shift+Enter for new line · MarIA may make mistakes
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
