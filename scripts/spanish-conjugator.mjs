// Small Spanish conjugator for the verb example translations (scripts/verb-examples.mjs).
// Covers the persons and tenses those sentences use. Published libraries got too many
// forms wrong (salo, penso, venirá), so irregulars are listed explicitly here.
// Persons: 0 yo · 1 tú · 2 él · 3 nosotros · 4 vosotros · 5 ellos

const ENDINGS = {
  present: { ar: ['o', 'as', 'a', 'amos', 'áis', 'an'], er: ['o', 'es', 'e', 'emos', 'éis', 'en'], ir: ['o', 'es', 'e', 'imos', 'ís', 'en'] },
  imperfect: { ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'], er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'], ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'] },
  preterite: { ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'], er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'], ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'] },
  subjunctive: { ar: ['e', 'es', 'e', 'emos', 'éis', 'en'], er: ['a', 'as', 'a', 'amos', 'áis', 'an'], ir: ['a', 'as', 'a', 'amos', 'áis', 'an'] },
}
const FUTURE = ['é', 'ás', 'á', 'emos', 'éis', 'án']
const CONDITIONAL = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían']
// Strong preterite endings (tuve, hice, dije)
const STRONG = ['e', 'iste', 'o', 'imos', 'isteis', 'ieron']

// Fully irregular forms, by tense
const IRREGULAR = {
  ser: {
    present: ['soy', 'eres', 'es', 'somos', 'sois', 'son'], imperfect: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'], subjunctive: ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean'],
  },
  ir: {
    present: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'], imperfect: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'], subjunctive: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan'],
  },
  estar: { present: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'], subjunctive: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'] },
  dar: { present: ['doy', 'das', 'da', 'damos', 'dais', 'dan'], preterite: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'], subjunctive: ['dé', 'des', 'dé', 'demos', 'deis', 'den'] },
  ver: { present: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'], imperfect: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'], preterite: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'] },
  haber: { present: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'], subjunctive: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'] },
  saber: { present: ['sé', 'sabes', 'sabe', 'sabemos', 'sabéis', 'saben'], subjunctive: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan'] },
  oír: { present: ['oigo', 'oyes', 'oye', 'oímos', 'oís', 'oyen'], preterite: ['oí', 'oíste', 'oyó', 'oímos', 'oísteis', 'oyeron'] },
  reír: { present: ['río', 'ríes', 'ríe', 'reímos', 'reís', 'ríen'], preterite: ['reí', 'reíste', 'rio', 'reímos', 'reísteis', 'rieron'], subjunctive: ['ría', 'rías', 'ría', 'riamos', 'riais', 'rían'] },
  sonreír: { present: ['sonrío', 'sonríes', 'sonríe', 'sonreímos', 'sonreís', 'sonríen'], preterite: ['sonreí', 'sonreíste', 'sonrió', 'sonreímos', 'sonreísteis', 'sonrieron'], subjunctive: ['sonría', 'sonrías', 'sonría', 'sonriamos', 'sonriais', 'sonrían'] },
  freír: { present: ['frío', 'fríes', 'fríe', 'freímos', 'freís', 'fríen'], preterite: ['freí', 'freíste', 'frio', 'freímos', 'freísteis', 'frieron'], subjunctive: ['fría', 'frías', 'fría', 'friamos', 'friais', 'frían'] },
}

// Irregular yo-form stems (present yo and the whole subjunctive): tengo → tenga
const YO_STEM = {
  tener: 'teng', venir: 'veng', poner: 'pong', salir: 'salg', valer: 'valg', hacer: 'hag', decir: 'dig',
  traer: 'traig', caer: 'caig', oír: 'oig', caber: 'quep', conocer: 'conozc', parecer: 'parezc',
  ofrecer: 'ofrezc', crecer: 'crezc', nacer: 'nazc', conducir: 'conduzc', traducir: 'traduzc',
  producir: 'produzc', agradecer: 'agradezc', obedecer: 'obedezc', aparecer: 'aparezc', desaparecer: 'desaparezc',
  merecer: 'merezc', florecer: 'florezc', establecer: 'establezc', reconocer: 'reconozc', pertenecer: 'pertenezc',
  amanecer: 'amanezc', atardecer: 'atardezc', anochecer: 'anochezc', mantener: 'manteng', obtener: 'obteng',
  contener: 'conteng', detener: 'deteng', proponer: 'propong', componer: 'compong', suponer: 'supong',
  deshacer: 'deshag', satisfacer: 'satisfag', distraer: 'distraig', atraer: 'atraig', recoger: 'recoj',
  escoger: 'escoj', proteger: 'protej', elegir: 'elij', corregir: 'corrij', dirigir: 'dirij', exigir: 'exij',
  seguir: 'sig', conseguir: 'consig', perseguir: 'persig', distinguir: 'disting',
}

// Strong preterite stems: tuve, hice
const PRET_STEM = {
  tener: 'tuv', estar: 'estuv', andar: 'anduv', poder: 'pud', poner: 'pus', saber: 'sup', caber: 'cup',
  haber: 'hub', querer: 'quis', venir: 'vin', hacer: 'hic', decir: 'dij', traer: 'traj', conducir: 'conduj',
  traducir: 'traduj', producir: 'produj', mantener: 'mantuv', obtener: 'obtuv', contener: 'contuv',
  detener: 'detuv', proponer: 'propus', componer: 'compus', suponer: 'supus', deshacer: 'deshic',
  satisfacer: 'satisfic', distraer: 'distraj', atraer: 'atraj', prevenir: 'previn',
}

// Irregular future / conditional stems: tendré
const FUT_STEM = {
  tener: 'tendr', venir: 'vendr', poner: 'pondr', salir: 'saldr', valer: 'valdr', poder: 'podr', querer: 'querr',
  saber: 'sabr', caber: 'cabr', haber: 'habr', hacer: 'har', decir: 'dir', mantener: 'mantendr', obtener: 'obtendr',
  contener: 'contendr', detener: 'detendr', proponer: 'propondr', componer: 'compondr', suponer: 'supondr',
  deshacer: 'deshar', satisfacer: 'satisfar', prevenir: 'prevendr',
}

const PARTICIPLE = {
  hacer: 'hecho', decir: 'dicho', ver: 'visto', poner: 'puesto', volver: 'vuelto', escribir: 'escrito',
  abrir: 'abierto', romper: 'roto', morir: 'muerto', cubrir: 'cubierto', resolver: 'resuelto',
  devolver: 'devuelto', descubrir: 'descubierto', freír: 'frito', imprimir: 'impreso', deshacer: 'deshecho',
  satisfacer: 'satisfecho', suponer: 'supuesto', proponer: 'propuesto', componer: 'compuesto', envolver: 'envuelto',
  revolver: 'revuelto', prever: 'previsto',
}

const IMPERATIVE = { ser: 'sé', ir: 've', tener: 'ten', venir: 'ven', poner: 'pon', salir: 'sal', hacer: 'haz', decir: 'di', mantener: 'mantén', obtener: 'obtén', deshacer: 'deshaz' }

// Stem-changing verbs (present, except nosotros/vosotros; -ir ones also in the preterite 3rd persons)
const E_IE = new Set(['pensar', 'querer', 'empezar', 'comenzar', 'entender', 'perder', 'preferir', 'sentir', 'cerrar',
  'despertar', 'encender', 'nevar', 'regar', 'tener', 'venir', 'mentir', 'divertir', 'convertir', 'herir', 'sugerir',
  'defender', 'atravesar', 'calentar', 'confesar', 'fregar', 'gobernar', 'negar', 'recomendar', 'sentar', 'temblar',
  'tropezar', 'advertir', 'consentir', 'arrepentir', 'hervir', 'mantener', 'obtener', 'contener', 'detener', 'apretar', 'descender', 'ascender', 'extender', 'merendar', 'quebrar'])
const O_UE = new Set(['poder', 'dormir', 'volver', 'llover', 'encontrar', 'contar', 'mostrar', 'probar', 'recordar',
  'costar', 'devolver', 'soñar', 'morir', 'mover', 'volar', 'colgar', 'acostar', 'almorzar', 'aprobar', 'demostrar',
  'doler', 'envolver', 'forzar', 'morder', 'oler', 'resolver', 'rogar', 'soler', 'sonar', 'tostar', 'torcer', 'llover',
  'jugar', 'comprobar', 'renovar', 'revolver', 'promover', 'descolgar'])
const E_I = new Set(['pedir', 'servir', 'repetir', 'seguir', 'vestir', 'elegir', 'medir', 'competir', 'corregir',
  'despedir', 'impedir', 'conseguir', 'perseguir', 'reír', 'sonreír', 'freír', 'rendir', 'teñir', 'ceñir', 'gemir', 'desteñir'])
// e→ie / o→ue -ir verbs also take e→i / o→u in the preterite 3rd persons and the gerund
const IR_SHIFT = new Set(['preferir', 'sentir', 'mentir', 'divertir', 'convertir', 'herir', 'sugerir', 'advertir', 'consentir', 'arrepentir', 'hervir', 'dormir', 'morir'])

const group = v => (v.endsWith('ar') ? 'ar' : v.endsWith('er') ? 'er' : 'ir')
const stemOf = v => v.slice(0, -2).replace(/í$/, 'i')

function changeLastVowel(stem, from, to) {
  const i = stem.lastIndexOf(from)
  return i < 0 ? stem : stem.slice(0, i) + to + stem.slice(i + from.length)
}

function stemChanged(verb, stem) {
  if (verb === 'jugar') return 'jueg'
  if (verb === 'oler') return 'huel'
  if (E_IE.has(verb)) return changeLastVowel(stem, 'e', 'ie')
  if (O_UE.has(verb)) return changeLastVowel(stem, 'o', 'ue')
  if (E_I.has(verb)) return changeLastVowel(stem, 'e', 'i')
  return stem
}

// Spelling: keep the consonant sound before e (busqué, pagué, empecé)
function spellBeforeE(stem) {
  return stem.replace(/c$/, 'qu').replace(/g$/, 'gu').replace(/z$/, 'c')
}

// Spelling before a/o in -er/-ir verbs: escojo/escoja, sigo/siga
function spellBeforeAO(verb, stem) {
  if (group(verb) === 'ar') return stem
  if (stem.endsWith('gu') && verb.endsWith('guir')) return stem.slice(0, -1)
  if (stem.endsWith('g')) return stem.slice(0, -1) + 'j'
  return stem
}

function present(verb, p) {
  if (IRREGULAR[verb]?.present) return IRREGULAR[verb].present[p]
  if (p === 0 && YO_STEM[verb]) return YO_STEM[verb] + 'o'
  const g = group(verb)
  let stem = stemOf(verb)
  if (p !== 3 && p !== 4) stem = stemChanged(verb, stem)
  if (verb.endsWith('uir') && !verb.endsWith('guir') && p !== 3 && p !== 4) stem += 'y' // construyo
  if (p === 0) stem = spellBeforeAO(verb, stem)
  return stem + ENDINGS.present[g][p]
}

function subjunctive(verb, p) {
  if (IRREGULAR[verb]?.subjunctive) return IRREGULAR[verb].subjunctive[p]
  const g = group(verb)
  if (YO_STEM[verb]) return YO_STEM[verb] + ENDINGS.subjunctive[g][p]
  let stem = stemOf(verb)
  if (p !== 3 && p !== 4) {
    stem = stemChanged(verb, stem) // piense, duerma, pida
  } else if (g === 'ir' && (E_I.has(verb) || IR_SHIFT.has(verb))) {
    stem = O_UE.has(verb) ? changeLastVowel(stem, 'o', 'u') : changeLastVowel(stem, 'e', 'i') // durmamos, pidamos
  }
  if (verb.endsWith('uir') && !verb.endsWith('guir')) stem += 'y' // construya
  stem = g === 'ar' ? spellBeforeE(stem) : spellBeforeAO(verb, stem)
  return stem + ENDINGS.subjunctive[g][p]
}

function preterite(verb, p) {
  if (IRREGULAR[verb]?.preterite) return IRREGULAR[verb].preterite[p]
  const g = group(verb)
  if (PRET_STEM[verb]) {
    const s = PRET_STEM[verb]
    let ending = STRONG[p]
    if (s.endsWith('j') && p === 5) ending = 'eron' // dijeron
    if (verb === 'hacer' && p === 2) return 'hizo'
    return s + ending
  }
  let stem = stemOf(verb)
  if (g === 'ar' && p === 0) stem = spellBeforeE(stem)
  if (g === 'ir' && (p === 2 || p === 5) && (E_I.has(verb) || IR_SHIFT.has(verb))) {
    stem = O_UE.has(verb) ? changeLastVowel(stem, 'o', 'u') : changeLastVowel(stem, 'e', 'i')
  }
  let ending = ENDINGS.preterite[g][p]
  // Vowel stems: leyó, cayeron, construyó
  if (g !== 'ar' && /[aeiou]$/.test(stem) && (p === 2 || p === 5)) ending = ending.replace(/^i/, 'y')
  if (g !== 'ar' && /[aeo]$/.test(stem) && p !== 2 && p !== 5) ending = ending.replace(/^i/, 'í')
  return stem + ending
}

function imperfect(verb, p) {
  if (IRREGULAR[verb]?.imperfect) return IRREGULAR[verb].imperfect[p]
  return stemOf(verb) + ENDINGS.imperfect[group(verb)][p]
}

const futureStem = verb => FUT_STEM[verb] ?? verb.replace(/í/, 'i')
const future = (verb, p) => futureStem(verb) + FUTURE[p]
const conditional = (verb, p) => futureStem(verb) + CONDITIONAL[p]

function imperfectSubjunctive(verb, p) {
  // Built on the preterite 3rd plural: comieron → comiera
  const base = preterite(verb, 5).replace(/ron$/, '')
  const endings = ['ra', 'ras', 'ra', 'ramos', 'rais', 'ran']
  let form = base + endings[p]
  if (p === 3) form = form.replace(/([aeiou])ramos$/, (_, v) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' }[v] ?? v) + 'ramos')
  return form
}

export function participle(verb) {
  if (PARTICIPLE[verb]) return PARTICIPLE[verb]
  const g = group(verb)
  const stem = stemOf(verb)
  if (g === 'ar') return stem + 'ado'
  return stem + (/[aeo]$/.test(stem) ? 'ído' : 'ido') // leído, caído
}

export function gerund(verb) {
  const special = { ir: 'yendo', poder: 'pudiendo', venir: 'viniendo', decir: 'diciendo', reír: 'riendo', sonreír: 'sonriendo', freír: 'friendo', oír: 'oyendo' }
  if (special[verb]) return special[verb]
  const g = group(verb)
  let stem = stemOf(verb)
  if (g === 'ar') return stem + 'ando'
  if (g === 'ir' && (E_I.has(verb) || IR_SHIFT.has(verb))) {
    stem = O_UE.has(verb) ? changeLastVowel(stem, 'o', 'u') : changeLastVowel(stem, 'e', 'i')
  }
  if (/[aeiou]$/.test(stem) || verb.endsWith('uir')) return stem + 'yendo' // leyendo, construyendo
  return stem + 'iendo'
}

export function imperativeTu(verb) {
  return IMPERATIVE[verb] ?? present(verb, 2)
}

const HABER = {
  present: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
  imperfect: ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían'],
  future: ['habré', 'habrás', 'habrá', 'habremos', 'habréis', 'habrán'],
  conditional: ['habría', 'habrías', 'habría', 'habríamos', 'habríais', 'habrían'],
  subjunctive: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
  imperfectSubjunctive: ['hubiera', 'hubieras', 'hubiera', 'hubiéramos', 'hubierais', 'hubieran'],
}

/** Conjugate a Spanish infinitive. Tense names follow spanish-verbs. */
export function conjugate(verb, tense, p) {
  switch (tense) {
    case 'INDICATIVE_PRESENT': return present(verb, p)
    case 'INDICATIVE_IMPERFECT': return imperfect(verb, p)
    case 'INDICATIVE_PRETERITE': return preterite(verb, p)
    case 'INDICATIVE_FUTURE': return future(verb, p)
    case 'CONDITIONAL_PRESENT': return conditional(verb, p)
    case 'SUBJUNCTIVE_PRESENT': return subjunctive(verb, p)
    case 'SUBJUNCTIVE_IMPERFECT_RA': return imperfectSubjunctive(verb, p)
    case 'INDICATIVE_PERFECT': return `${HABER.present[p]} ${participle(verb)}`
    case 'INDICATIVE_PLUPERFECT': return `${HABER.imperfect[p]} ${participle(verb)}`
    case 'INDICATIVE_FUTURE_PERFECT': return `${HABER.future[p]} ${participle(verb)}`
    case 'CONDITIONAL_PERFECT': return `${HABER.conditional[p]} ${participle(verb)}`
    case 'SUBJUNCTIVE_PERFECT': return `${HABER.subjunctive[p]} ${participle(verb)}`
    case 'SUBJUNCTIVE_PLUPERFECT': return `${HABER.imperfectSubjunctive[p]} ${participle(verb)}`
    default: throw new Error(`tense ${tense}`)
  }
}
