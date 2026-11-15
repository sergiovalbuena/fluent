'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_LANGUAGE } from '@/lib/languages'

type LanguageContextValue = {
  languageCode: string
  translationLang: string
  /** Courses the user may switch to */
  unlockedLanguages: string[]
}

const LanguageContext = createContext<LanguageContextValue>({
  languageCode: DEFAULT_LANGUAGE,
  translationLang: 'en',
  unlockedLanguages: [],
})

export function useActiveLanguage() {
  return useContext(LanguageContext)
}

export function LanguageProvider({ value, children }: { value: LanguageContextValue; children: React.ReactNode }) {
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
