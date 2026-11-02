// Onboarding placement: the learner says roughly where they are, and (unless they
// start from scratch) picks the words they know from a list of that band. The
// share of words known places them in the lower or upper level of the band, or in
// the level below it. Words are in the language being learned; everything else in
// the onboarding is in the learner's native language (messages: onboarding.*).
// Each list hides a few made-up words: ticking one means the learner is ticking
// more than they know, so each costs FAKE_PENALTY known words.

export type Cefr = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type SelfLevel = 'zero' | 'basic' | 'intermediate' | 'advanced'
export type Band = 'A' | 'B' | 'C'

export const SELF_LEVELS: { code: SelfLevel; emoji: string; band: Band | null }[] = [
  { code: 'zero',         emoji: '🌱', band: null },
  { code: 'basic',        emoji: '🙂', band: 'A' },
  { code: 'intermediate', emoji: '💬', band: 'B' },
  { code: 'advanced',     emoji: '🎓', band: 'C' },
]

/** Level below the band, lower level and upper level */
const BAND_LEVELS: Record<Band, [below: Cefr, lower: Cefr, upper: Cefr]> = {
  A: ['A0', 'A1', 'A2'],
  B: ['A2', 'B1', 'B2'],
  C: ['B2', 'C1', 'C2'],
}

/** Real words each ticked made-up word cancels out */
export const FAKE_PENALTY = 5

/**
 * known/total count real words only. After the made-up word penalty: under 30%
 * known → level below the band; 30–69% → lower level; 70%+ → upper level.
 */
export function estimateLevel(band: Band, known: number, total: number, fakesTicked = 0): Cefr {
  const adjusted = Math.max(0, known - fakesTicked * FAKE_PENALTY)
  const pct = total > 0 ? adjusted / total : 0
  const [below, lower, upper] = BAND_LEVELS[band]
  return pct >= 0.7 ? upper : pct >= 0.3 ? lower : below
}

export const PLACEMENT_WORDS: Record<string, Record<Band, string[]>> = {
  fr: {
    A: ['ami', 'année', 'arbre', 'avion', 'beau', 'boire', 'bonjour', 'chambre', 'chaud', 'chercher', 'chien', 'cuisine', 'demain', 'école', 'encore', 'facile', 'famille', 'faire', 'heure', 'hiver', 'livre', 'maison', 'marcher', 'matin', 'mer', 'noir', 'parler', 'petit', 'rouge', 'vivre'],
    B: ['améliorer', 'annuler', 'atteindre', 'bilan', 'croissance', 'débattre', 'décevant', 'démarche', 'désormais', 'efficace', 'élargir', 'enjeu', 'éviter', 'fournir', 'gérer', 'incontournable', 'lendemain', 'maintenir', 'néanmoins', 'objectif', 'parvenir', 'poursuivre', 'promouvoir', 'réduire', 'recours', 'renforcer', 'saisir', 'seuil', 'tendance', 'vaste'],
    C: ['approfondir', 'arbitraire', 'assujettir', 'clairvoyance', 'complaisance', 'dénouement', 'dépréciation', 'désuet', 'discutable', 'ébauche', 'effervescent', 'éminent', 'envergure', 'éphémère', 'équivoque', 'érudit', 'exacerber', 'exigu', 'fulgurant', 'hégémonie', 'impondérable', 'indéfectible', 'inéluctable', 'ingérence', 'insidieux', 'intempestif', 'lacunaire', 'prérogative', 'prolifération', 'véhément'],
  },
  en: {
    A: ['friend', 'year', 'tree', 'plane', 'beautiful', 'drink', 'hello', 'bedroom', 'hot', 'search', 'dog', 'kitchen', 'tomorrow', 'school', 'again', 'easy', 'family', 'make', 'hour', 'winter', 'book', 'house', 'walk', 'morning', 'sea', 'black', 'speak', 'small', 'red', 'live'],
    B: ['improve', 'cancel', 'achieve', 'assessment', 'growth', 'debate', 'disappointing', 'approach', 'efficient', 'broaden', 'avoid', 'provide', 'manage', 'essential', 'maintain', 'nevertheless', 'consequence', 'succeed', 'pursue', 'promote', 'reduce', 'strengthen', 'seize', 'threshold', 'trend', 'vast', 'however', 'reliable', 'require', 'outcome'],
    C: ['arbitrary', 'complacency', 'foresight', 'obsolete', 'ubiquitous', 'ephemeral', 'equivocal', 'erudite', 'exacerbate', 'exacting', 'hegemony', 'imponderable', 'unwavering', 'inexorable', 'insidious', 'untimely', 'scrupulous', 'prerogative', 'proliferation', 'vehement', 'meticulous', 'pragmatic', 'conundrum', 'tenacious', 'ambivalent', 'cogent', 'mitigate', 'perfunctory', 'serendipity', 'tantamount'],
  },
  es: {
    A: ['amigo', 'año', 'árbol', 'avión', 'bonito', 'beber', 'hola', 'habitación', 'caliente', 'buscar', 'perro', 'cocina', 'mañana', 'escuela', 'todavía', 'fácil', 'familia', 'hacer', 'hora', 'invierno', 'libro', 'casa', 'caminar', 'tarde', 'mar', 'negro', 'hablar', 'pequeño', 'rojo', 'vivir'],
    B: ['mejorar', 'cancelar', 'alcanzar', 'balance', 'crecimiento', 'debatir', 'decepcionante', 'trámite', 'sin embargo', 'eficaz', 'ampliar', 'desafío', 'evitar', 'proporcionar', 'gestionar', 'imprescindible', 'mantener', 'lograr', 'objetivo', 'emprender', 'promover', 'reducir', 'recurso', 'reforzar', 'aprovechar', 'umbral', 'tendencia', 'amplio', 'plantear', 'desarrollo'],
    C: ['profundizar', 'arbitrario', 'sojuzgar', 'clarividencia', 'complacencia', 'desenlace', 'menoscabo', 'obsoleto', 'cuestionable', 'esbozo', 'efervescente', 'eminente', 'envergadura', 'efímero', 'equívoco', 'erudito', 'exacerbar', 'exiguo', 'fulgurante', 'hegemonía', 'imponderable', 'indefectible', 'ineludible', 'injerencia', 'insidioso', 'intempestivo', 'soslayar', 'prerrogativa', 'proliferación', 'vehemente'],
  },
  pt: {
    A: ['amigo', 'ano', 'árvore', 'avião', 'bonito', 'beber', 'olá', 'quarto', 'quente', 'procurar', 'cachorro', 'cozinha', 'amanhã', 'escola', 'ainda', 'fácil', 'família', 'fazer', 'hora', 'inverno', 'livro', 'casa', 'andar', 'manhã', 'mar', 'preto', 'falar', 'pequeno', 'vermelho', 'morar'],
    B: ['melhorar', 'cancelar', 'alcançar', 'balanço', 'crescimento', 'debater', 'decepcionante', 'procedimento', 'doravante', 'eficaz', 'ampliar', 'desafio', 'evitar', 'fornecer', 'gerenciar', 'indispensável', 'manter', 'no entanto', 'objetivo', 'conseguir', 'prosseguir', 'promover', 'reduzir', 'recurso', 'reforçar', 'aproveitar', 'limiar', 'tendência', 'amplo', 'abordar'],
    C: ['aprofundar', 'arbitrário', 'sujeitar', 'clarividência', 'complacência', 'desfecho', 'depreciação', 'obsoleto', 'discutível', 'esboço', 'efervescente', 'eminente', 'envergadura', 'efêmero', 'equívoco', 'erudito', 'exacerbar', 'exíguo', 'fulgurante', 'hegemonia', 'imponderável', 'indefectível', 'inelutável', 'ingerência', 'insidioso', 'intempestivo', 'lacunar', 'prerrogativa', 'proliferação', 'veemente'],
  },
  de: {
    A: ['Freund', 'Jahr', 'Baum', 'Flugzeug', 'schön', 'trinken', 'hallo', 'Zimmer', 'heiß', 'suchen', 'Hund', 'Küche', 'morgen', 'Schule', 'wieder', 'einfach', 'Familie', 'machen', 'Stunde', 'Winter', 'Buch', 'Haus', 'gehen', 'Abend', 'Meer', 'schwarz', 'sprechen', 'klein', 'rot', 'wohnen'],
    B: ['verbessern', 'absagen', 'erreichen', 'Bilanz', 'Wachstum', 'diskutieren', 'enttäuschend', 'Vorgehen', 'künftig', 'wirksam', 'erweitern', 'Herausforderung', 'vermeiden', 'bereitstellen', 'verwalten', 'unverzichtbar', 'aufrechterhalten', 'dennoch', 'Ziel', 'gelingen', 'verfolgen', 'fördern', 'verringern', 'Maßnahme', 'verstärken', 'ergreifen', 'Schwelle', 'Tendenz', 'umfangreich', 'Voraussetzung'],
    C: ['vertiefen', 'willkürlich', 'unterwerfen', 'Weitsicht', 'Selbstgefälligkeit', 'Abwertung', 'veraltet', 'fragwürdig', 'Gepflogenheit', 'überschwänglich', 'herausragend', 'Tragweite', 'vergänglich', 'zweideutig', 'gelehrt', 'verschärfen', 'dürftig', 'rasant', 'Vorherrschaft', 'unwägbar', 'unerschütterlich', 'unausweichlich', 'Einmischung', 'heimtückisch', 'unzeitgemäß', 'lückenhaft', 'Vorrecht', 'Verbreitung', 'vehement', 'beschwichtigen'],
  },
  it: {
    A: ['amico', 'anno', 'albero', 'aereo', 'bello', 'bere', 'ciao', 'camera', 'caldo', 'cercare', 'cane', 'cucina', 'domani', 'scuola', 'ancora', 'facile', 'famiglia', 'fare', 'ora', 'inverno', 'libro', 'casa', 'camminare', 'mattina', 'mare', 'nero', 'parlare', 'piccolo', 'rosso', 'vivere'],
    B: ['migliorare', 'annullare', 'raggiungere', 'bilancio', 'crescita', 'dibattere', 'deludente', 'procedura', 'ormai', 'efficace', 'ampliare', 'sfida', 'evitare', 'fornire', 'gestire', 'indispensabile', 'mantenere', 'tuttavia', 'obiettivo', 'riuscire', 'proseguire', 'promuovere', 'ridurre', 'ricorso', 'rafforzare', 'cogliere', 'soglia', 'tendenza', 'vasto', 'affrontare'],
    C: ['approfondire', 'arbitrario', 'assoggettare', 'chiaroveggenza', 'compiacenza', 'epilogo', 'deprezzamento', 'desueto', 'opinabile', 'abbozzo', 'effervescente', 'eminente', 'portata', 'effimero', 'equivoco', 'erudito', 'esacerbare', 'esiguo', 'folgorante', 'egemonia', 'imponderabile', 'indefettibile', 'ineluttabile', 'ingerenza', 'insidioso', 'intempestivo', 'lacunoso', 'prerogativa', 'proliferazione', 'veemente'],
  },
  ja: {
    A: ['友達', '年', '木', '飛行機', 'きれい', '飲む', 'こんにちは', '部屋', '暑い', '探す', '犬', '台所', '明日', '学校', 'また', '簡単', '家族', 'する', '時間', '冬', '本', '家', '歩く', '朝', '海', '黒い', '話す', '小さい', '赤い', '住む'],
    B: ['改善', '取り消す', '達成', '成長', '議論', 'がっかり', '手続き', '今後', '効果的', '広げる', '課題', '避ける', '提供', '管理', '欠かせない', '維持', 'しかしながら', '目標', '成功', '追求', '促進', '削減', '手段', '強化', '把握', '基準', '傾向', '幅広い', '対応', '影響'],
    C: ['掘り下げる', '恣意的', '従属', '洞察', '慢心', '結末', '減価', '陳腐', '疑わしい', '草案', '卓越', '規模', '儚い', '曖昧', '博識', '悪化させる', '乏しい', '覇権', '不可避', '干渉', '狡猾', '時期尚早', '特権', '蔓延', '熾烈', '拮抗', '払拭', '杞憂', '逡巡', '鑑みる'],
  },
}

/** Made-up words that look like the language (none of them exist) */
export const PSEUDO_WORDS: Record<string, Record<Band, string[]>> = {
  fr: { A: ['bachon', 'murtir', 'trolève'], B: ['émarceler', 'dévolance', 'prêtude'], C: ['obsquérir', 'trémance', 'vélusif'] },
  en: { A: ['plome', 'drinter', 'gleck'], B: ['rensible', 'cantivate', 'disperment'], C: ['veraculous', 'impetrific', 'dorminate'] },
  es: { A: ['pelonta', 'trasco', 'bermir'], B: ['desmendar', 'prolicio', 'enfaltar'], C: ['perfulgente', 'escalimar', 'vencrudo'] },
  pt: { A: ['pelonta', 'sertolho', 'frimar'], B: ['desmendar', 'prolício', 'enfaltar'], C: ['perfulgente', 'trepidoso', 'escalimar'] },
  de: { A: ['Treppel', 'blarsen', 'Fündel'], B: ['verplausen', 'Zerdungnis', 'umgrenseln'], C: ['Strepsigkeit', 'verquälmen', 'Gelünderung'] },
  it: { A: ['pelonta', 'grabbo', 'fiorlo'], B: ['disvolare', 'attrepare', 'salvenza'], C: ['escalimare', 'vencrudo', 'obsitante'] },
  ja: { A: ['ぬぺる', 'もくぱ', 'たやね'], B: ['整況', '翼論', '望欠'], C: ['慄廓', '湛渺', '昂蔑'] },
}

export type PlacementWord = { word: string; fake: boolean }

/** Real and made-up words of a band, alphabetically in the learned language (like a word cloud) */
export function placementWords(lang: string, band: Band): PlacementWord[] {
  const real = PLACEMENT_WORDS[lang]?.[band] ?? PLACEMENT_WORDS.en[band]
  const fake = PSEUDO_WORDS[lang]?.[band] ?? PSEUDO_WORDS.en[band]
  return [
    ...real.map(word => ({ word, fake: false })),
    ...fake.map(word => ({ word, fake: true })),
  ].sort((a, b) => a.word.localeCompare(b.word, lang))
}
