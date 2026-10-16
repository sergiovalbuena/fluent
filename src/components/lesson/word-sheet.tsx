import { cn } from '@/lib/utils'

export interface WordSheetEntry {
  word: string
  translation: string
}

/** Every word of a lesson at a glance, in columns — for reading and copying by hand */
export function WordSheet({ words, className, zoom = 1 }: { words: WordSheetEntry[]; className?: string; zoom?: number }) {
  return (
    <ol className={cn('columns-1 sm:columns-2 lg:columns-3 gap-x-8', className)}>
      {words.map((w, i) => (
        <li
          key={`${w.word}-${i}`}
          className="break-inside-avoid flex gap-3 py-2 border-b border-black/[0.04] dark:border-white/[0.05]"
        >
          <span className="w-6 shrink-0 pt-0.5 text-right font-bold tabular-nums text-slate-300 dark:text-slate-600" style={{ fontSize: 11 * zoom }}>
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold leading-snug text-slate-900 dark:text-white" style={{ fontSize: 15 * zoom }}>{w.word}</span>
            <span className="block leading-snug text-slate-500 dark:text-slate-400" style={{ fontSize: 13 * zoom }}>{w.translation}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
