// Scans Gemini-generated prose for known glossary terms and wraps each match in a <GlossaryTerm>
// popover trigger. Deliberately a plain regex pass over already-generated text (not a Gemini
// output-format change) — works retroactively on already-cached reading rows, and an unmatched
// phrasing (e.g. "eighth house" instead of "8th house") just renders as plain text, never an error.

import type { ReactNode } from 'react'
import GlossaryTerm from '@/components/GlossaryTerm'

const PLANET_TERMS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
const RASHI_TERMS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
const PHRASE_TERMS: { phrase: string; key: string }[] = [
  { phrase: 'Sade Sati', key: 'sade sati' },
  { phrase: 'Guru Gochar', key: 'guru gochar' },
  { phrase: 'Antardasha', key: 'antardasha' },
  { phrase: 'Mahadasha', key: 'mahadasha' },
  { phrase: 'retrograde', key: 'retrograde' },
  { phrase: 'own sign', key: 'own' },
  { phrase: 'exalted', key: 'exalted' },
  { phrase: 'debilitated', key: 'debilitated' },
  { phrase: 'Ascendant', key: 'ascendant' },
  { phrase: 'Life Path number', key: 'life path number' },
  { phrase: 'Life Path', key: 'life path number' },
  { phrase: 'Expression number', key: 'expression number' },
  { phrase: 'Soul Urge number', key: 'soul urge number' },
  { phrase: 'Soul Urge', key: 'soul urge number' },
  { phrase: 'Personality number', key: 'personality number' },
  { phrase: 'Birthday number', key: 'birthday number' },
  { phrase: 'Master number', key: 'master number' },
  { phrase: 'Personal Year', key: 'personal year' },
  { phrase: 'Personal Month', key: 'personal month' },
  { phrase: 'Personal Day', key: 'personal day' },
]

// Longest phrase first so a multi-word phrase always wins over a shorter overlapping alternative.
const SIMPLE_TERMS = [
  ...PLANET_TERMS.map((t) => ({ phrase: t, key: t.toLowerCase() })),
  ...RASHI_TERMS.map((t) => ({ phrase: t, key: t.toLowerCase() })),
  ...PHRASE_TERMS,
].sort((a, b) => b.phrase.length - a.phrase.length)

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Group 1: a simple term match. Group 2: the digit in an "Nth house" match (its own glossary key).
const COMBINED_PATTERN = new RegExp(
  `\\b(${SIMPLE_TERMS.map((t) => escapeRegExp(t.phrase)).join('|')})\\b|\\b(\\d{1,2})(?:st|nd|rd|th)\\s+house\\b`,
  'gi',
)

function keyFor(match: RegExpExecArray): string | null {
  if (match[2]) return `house-${match[2]}`
  const simpleMatch = match[1]
  if (!simpleMatch) return null
  const found = SIMPLE_TERMS.find((t) => t.phrase.toLowerCase() === simpleMatch.toLowerCase())
  return found?.key ?? null
}

// A deliberately small subset for long conversational answers. A real reply names a planet or a
// house a dozen times, and marking every one turns prose into an annotated textbook. These are the
// concepts a reader might genuinely not know; signs, house numbers and ordinary astrology adjectives
// are dropped because they read as vocabulary, not jargon.
const CONCISE_PHRASES = [
  'Sade Sati', 'Guru Gochar', 'Antardasha', 'Mahadasha', 'Rahu', 'Ketu', 'Venus', 'Jupiter', 'Saturn',
]

const CONCISE_TERMS = SIMPLE_TERMS.filter((t) =>
  CONCISE_PHRASES.some((p) => p.toLowerCase() === t.phrase.toLowerCase()),
)

// No "Nth house" alternative here — that is the single biggest source of underline noise in a real
// answer, and a house number is self-explanatory in context.
const CONCISE_PATTERN = new RegExp(`\\b(${CONCISE_TERMS.map((t) => escapeRegExp(t.phrase)).join('|')})\\b`, 'gi')

export interface HighlightOptions {
  /**
   * 'full' (default) marks every known term, every time — the existing behaviour every other page
   * depends on. 'concise' marks only high-value concepts, and only the FIRST time each appears, so
   * a long answer reads as editorial prose rather than a marked-up document.
   */
  scope?: 'full' | 'concise'
  /**
   * Shared first-occurrence memory. Callers that highlight one body of text across several calls
   * (e.g. splitting a paragraph around **bold** spans) must pass a single Set, otherwise each call
   * starts fresh and the same term gets marked once per segment instead of once per answer.
   */
  seen?: Set<string>
}

/** Splits `text` around known glossary terms, wrapping each in a tap-to-define <GlossaryTerm>. */
export function highlightGlossaryTerms(text: string, options: HighlightOptions = {}): ReactNode[] {
  const concise = options.scope === 'concise'
  const nodes: ReactNode[] = []
  const regex = new RegExp((concise ? CONCISE_PATTERN : COMBINED_PATTERN).source, 'gi')
  const seen = options.seen ?? new Set<string>()
  let lastIndex = 0
  let match: RegExpExecArray | null
  let nodeKey = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))

    const glossaryKey = keyFor(match)
    const matchedText = match[0]
    // In concise mode the second and later mentions render as plain text.
    const alreadyMarked = concise && glossaryKey !== null && seen.has(glossaryKey)
    if (glossaryKey) seen.add(glossaryKey)

    nodes.push(
      glossaryKey && !alreadyMarked ? (
        <GlossaryTerm key={nodeKey++} term={glossaryKey}>
          {matchedText}
        </GlossaryTerm>
      ) : (
        matchedText
      ),
    )
    lastIndex = match.index + matchedText.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))

  return nodes
}
