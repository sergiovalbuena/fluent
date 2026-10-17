// Titles of the lesson sections, in every language a course or a learner can use.
// The lesson shows them in the language being learned; the title hint (tooltip)
// shows the same title in the learner's native language.

const TITLES = {
  vocabulary:     { en: 'Vocabulary', es: 'Vocabulario', fr: 'Vocabulaire', de: 'Wortschatz', it: 'Vocabolario', pt: 'Vocabulário', ja: '語彙' },
  vocab_tab:      { en: 'Vocab', es: 'Palabras', fr: 'Mots', de: 'Wörter', it: 'Parole', pt: 'Palavras', ja: '単語' },
  phrases:        { en: 'Phrases', es: 'Frases', fr: 'Phrases', de: 'Sätze', it: 'Frasi', pt: 'Frases', ja: 'フレーズ' },
  qa:             { en: 'Q&A', es: 'Preguntas', fr: 'Questions', de: 'Fragen', it: 'Domande', pt: 'Perguntas', ja: '質問' },
  story:          { en: 'Story', es: 'Historia', fr: 'Histoire', de: 'Geschichte', it: 'Storia', pt: 'História', ja: 'ストーリー' },
  word_list:      { en: 'Word list', es: 'Lista de palabras', fr: 'Liste de mots', de: 'Wortliste', it: 'Elenco di parole', pt: 'Lista de palavras', ja: '単語リスト' },
  all_words:      { en: 'All words', es: 'Todas las palabras', fr: 'Tous les mots', de: 'Alle Wörter', it: 'Tutte le parole', pt: 'Todas as palavras', ja: 'すべての単語' },
  word_sheet:     { en: 'Word sheet', es: 'Hoja de palabras', fr: 'Fiche de mots', de: 'Wortblatt', it: 'Scheda di parole', pt: 'Folha de palavras', ja: '単語シート' },
  grammar:        { en: 'Grammar', es: 'Gramática', fr: 'Grammaire', de: 'Grammatik', it: 'Grammatica', pt: 'Gramática', ja: '文法' },
  tips:           { en: 'Tips', es: 'Consejos', fr: 'Conseils', de: 'Tipps', it: 'Consigli', pt: 'Dicas', ja: 'ヒント' },
  phrase_list:    { en: 'Phrase list', es: 'Lista de frases', fr: 'Liste de phrases', de: 'Satzliste', it: 'Elenco di frasi', pt: 'Lista de frases', ja: 'フレーズリスト' },
  all_phrases:    { en: 'All phrases', es: 'Todas las frases', fr: 'Toutes les phrases', de: 'Alle Sätze', it: 'Tutte le frasi', pt: 'Todas as frases', ja: 'すべてのフレーズ' },
  start_practice: { en: 'Start practice', es: 'Empezar práctica', fr: 'Commencer la pratique', de: 'Übung starten', it: 'Inizia la pratica', pt: 'Começar prática', ja: '練習を始める' },
  practice:       { en: 'Practice', es: 'Práctica', fr: 'Pratique', de: 'Übung', it: 'Pratica', pt: 'Prática', ja: '練習' },
  listening:      { en: 'Listening', es: 'Escucha', fr: 'Écoute', de: 'Hören', it: 'Ascolto', pt: 'Escuta', ja: 'リスニング' },
  questions:      { en: 'Questions', es: 'Preguntas', fr: 'Questions', de: 'Fragen', it: 'Domande', pt: 'Perguntas', ja: '質問' },
  all_questions:  { en: 'All questions', es: 'Todas las preguntas', fr: 'Toutes les questions', de: 'Alle Fragen', it: 'Tutte le domande', pt: 'Todas as perguntas', ja: 'すべての質問' },
  start_quiz:     { en: 'Start quiz', es: 'Empezar el quiz', fr: 'Commencer le quiz', de: 'Quiz starten', it: 'Inizia il quiz', pt: 'Começar o quiz', ja: 'クイズを始める' },
  whole_story:    { en: 'Whole story', es: 'Toda la historia', fr: "Toute l'histoire", de: 'Die ganze Geschichte', it: 'Tutta la storia', pt: 'A história inteira', ja: 'ストーリー全体' },
  key_words:      { en: 'Key words', es: 'Palabras clave', fr: 'Mots clés', de: 'Schlüsselwörter', it: 'Parole chiave', pt: 'Palavras-chave', ja: 'キーワード' },
  write_sentence: { en: 'Write your own sentence', es: 'Escribe tu propia frase', fr: 'Écris ta propre phrase', de: 'Schreib deinen eigenen Satz', it: 'Scrivi la tua frase', pt: 'Escreva sua própria frase', ja: '自分で文を書こう' },
  type_x3:        { en: 'Type × 3', es: 'Escribe × 3', fr: 'Écris × 3', de: 'Tippe × 3', it: 'Scrivi × 3', pt: 'Escreva × 3', ja: '3回入力' },
  finish_lesson:  { en: 'Finish lesson', es: 'Terminar la lección', fr: 'Terminer la leçon', de: 'Lektion beenden', it: 'Termina la lezione', pt: 'Concluir a lição', ja: 'レッスンを終える' },
} as const

export type SectionTitleKey = keyof typeof TITLES
type TitleLanguage = keyof (typeof TITLES)['vocabulary']

/** A section title in the given language (English when the language isn't covered) */
export function sectionTitle(key: SectionTitleKey, lang: string): string {
  const titles: Record<TitleLanguage, string> = TITLES[key]
  return titles[lang as TitleLanguage] ?? titles.en
}
