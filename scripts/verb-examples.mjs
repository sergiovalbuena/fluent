// Example sentences for every tense of a verb, used by scripts/generate-verbs.mjs.
// Each tense gets a short sentence with the time marker that goes with it
// ("Hier, il a mangé une pomme." for the passé composé), translated by
// conjugating the verb's translation: English with english-verbs-helper,
// Spanish with scripts/spanish-conjugator.mjs.

import { createRequire } from 'node:module'
import { conjugate as esConjugate, gerund as esGerundOf, imperativeTu } from './spanish-conjugator.mjs'

const require = createRequire(import.meta.url)
const ev = require('english-verbs-helper')
const EN_VERBS = ev.mergeVerbsData(
  require('english-verbs-irregular/dist/verbs.json'),
  require('english-verbs-gerunds/dist/gerunds.json'),
)

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

// Objects for the essential verbs, so their examples are complete sentences
// ("Je m'appelle Paul", not "Je m'appelle"): [course language, English, Spanish]
const FR_COMPLEMENTS = {
  être: ['à la maison', 'at home', 'en casa'], avoir: ['une voiture', 'a car', 'un coche'],
  aller: ['au marché', 'to the market', 'al mercado'], faire: ['les courses', 'the shopping', 'la compra'],
  pouvoir: ['venir', 'come', 'venir'], vouloir: ['partir', 'to leave', 'irme'], devoir: ['travailler', 'work', 'trabajar'],
  dire: ['la vérité', 'the truth', 'la verdad'], voir: ['un film', 'a movie', 'una película'],
  prendre: ['le bus', 'the bus', 'el autobús'], venir: ['à la fête', 'to the party', 'a la fiesta'],
  savoir: ['la réponse', 'the answer', 'la respuesta'], parler: ['français', 'French', 'francés'],
  "s'appeler": ['Paul', 'Paul', 'Paul'], habiter: ['à Paris', 'in Paris', 'en París'],
  manger: ['une pomme', 'an apple', 'una manzana'], boire: ['un café', 'a coffee', 'un café'],
  aimer: ['le chocolat', 'chocolate', 'el chocolate'], mettre: ['les clés sur la table', 'the keys on the table', 'las llaves en la mesa'],
  donner: ['un cadeau', 'a gift', 'un regalo'], partir: ['en vacances', 'on vacation', 'de vacaciones'],
  travailler: ['à Paris', 'in Paris', 'en París'], comprendre: ['la question', 'the question', 'la pregunta'],
  connaître: ['Paul', 'Paul', 'a Paul'],
}
const EN_COMPLEMENTS = {
  be: ['at home', 'en casa'], have: ['a car', 'un coche'], do: ['the homework', 'la tarea'], go: ['to the market', 'al mercado'],
  get: ['a ticket', 'un billete'], make: ['a cake', 'un pastel'], say: ['hello', 'hola'], see: ['a movie', 'una película'],
  come: ['to the party', 'a la fiesta'], take: ['the bus', 'el autobús'], know: ['the answer', 'la respuesta'],
  think: ['about it', 'en eso'], give: ['a gift', 'un regalo'], tell: ['the truth', 'la verdad'], speak: ['English', 'inglés'],
  understand: ['the question', 'la pregunta'], eat: ['an apple', 'una manzana'], drink: ['a coffee', 'un café'],
  live: ['in London', 'en Londres'], work: ['from home', 'desde casa'], like: ['chocolate', null], want: ['a coffee', 'un café'],
  need: ['help', 'ayuda'], buy: ['bread', 'pan'],
}
// With these complements the Spanish verb differs from the first translation (ser → estar en casa)
const ES_VERB_FOR = { être: 'estar', be: 'estar' }
// The complement as " xxx" (or '' when there's none)
const sp = c => (c ? ` ${c}` : '')

// ── English ───────────────────────────────────────────────────────────────────

const EN_MODALS = new Set(['can', 'could', 'must', 'should', 'may', 'might', 'will', 'would', 'shall'])
const EN_SUBJECTS = ['I', 'you', 'he', 'we', 'you', 'they']

/** "to know (a fact) / to meet" → { verb: 'know', rest: '' }; "to be called" → { verb: 'be', rest: 'called' } */
function englishVerb(translation) {
  const first = (translation ?? '').split('/')[0].replace(/\(.*?\)/g, '').trim().replace(/^to /, '')
  const [verb, ...rest] = first.split(/\s+/)
  if (!verb || EN_MODALS.has(verb) || !/^[a-z-]+$/.test(verb)) return null
  return { verb, rest: rest.join(' ') }
}

const withRest = (v, form) => (v.rest ? `${form} ${v.rest}` : form)
const en = (v, tense, person) => withRest(v, ev.getConjugation(EN_VERBS, v.verb, tense, person, {}))
const enBase = v => withRest(v, v.verb)
const enPast = v => withRest(v, ev.getConjugation(EN_VERBS, v.verb, 'PARTICIPLE_PAST', 0, {}))
const enIng = v => withRest(v, ev.getIngPart(EN_VERBS, v.verb))

// ── Spanish ───────────────────────────────────────────────────────────────────

const ES_REFLEXIVE = ['me', 'te', 'se', 'nos', 'os', 'se']

/** "comer / tomar" → { verb: 'comer', reflexive: false, rest: '' }; "tomar el sol" keeps "el sol" */
function spanishVerb(translation) {
  const options = (translation ?? '').split('/').map(o => o.replace(/\(.*?\)/g, '').trim())
  for (const option of options) {
    const [word, ...rest] = option.split(/\s+/)
    if (!word || !/(ar|er|ir|ír)(se)?$/.test(word)) continue
    // "gustar" works the other way round (me gusta): it doesn't fit these sentences
    if (word === 'gustar') continue
    const reflexive = /(ar|er|ir|ír)se$/.test(word)
    return { verb: reflexive ? word.slice(0, -2) : word, reflexive, rest: rest.join(' ') }
  }
  return null
}

function es(v, tense, person) {
  const form = esConjugate(v.verb, tense, person)
  return withRest(v, v.reflexive ? `${ES_REFLEXIVE[person]} ${form}` : form)
}
/** Progressive: "estoy comiendo"; reflexive "se está relajando" */
function esProgressive(v, estarTense, person) {
  const estar = esConjugate('estar', estarTense, person)
  return withRest(v, `${v.reflexive ? `${ES_REFLEXIVE[person]} ` : ''}${estar} ${esGerundOf(v.verb)}`)
}
// "¡Está en casa!" reads like a statement: "stay at home" is what's meant
const ES_IMPERATIVE_FOR = { estar: 'quédate' }

function esImperative(v) {
  if (ES_IMPERATIVE_FOR[v.verb]) return withRest(v, ES_IMPERATIVE_FOR[v.verb])
  const form = imperativeTu(v.verb)
  return withRest(v, v.reflexive ? `${accentPenultimate(form)}te` : form)
}

// levanta + te → levántate: adding the pronoun moves the stress three syllables
// from the end, so it takes a written accent (on the strong vowel of a diphthong)
function accentPenultimate(word) {
  const nuclei = [...word.matchAll(/[aeiouáéíóú]+/g)]
  if (nuclei.length < 2) return word // ve → vete, pon → ponte
  const n = nuclei[nuclei.length - 2]
  const strong = n[0].search(/[aeo]/)
  const i = n.index + (strong >= 0 ? strong : n[0].length - 1)
  const ACCENT = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' }
  return word.slice(0, i) + (ACCENT[word[i]] ?? word[i]) + word.slice(i + 1)
}

// A verb the translators can't handle just gets no translation
function attempt(fn) {
  try { return fn() } catch { return null }
}

// ── French course ─────────────────────────────────────────────────────────────

/**
 * Per tense: the person, the French sentence (from the conjugated form and the
 * complement) and its English and Spanish translations. p is the person used,
 * which is always 2 (il / it) for weather verbs.
 */
const FR_TEMPLATES = {
  PRESENT: { person: 0, fr: (f, c) => `D'habitude, ${f}${c}.`, en: (v, c, p) => `Usually, ${EN_SUBJECTS[p]} ${en(v, 'SIMPLE_PRESENT', p)}${c}.`, es: (v, c, p) => `Normalmente, ${es(v, 'INDICATIVE_PRESENT', p)}${c}.` },
  PASSE_COMPOSE: { person: 2, fr: (f, c) => `Hier, ${f}${c}.`, en: (v, c, p) => `Yesterday, ${EN_SUBJECTS[p]} ${en(v, 'SIMPLE_PAST', p)}${c}.`, es: (v, c, p) => `Ayer ${es(v, 'INDICATIVE_PRETERITE', p)}${c}.` },
  IMPARFAIT: { person: 3, fr: (f, c) => `Avant, ${f} souvent${c}.`, en: (v, c, p) => `${capitalize(EN_SUBJECTS[p])} used to ${enBase(v)}${c} often.`, es: (v, c, p) => `Antes ${es(v, 'INDICATIVE_IMPERFECT', p)}${c} a menudo.` },
  PLUS_QUE_PARFAIT: { person: 5, fr: (f, c) => `${capitalize(insertBeforeLast(f, 'déjà'))}${c}.`, en: (v, c, p) => `${capitalize(EN_SUBJECTS[p])} had already ${enPast(v)}${c}.`, es: (v, c, p) => `Ya ${es(v, 'INDICATIVE_PLUPERFECT', p)}${c}.` },
  PASSE_SIMPLE: { person: 2, fr: (f, c) => `Ce jour-là, ${f}${c}.`, en: (v, c, p) => `That day, ${EN_SUBJECTS[p]} ${en(v, 'SIMPLE_PAST', p)}${c}.`, es: (v, c, p) => `Aquel día ${es(v, 'INDICATIVE_PRETERITE', p)}${c}.` },
  FUTUR: { person: 1, fr: (f, c) => `Demain, ${f}${c}.`, en: (v, c, p) => `Tomorrow, ${EN_SUBJECTS[p]} will ${enBase(v)}${c}.`, es: (v, c, p) => `Mañana ${es(v, 'INDICATIVE_FUTURE', p)}${c}.` },
  FUTUR_ANTERIEUR: { person: 0, fr: (f, c) => `Avant ce soir, ${f}${c}.`, en: (v, c, p) => `By tonight, ${EN_SUBJECTS[p]} will have ${enPast(v)}${c}.`, es: (v, c, p) => `Antes de esta noche ${es(v, 'INDICATIVE_FUTURE_PERFECT', p)}${c}.` },
  CONDITIONNEL_PRESENT: { person: 0, fr: (f, c) => `Avec plus de temps, ${f}${c}.`, en: (v, c, p) => `With more time, ${EN_SUBJECTS[p]} would ${enBase(v)}${c}.`, es: (v, c, p) => `Con más tiempo, ${es(v, 'CONDITIONAL_PRESENT', p)}${c}.` },
  CONDITIONNEL_PASSE_1: { person: 3, fr: (f, c) => `Avec plus de temps, ${f}${c}.`, en: (v, c, p) => `With more time, ${EN_SUBJECTS[p]} would have ${enPast(v)}${c}.`, es: (v, c, p) => `Con más tiempo, ${es(v, 'CONDITIONAL_PERFECT', p)}${c}.` },
  SUBJONCTIF_PRESENT: { person: 1, fr: (f, c) => `Il faut ${f}${c}.`, en: (v, c, p) => `${capitalize(EN_SUBJECTS[p])} ${p === 2 ? 'has' : 'have'} to ${enBase(v)}${c}.`, es: (v, c, p) => `Es necesario que ${es(v, 'SUBJUNCTIVE_PRESENT', p)}${c}.` },
  SUBJONCTIF_PASSE: { person: 1, fr: (f, c) => `Je suis content ${f}${c}.`, en: (v, c, p) => `I'm glad ${EN_SUBJECTS[p]} ${p === 2 ? 'has' : 'have'} ${enPast(v)}${c}.`, es: (v, c, p) => `Me alegra que ${es(v, 'SUBJUNCTIVE_PERFECT', p)}${c}.` },
  SUBJONCTIF_IMPARFAIT: { person: 2, fr: (f, c) => `Il fallait ${f}${c}.`, en: (v, c, p) => `${capitalize(EN_SUBJECTS[p])} had to ${enBase(v)}${c}.`, es: (v, c, p) => `Era necesario que ${es(v, 'SUBJUNCTIVE_IMPERFECT_RA', p)}${c}.` },
  SUBJONCTIF_PLUS_QUE_PARFAIT: { person: 2, fr: (f, c) => `J'aurais aimé ${f}${c}.`, en: (v, c, p) => `I wish ${EN_SUBJECTS[p]} had ${enPast(v)}${c}.`, es: (v, c, p) => `Me habría gustado que ${es(v, 'SUBJUNCTIVE_PLUPERFECT', p)}${c}.` },
  IMPERATIF_PRESENT: { person: 0, fr: (f, c) => `${capitalize(f)}${c} maintenant !`, en: (v, c) => `${capitalize(enBase(v))}${c} now!`, es: (v, c) => `¡${capitalize(esImperative(v))}${c} ahora!` },
}

// "ils avaient mangé" → "ils avaient déjà mangé"
function insertBeforeLast(form, word) {
  const i = form.lastIndexOf(' ')
  return i < 0 ? form : `${form.slice(0, i)} ${word}${form.slice(i)}`
}

const frThird = s => s.replace('il/elle', 'il').replace('ils/elles', 'ils')

/** The part of the sentence to highlight: the form without its subject ("que tu manges" → "manges") */
function frVerbPart(form) {
  return form.replace(/^(que |qu')/, '').replace(/^(je |j'|tu |il |elle |nous |vous |ils |elles )/, '')
}

/** Weather verbs (pleuvoir, neiger) only have "il": their examples use il / it */
export function isImpersonal(forms) {
  const present = forms.PRESENT ?? []
  return !!present[2] && !present[0] && !present[1] && !present[3]
}

export function frenchTenseExample(verb, tenseKey, forms) {
  const tpl = FR_TEMPLATES[tenseKey]
  const list = forms[tenseKey]
  if (!tpl || !list) return null
  const impersonal = isImpersonal(forms)
  const person = impersonal ? 2 : tpl.person
  // Imperative lists only tu / nous / vous: index 0 is tu
  const form = tenseKey === 'IMPERATIF_PRESENT' ? list[0] : list[person]
  if (!form) return null

  const [frC, enC, esC] = FR_COMPLEMENTS[verb.id] ?? []
  const text = tpl.fr(frThird(form), sp(frC))
  const translations = {}
  const enV = englishVerb(verb.translations.en)
  const esV = ES_VERB_FOR[verb.id] ? { verb: ES_VERB_FOR[verb.id], reflexive: false, rest: '' } : spanishVerb(verb.translations.es)
  const enText = enV && attempt(() => tpl.en(enV, sp(enC), person))
  const esText = esV && attempt(() => tpl.es(esV, sp(esC), person))
  if (enText) translations.en = impersonal ? enText.replace(/\bhe\b/, 'it').replace(/\bHe\b/, 'It').replace(/\bit has to\b|\bIt has to\b/, m => m) : enText
  if (esText) translations.es = esText
  const match = tenseKey === 'IMPERATIF_PRESENT' ? form : frVerbPart(frThird(form))
  return { text, translations, match }
}

// ── English course ────────────────────────────────────────────────────────────

const EN_TEMPLATES = {
  SIMPLE_PRESENT: { lead: 'Usually, I', verb: v => en(v, 'SIMPLE_PRESENT', 0), tail: '', es: (v, c) => `Normalmente, ${es(v, 'INDICATIVE_PRESENT', 0)}${c}.` },
  PROGRESSIVE_PRESENT: { lead: 'Right now, he', verb: v => en(v, 'PROGRESSIVE_PRESENT', 2), tail: '', es: (v, c) => `Ahora mismo ${esProgressive(v, 'INDICATIVE_PRESENT', 2)}${c}.` },
  PERFECT_PRESENT: { lead: 'We', verb: v => `have already ${enPast(v)}`, tail: '', es: (v, c) => `Ya ${es(v, 'INDICATIVE_PERFECT', 3)}${c}.` },
  PERFECT_PROGRESSIVE_PRESENT: { lead: 'They', verb: v => `have been ${enIng(v)}`, tail: ' all day', es: (v, c) => `${capitalize(esProgressive(v, 'INDICATIVE_PERFECT', 5))}${c} todo el día.` },
  SIMPLE_PAST: { lead: 'Yesterday, he', verb: v => en(v, 'SIMPLE_PAST', 2), tail: '', es: (v, c) => `Ayer ${es(v, 'INDICATIVE_PRETERITE', 2)}${c}.` },
  PROGRESSIVE_PAST: { lead: 'I', verb: v => `was ${enIng(v)}`, tail: ' when you called', es: (v, c) => `${capitalize(esProgressive(v, 'INDICATIVE_IMPERFECT', 0))}${c} cuando llamaste.` },
  PERFECT_PAST: { lead: 'They', verb: v => `had already ${enPast(v)}`, tail: '', es: (v, c) => `Ya ${es(v, 'INDICATIVE_PLUPERFECT', 5)}${c}.` },
  PERFECT_PROGRESSIVE_PAST: { lead: 'We', verb: v => `had been ${enIng(v)}`, tail: ' for an hour', es: (v, c) => `${capitalize(esProgressive(v, 'INDICATIVE_PLUPERFECT', 3))}${c} durante una hora.` },
  SIMPLE_FUTURE: { lead: 'Tomorrow, you', verb: v => `will ${enBase(v)}`, tail: '', es: (v, c) => `Mañana ${es(v, 'INDICATIVE_FUTURE', 1)}${c}.` },
  PROGRESSIVE_FUTURE: { lead: 'This time tomorrow, I', verb: v => `will be ${enIng(v)}`, tail: '', es: (v, c) => `Mañana a esta hora ${esProgressive(v, 'INDICATIVE_FUTURE', 0)}${c}.` },
  PERFECT_FUTURE: { lead: 'By tonight, he', verb: v => `will have ${enPast(v)}`, tail: '', es: (v, c) => `Antes de esta noche ${es(v, 'INDICATIVE_FUTURE_PERFECT', 2)}${c}.` },
  PERFECT_PROGRESSIVE_FUTURE: { lead: 'By then, they', verb: v => `will have been ${enIng(v)}`, tail: ' for hours', es: (v, c) => `Para entonces, ${esProgressive(v, 'INDICATIVE_FUTURE_PERFECT', 5)}${c} durante horas.` },
  CONDITIONAL_PRESENT: { lead: 'With more time, I', verb: v => `would ${enBase(v)}`, tail: '', es: (v, c) => `Con más tiempo, ${es(v, 'CONDITIONAL_PRESENT', 0)}${c}.` },
  CONDITIONAL_PERFECT: { lead: 'With more time, we', verb: v => `would have ${enPast(v)}`, tail: '', es: (v, c) => `Con más tiempo, ${es(v, 'CONDITIONAL_PERFECT', 3)}${c}.` },
  IMPERATIVE: { lead: '', verb: v => capitalize(enBase(v)), tail: ' now', end: '!', es: (v, c) => `¡${capitalize(esImperative(v))}${c} ahora!` },
}

// Stative verbs aren't used in the continuous tenses ("he is being at home"): those get no example
const STATIVE = new Set(['be', 'have', 'know', 'like', 'want', 'need', 'understand', 'believe', 'belong', 'cost',
  'mean', 'own', 'prefer', 'seem', 'hate', 'love', 'remember', 'recognize', 'contain', 'consist', 'depend', 'deserve'])

export function englishTenseExample(verb, tenseKey) {
  const tpl = EN_TEMPLATES[tenseKey]
  if (!tpl) return null
  if (STATIVE.has(verb.id) && tenseKey.includes('PROGRESSIVE')) return null
  const v = { verb: verb.id, rest: '' }
  const verbPhrase = attempt(() => tpl.verb(v))
  if (!verbPhrase) return null
  const [enC, esC] = EN_COMPLEMENTS[verb.id] ?? []
  const text = `${tpl.lead ? `${tpl.lead} ` : ''}${verbPhrase}${sp(enC)}${tpl.tail}${tpl.end ?? '.'}`
  const esV = ES_VERB_FOR[verb.id] ? { verb: ES_VERB_FOR[verb.id], reflexive: false, rest: '' } : spanishVerb(verb.translations.es)
  const esText = esV && esC !== null && attempt(() => tpl.es(esV, sp(esC)))
  return { text, translations: esText ? { es: esText } : {}, match: verbPhrase }
}
