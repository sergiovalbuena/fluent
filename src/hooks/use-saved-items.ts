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
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      setUserId(session.user.id)
      if (!languageCode) return
      supabase
        .from('saved_items')
        .select('type, original')
        .eq('user_id', session.user.id)
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
      const supabase = createClient()

      let uid = userId
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { toast.error('Not signed in'); return }
        uid = session.user.id
        setUserId(uid)
      }

      const k = itemKey(item.type, item.original)

      if (savedKeys.has(k)) {
        setSavedKeys(prev => { const next = new Set(prev); next.delete(k); return next })
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', uid)
          .eq('type', item.type)
          .eq('original', item.original)
        if (error) { toast.error('Could not remove'); return }
        toast('Removed from saved')
      } else {
        setSavedKeys(prev => new Set([...prev, k]))
        const { error } = await supabase.from('saved_items').insert({
          user_id: uid,
          language_code: item.languageCode,
          type: item.type,
          original: item.original,
          translation: item.translation,
          source_lesson_id: item.sourceLessonId ?? null,
        })
        if (error) {
          setSavedKeys(prev => { const next = new Set(prev); next.delete(k); return next })
          toast.error('Could not save')
          return
        }
        toast.success('Saved 🔖')
      }
    },
    [userId, savedKeys],
  )

  return { isSaved, toggle }
}
