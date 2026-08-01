/**
 * SVG integrity tests for strings that may be inserted with dangerouslySetInnerHTML.
 * These assertions deliberately use no DOM implementation or browser dependency.
 */
import { describe, expect, it } from 'bun:test'
import { renderMermaidSVG } from '../index.ts'
import { sanitizeCssColor, sanitizeFontName } from '../sanitize.ts'
import type { RenderOptions } from '../types.ts'

const DIAGRAMS = [
  {
    name: 'flowchart',
    source: `flowchart LR
      Start --> Finish`,
  },
  {
    name: 'state',
    source: `stateDiagram-v2
      [*] --> Ready
      Ready --> [*]`,
  },
  {
    name: 'sequence',
    source: `sequenceDiagram
      Alice->>Bob: Hello
      Bob-->>Alice: Hi`,
  },
  {
    name: 'class',
    source: `classDiagram
      Animal <|-- Dog`,
  },
  {
    name: 'er',
    source: `erDiagram
      CUSTOMER ||--o{ ORDER : places`,
  },
  {
    name: 'xychart',
    source: `xychart-beta
      x-axis [Jan, Feb, Mar]
      y-axis "Revenue" 0 --> 100
      bar [25, 50, 75]`,
  },
] as const

const FORBIDDEN_MARKUP = [
  { label: '<script', pattern: /<script\b/i },
  { label: 'onload=', pattern: /\bonload\s*=/i },
  { label: 'onerror=', pattern: /\bonerror\s*=/i },
  { label: 'onclick=', pattern: /\bonclick\s*=/i },
  { label: 'javascript:', pattern: /javascript\s*:/i },
  { label: '<iframe', pattern: /<iframe\b/i },
  { label: '<object', pattern: /<object\b/i },
  { label: '<embed', pattern: /<embed\b/i },
  { label: '<link', pattern: /<link\b/i },
  { label: '<form', pattern: /<form\b/i },
] as const

const THEME_ATTACKS = [
  { key: 'bg', value: '\"><script>alert(1)</script>' },
  { key: 'fg', value: '#fff\" onload=\"alert(1)' },
  {
    key: 'font',
    value: "Inter';}</style><svg onerror=alert(1)><script>javascript:</script>",
  },
] as const satisfies ReadonlyArray<{
  key: 'bg' | 'fg' | 'font'
  value: string
}>

function expectNoDangerousMarkup(svg: string): void {
  expect(svg).toContain('<svg')
  expect(svg).toContain('</svg>')

  for (const { label, pattern } of FORBIDDEN_MARKUP) {
    expect(svg, `found forbidden SVG pattern: ${label}`).not.toMatch(pattern)
  }
}

function expectBoundedStyleBlocks(svg: string): void {
  const openingStyles = svg.match(/<style(?:\s[^>]*)?>/gi) ?? []
  const closingStyles = svg.match(/<\/style>/gi) ?? []
  const styleBlocks = [...svg.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)]

  expect(openingStyles.length).toBeGreaterThan(0)
  expect(closingStyles).toHaveLength(openingStyles.length)
  expect(styleBlocks).toHaveLength(openingStyles.length)

  for (const block of styleBlocks) {
    expect(block[1]).not.toMatch(/<\/?svg\b|<script\b/i)
  }
}

function expectSafeStyleAttributes(svg: string): void {
  const styleAssignments = svg.match(/\sstyle\s*=/gi) ?? []
  const styleAttributes = [...svg.matchAll(/\sstyle="([^"]*)"/gi)]

  // Every style assignment must remain one well-formed, double-quoted attribute.
  expect(styleAttributes).toHaveLength(styleAssignments.length)
  for (const attribute of styleAttributes) {
    expect(attribute[1]).not.toContain('"')
  }
}

describe('renderMermaidSVG dangerous markup exclusion', () => {
  for (const diagram of DIAGRAMS) {
    it(`keeps ${diagram.name} output free of executable or embedded markup`, () => {
      expectNoDangerousMarkup(renderMermaidSVG(diagram.source))
    })
  }
})

describe('renderMermaidSVG malicious theme inputs', () => {
  for (const attack of THEME_ATTACKS) {
    it(`sanitizes malicious ${attack.key} across all diagram renderers`, () => {
      if (attack.key === 'font') {
        expect(sanitizeFontName(attack.value)).toBe('Inter')
      } else {
        expect(sanitizeCssColor(attack.value)).toBeUndefined()
      }

      for (const diagram of DIAGRAMS) {
        const options = { [attack.key]: attack.value } as RenderOptions
        const svg = renderMermaidSVG(diagram.source, options)

        expect(svg).not.toContain(attack.value)
        expectNoDangerousMarkup(svg)
        expectBoundedStyleBlocks(svg)
        expectSafeStyleAttributes(svg)
      }
    })
  }
})

describe('renderMermaidSVG style serialization integrity', () => {
  for (const diagram of DIAGRAMS) {
    it(`correctly bounds style content and attributes in ${diagram.name} output`, () => {
      const svg = renderMermaidSVG(diagram.source)

      expectBoundedStyleBlocks(svg)
      expectSafeStyleAttributes(svg)
    })
  }
})
