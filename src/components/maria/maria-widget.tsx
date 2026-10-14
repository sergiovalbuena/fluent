'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowUp, RotateCcw, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const MARIA_GRADIENT = 'linear-gradient(135deg, #be123c 0%, #db2777 100%)'

// Pages where the floating bubble would be redundant or in the way
const HIDDEN_ON = ['/maria', '/onboarding']

function MariaAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full text-white shadow-sm"
      style={{ width: size, height: size, background: MARIA_GRADIENT }}
    >
      <Sparkles size={size * 0.45} />
    </span>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-rose-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  )
}

/** Module open in /learn/<slug>/<activity>, used for the header and suggestions */
function useLessonOnScreen(pathname: string, languageCode: string) {
  const match = pathname.match(/^\/learn\/([\w-]+)(?:\/([\w-]+))?/)
  const slug = match?.[1] ?? null
  const activity = match?.[2] ?? null
  const [lesson, setLesson] = useState<{ slug: string; title: string; number: number } | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    createClient()
      .from('modules')
      .select('title, order_index')
      .eq('slug', slug)
      .eq('language_code', languageCode)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setLesson({ slug, title: data.title, number: data.order_index })
      })
    return () => { cancelled = true }
  }, [slug, languageCode])

  return { lesson: slug && lesson?.slug === slug ? lesson : null, activity }
}

export function MariaWidget() {
  const t = useTranslations('maria')
  const locale = useLocale()
  const pathname = usePathname()
  const { languageCode, translationLang } = useActiveLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { lesson } = useLessonOnScreen(pathname, languageCode)

  const languageName = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }).of(languageCode) ?? languageCode,
    [locale, languageCode],
  )

  // Esc closes; focus the input when opening
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => inputRef.current?.focus(), 150)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(id); window.removeEventListener('keydown', onKey) }
  }, [open])

  if (HIDDEN_ON.some(p => pathname.startsWith(p))) return null

  const suggestions = lesson
    ? [t('s_grammar'), t('s_examples'), t('s_quiz'), t('s_pronounce')]
    : [t('s_conversation'), t('s_word'), t('s_correct')]

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    const replyId = crypto.randomUUID()
    try {
      const res = await fetch('/api/maria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          languageCode,
          explainLanguage: translationLang,
          path: pathname,
        }),
      })
      if (!res.ok || !res.body) {
        const msg = res.status === 503 ? t('error_config') : t('error_generic')
        setMessages(prev => [...prev, { id: replyId, role: 'assistant', content: msg }])
        return
      }
      setMessages(prev => [...prev, { id: replyId, role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m => (m.id === replyId ? { ...m, content: m.content + chunk } : m)))
      }
    } catch {
      setMessages(prev => [...prev.filter(m => m.id !== replyId), { id: replyId, role: 'assistant', content: t('error_generic') }])
    } finally {
      setLoading(false)
    }
  }

  const waitingFirstToken = loading && messages.at(-1)?.role === 'user'

  return (
    <>
      {/* Floating bubble */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="maria-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            aria-label={t('fab_label')}
            title={t('fab_label')}
            className="group fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6 size-14 rounded-full text-white flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(219,39,119,0.65)]"
            style={{ background: MARIA_GRADIENT }}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: MARIA_GRADIENT }}
              animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <Sparkles size={24} className="relative" />
            <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 hidden md:block">
              {t('fab_label')}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.section
            key="maria-panel"
            role="dialog"
            aria-label="MarIA"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed z-50 flex flex-col overflow-hidden rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1c2131] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]
              inset-x-2 top-16 bottom-24 md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[min(640px,calc(100vh-6rem))]"
          >
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: MARIA_GRADIENT }}>
              <span className="size-9 rounded-full bg-white/20 flex items-center justify-center"><Sparkles size={18} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">MarIA</p>
                <p className="text-[11px] text-white/80 truncate">
                  {lesson ? `${t('lesson_context', { n: String(lesson.number).padStart(2, '0') })} · ${lesson.title}` : t('subtitle', { language: languageName })}
                </p>
              </div>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} aria-label={t('new_chat')} title={t('new_chat')} className="size-8 rounded-full hover:bg-white/15 flex items-center justify-center">
                  <RotateCcw size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label={t('close')} className="size-8 rounded-full hover:bg-white/15 flex items-center justify-center">
                <X size={17} />
              </button>
            </header>

            {/* Conversation */}
            <MessageScrollerProvider autoScroll defaultScrollPosition="end" scrollPreviousItemPeek={48}>
              <MessageScroller className="flex-1">
                <MessageScrollerViewport className="px-4">
                  <MessageScrollerContent className="gap-4 py-4" aria-busy={loading}>
                    {/* Greeting + suggestions */}
                    <MessageScrollerItem messageId="greeting">
                      <Message>
                        <MessageAvatar className="self-start bg-transparent"><MariaAvatar /></MessageAvatar>
                        <MessageContent>
                          <div className="w-fit rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-white/[0.07] px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                            {lesson ? t('greeting_lesson', { lesson: lesson.title }) : t('greeting', { language: languageName })}
                          </div>
                          {messages.length === 0 && (
                            <div className="flex flex-wrap gap-2">
                              {suggestions.map(s => (
                                <button
                                  key={s}
                                  onClick={() => send(s)}
                                  className="rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-3 py-1.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/15 transition-colors"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>

                    {messages.map(m => (
                      <MessageScrollerItem key={m.id} messageId={m.id} scrollAnchor={m.role === 'user'}>
                        <Message align={m.role === 'user' ? 'end' : 'start'}>
                          {m.role === 'assistant' && <MessageAvatar className="self-start bg-transparent"><MariaAvatar /></MessageAvatar>}
                          <MessageContent>
                            <div
                              className={cn(
                                'max-w-[85%] w-fit rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                                m.role === 'user'
                                  ? 'rounded-br-sm text-white'
                                  : 'rounded-tl-sm bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100',
                              )}
                              style={m.role === 'user' ? { background: MARIA_GRADIENT } : undefined}
                            >
                              {m.content || <TypingDots />}
                            </div>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ))}

                    {waitingFirstToken && (
                      <MessageScrollerItem messageId="typing">
                        <Message>
                          <MessageAvatar className="self-start bg-transparent"><MariaAvatar /></MessageAvatar>
                          <MessageContent>
                            <div className="w-fit rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-white/[0.07] px-3.5 py-2"><TypingDots /></div>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>

            {/* Composer */}
            <form
              onSubmit={e => { e.preventDefault(); void send(input) }}
              className="flex items-end gap-2 border-t border-black/[0.06] dark:border-white/[0.06] p-3"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input) }
                }}
                rows={1}
                maxLength={2000}
                placeholder={t('placeholder')}
                className="flex-1 max-h-32 resize-none rounded-2xl bg-slate-100 dark:bg-white/[0.06] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40 [field-sizing:content]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label={t('send')}
                className="size-10 shrink-0 rounded-full text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
                style={{ background: MARIA_GRADIENT }}
              >
                <ArrowUp size={18} strokeWidth={2.6} />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )
}
