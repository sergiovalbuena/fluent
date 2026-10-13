'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Save, Trash2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Lesson = {
  id: string
  title: string
  type: string
  content: Record<string, unknown>
  order_index: number
  is_published: boolean
}

type VocabWord = { word: string; translation: string; icon?: string }

interface Props {
  lesson: Lesson
  moduleId: string
  typeColors: Record<string, string>
  onToggle: () => Promise<void>
  onDelete: () => Promise<void>
  onSave: (title: string, contentJson: string, moduleId: string) => Promise<void>
}

function parseWords(content: Record<string, unknown>): VocabWord[] {
  const items = (content as { items?: unknown }).items
  if (!Array.isArray(items)) return []
  return items.filter(
    (i): i is VocabWord => typeof i === 'object' && i !== null && typeof (i as VocabWord).word === 'string'
  )
}

export function LessonEditor({ lesson, moduleId, typeColors, onToggle, onDelete, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const isVocab = lesson.type === 'vocabulary'

  const [words, setWords] = useState<VocabWord[]>(() => parseWords(lesson.content))
  const [contentJson, setContentJson] = useState(JSON.stringify(lesson.content, null, 2))
  const [jsonError, setJsonError] = useState('')
  const [isPending, startTransition] = useTransition()

  function validateJson(val: string) {
    try { JSON.parse(val); setJsonError(''); return true }
    catch { setJsonError('Invalid JSON'); return false }
  }

  function updateWord(i: number, field: 'word' | 'translation', value: string) {
    setWords(pv => pv.map((w, idx) => idx === i ? { ...w, [field]: value } : w))
  }

  function removeWord(i: number) {
    setWords(pv => pv.filter((_, idx) => idx !== i))
  }

  function addWord() {
    setWords(pv => [...pv, { word: '', translation: '' }])
  }

  function handleSave() {
    // Keep other content keys and drop rows left blank
    const items = words.filter(w => w.word.trim() && w.translation.trim())
    const json = isVocab ? JSON.stringify({ ...lesson.content, items }) : contentJson
    if (!isVocab && !validateJson(json)) return
    startTransition(async () => {
      try {
        await onSave(title, json, moduleId)
        toast.success('Lesson saved')
      } catch {
        toast.error('Failed to save lesson')
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        await onDelete()
        toast.success('Lesson deleted')
      } catch {
        toast.error('Failed to delete lesson')
      }
    })
  }

  return (
    <div className="group">
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs text-slate-400 w-6 text-center tabular-nums">{lesson.order_index}</span>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide', typeColors[lesson.type] ?? 'bg-slate-100 text-slate-500')}>
          {lesson.type}
        </span>
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">{lesson.title}</span>
        {isVocab && (
          <span className="text-xs text-slate-400 tabular-nums hidden sm:inline">{words.length} words</span>
        )}

        {/* Published indicator */}
        <form onSubmit={e => { e.stopPropagation() }} onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => startTransition(() => onToggle())}
            className="flex items-center gap-1.5 text-xs"
          >
            <span className={`size-2 rounded-full ${lesson.is_published ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-slate-400 hidden sm:inline">{lesson.is_published ? 'Live' : 'Draft'}</span>
          </button>
        </form>

        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </div>

      {/* Expanded editor */}
      {open && (
        <div className="px-5 pb-4 border-t border-slate-50 bg-slate-50/50 space-y-3">
          <div className="pt-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-orange-400"
            />
          </div>

          {isVocab ? (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                Words ({words.length})
              </label>
              <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                {words.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No words yet. Add one below.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {words.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2">
                        <input
                          value={w.word}
                          onChange={e => updateWord(i, 'word', e.target.value)}
                          placeholder="Word (e.g. La casa)"
                          className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
                        />
                        <input
                          value={w.translation}
                          onChange={e => updateWord(i, 'translation', e.target.value)}
                          placeholder="Translation (e.g. The house)"
                          className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
                        />
                        <button
                          type="button"
                          onClick={() => removeWord(i)}
                          className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addWord}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-400 hover:text-orange-500 border-t border-slate-100 transition-colors"
                >
                  <Plus size={13} /> Add word
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                Content JSON
              </label>
              <textarea
                value={contentJson}
                onChange={e => { setContentJson(e.target.value); validateJson(e.target.value) }}
                rows={12}
                spellCheck={false}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-xs font-mono text-slate-700 bg-white focus:outline-none resize-y',
                  jsonError ? 'border-red-400' : 'border-slate-200 focus:border-orange-400'
                )}
              />
              {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
            >
              <Trash2 size={13} /> Delete lesson
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || (!isVocab && !!jsonError)}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              <Save size={13} />
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
