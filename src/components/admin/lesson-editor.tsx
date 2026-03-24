'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Save, Trash2 } from 'lucide-react'
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

interface Props {
  lesson: Lesson
  moduleId: string
  typeColors: Record<string, string>
  onToggle: () => Promise<void>
  onDelete: () => Promise<void>
  onSave: (title: string, contentJson: string, moduleId: string) => Promise<void>
}

export function LessonEditor({ lesson, moduleId, typeColors, onToggle, onDelete, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [contentJson, setContentJson] = useState(JSON.stringify(lesson.content, null, 2))
  const [jsonError, setJsonError] = useState('')
  const [isPending, startTransition] = useTransition()

  function validateJson(val: string) {
    try { JSON.parse(val); setJsonError(''); return true }
    catch { setJsonError('Invalid JSON'); return false }
  }

  function handleSave() {
    if (!validateJson(contentJson)) return
    startTransition(async () => {
      try {
        await onSave(title, contentJson, moduleId)
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
              disabled={isPending || !!jsonError}
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
