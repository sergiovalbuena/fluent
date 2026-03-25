'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type SavedItemType = 'word' | 'phrase' | 'story_word'

export interface SaveItem {
  type: SavedItemType
  original: string
  translation: string
  languageCode: string
  sourceLessonId?: string
}

function itemKey(type: SavedItemType, original: string) {
  return `${type}:${original}`
}

export function useSavedItems(languageCode: string) {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!languageCode) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from('saved_items')
        .select('type, original')
        .eq('user_id', user.id)
        .eq('language_code', languageCode)
        .then(({ data }) => {
          if (data) {
            setSavedKeys(new Set(data.map(d => itemKey(d.type as SavedItemType, d.original))))
          }
        })
    })
  }, [languageCode])

  const isSaved = useCallback(
    (type: SavedItemType, original: string) => savedKeys.has(itemKey(type, original)),
    [savedKeys],
  )

  const toggle = useCallback(
    async (item: SaveItem) => {
      if (!userId) return
      const k = itemKey(item.type, item.original)
      const supabase = createClient()

      if (savedKeys.has(k)) {
        setSavedKeys(prev => { const next = new Set(prev); next.delete(k); return next })
        await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', userId)
          .eq('type', item.type)
          .eq('original', item.original)
        toast('Removed from saved')
      } else {
        setSavedKeys(prev => new Set([...prev, k]))
        await supabase.from('saved_items').insert({
          user_id: userId,
          language_code: item.languageCode,
          type: item.type,
          original: item.original,
          translation: item.translation,
          source_lesson_id: item.sourceLessonId ?? null,
        })
        toast.success('Saved 🔖')
      }
    },
    [userId, savedKeys],
  )

  return { isSaved, toggle }
}
