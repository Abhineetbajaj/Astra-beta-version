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

/** Splits `text` around known glossary terms, wrapping each in a tap-to-define <GlossaryTerm>. */
export function highlightGlossaryTerms(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = new RegExp(COMBINED_PATTERN.source, 'gi')
  let lastIndex = 0
  let match: RegExpExecArray | null
  let nodeKey = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))

    const glossaryKey = keyFor(match)
    const matchedText = match[0]
    nodes.push(
      glossaryKey ? (
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
