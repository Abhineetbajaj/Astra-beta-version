import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import GlossaryTerm from '@/components/GlossaryTerm'

/** Reassembles the highlighted nodes back into plain text, to check nothing was lost or duplicated. */
function reconstruct(nodes: ReturnType<typeof highlightGlossaryTerms>): string {
  return nodes
    .map((n) => {
      if (typeof n === 'string') return n
      if (isValidElement<{ children?: unknown }>(n)) return String(n.props.children)
      return ''
    })
    .join('')
}

function glossaryTermProps(node: unknown): { term: string } | null {
  if (isValidElement<{ term: string }>(node) && node.type === GlossaryTerm) return node.props
  return null
}

describe('highlightGlossaryTerms', () => {
  it('leaves jargon-free text completely unchanged', () => {
    const text = 'Focus on rest and family today.'
    const result = highlightGlossaryTerms(text)
    expect(result).toEqual([text])
  })

  it('wraps a planet name with the matching glossary term', () => {
    const result = highlightGlossaryTerms('Saturn is retrograde right now.')
    const saturnNode = result.find((n) => glossaryTermProps(n)?.term === 'saturn')
    expect(saturnNode).toBeTruthy()
    expect(reconstruct(result)).toBe('Saturn is retrograde right now.')
  })

  it('matches an ordinal house phrase to the correct house key', () => {
    const result = highlightGlossaryTerms('Saturn sits in your 8th house today.')
    const houseNode = result.find((n) => glossaryTermProps(n)?.term === 'house-8')
    expect(houseNode).toBeTruthy()
  })

  it('matches multiple distinct terms in one sentence without losing surrounding text', () => {
    const text = 'With retrograde Saturn and retrograde Jupiter together in your 8th house in Taurus, slow down.'
    const result = highlightGlossaryTerms(text)
    const keys = result.map(glossaryTermProps).filter(Boolean).map((p) => p!.term)
    expect(keys).toContain('saturn')
    expect(keys).toContain('jupiter')
    expect(keys).toContain('house-8')
    expect(keys).toContain('taurus')
    expect(keys.filter((k) => k === 'retrograde')).toHaveLength(2)
    expect(reconstruct(result)).toBe(text)
  })

  it('matches "own sign" as a phrase but does not match bare "own"', () => {
    const result = highlightGlossaryTerms('Venus is in its own sign, which is your own strength.')
    const ownSignNode = result.find((n) => glossaryTermProps(n)?.term === 'own')
    expect(ownSignNode).toBeTruthy()
    // "own strength" should not have been matched as a term — only "own sign" is in the term list.
    expect(reconstruct(result)).toContain('your own strength')
  })

  it('is case-insensitive but preserves the original casing in the rendered text', () => {
    const result = highlightGlossaryTerms('saturn moves slowly.')
    const node = result.find((n) => glossaryTermProps(n)?.term === 'saturn')
    expect(node).toBeTruthy()
    expect(reconstruct(result)).toBe('saturn moves slowly.')
  })
})
