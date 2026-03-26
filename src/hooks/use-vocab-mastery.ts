'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useVocabMastery(languageCode: string, namespace: 'word' | 'phrase' | 'qa' = 'word') {
  const [masteredSet, setMasteredSet] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  const prefix = namespace === 'word' ? '' : `${namespace}:`

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      const uid = session.user.id
      setUserId(uid)
      if (!languageCode) return
      const query = supabase
        .from('user_vocab_mastery')
        .select('word')
        .eq('user_id', uid)
        .eq('language_code', languageCode)

      const filtered = namespace === 'word'
        ? query.not('word', 'like', 'phrase:%').not('word', 'like', 'qa:%')
        : query.like('word', `${namespace}:%`)

      filtered.then(({ data }) => {
        if (data) setMasteredSet(new Set(data.map(r => r.word)))
      })
    })
  }, [languageCode, namespace, prefix])

  const isMastered = useCallback(
    (word: string) => masteredSet.has(prefix + word),
    [masteredSet, prefix],
  )

  const markMastered = useCallback(
    async (word: string) => {
      const key = prefix + word
      if (masteredSet.has(key)) return
      setMasteredSet(prev => new Set([...prev, key]))
      const supabase = createClient()
      let uid = userId
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        uid = session.user.id
        setUserId(uid)
      }
      await supabase.from('user_vocab_mastery').insert({
        user_id: uid,
        language_code: languageCode,
        word: key,
      })
    },
    [userId, languageCode, masteredSet, prefix],
  )

  const masteredCount = masteredSet.size

  return { isMastered, markMastered, masteredCount, masteredSet }
}
