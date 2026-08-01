import { describe, expect, it } from 'bun:test'
import { renderMermaidSVG } from '../index.ts'
import {
  escapeXmlAttribute,
  isSafeCssColor,
  sanitizeCssColor,
  sanitizeFontName,
} from '../sanitize.ts'
import { buildStyleBlock, svgOpenTag } from '../theme.ts'
import type { RenderOptions } from '../types.ts'

const SOURCE = 'graph LR\nA --> B'
const FORBIDDEN_SVG = /<script|onerror\s*=|onload\s*=|javascript\s*:/i

describe('theme input sanitization', () => {
  it('rejects an attribute-breaking background and keeps it inside the style attribute', () => {
    const tag = svgOpenTag(400, 300, {
      bg: 'red"; onload=alert(1)/*',
      fg: '#27272A',
    })

    expect(tag).not.toContain('onload')
    expect(tag).toContain('style="--bg:#FFFFFF;--fg:#27272A;background:var(--bg)"')
    expect(tag.match(/style="/g)).toHaveLength(1)
  })

  it('escapes XML attribute metacharacters at the final serialization boundary', () => {
    expect(escapeXmlAttribute('a&"<>')).toBe('a&amp;&quot;&lt;&gt;')
  })

  it('rejects a font that attempts to escape the style block', () => {
    const style = buildStyleBlock("x';} </style><svg onload=alert(1)>", false)

    expect(style).not.toContain('<svg')
    expect(style).not.toContain('onload')
    expect(style).toContain("font-family: 'Inter'")
    expect(style.match(/<\/style>/g)).toHaveLength(1)
  })

  it('allows supported colors and known theme variable references', () => {
    const valid = [
      '#abc',
      '#A1b2C3',
      '#112233CC',
      'rgb(12, 34, 56)',
      'rgba(12, 34, 56, 0.5)',
      'hsl(210, 50%, 40%)',
      'hsla(210, 50%, 40%, 75%)',
      'transparent',
      'var(--bg)',
    ]

    for (const color of valid) {
      expect(isSafeCssColor(color)).toBe(true)
      expect(sanitizeCssColor(color)).toBe(color)
    }

    const tag = svgOpenTag(10, 10, {
      bg: '#abc',
      fg: 'rgb(12, 34, 56)',
      line: 'var(--bg)',
    })
    expect(tag).toContain('--bg:#abc')
    expect(tag).toContain('--fg:rgb(12, 34, 56)')
    expect(tag).toContain('--line:var(--bg)')
  })

  it('rejects dangerous and unsupported CSS color structures', () => {
    const invalid = [
      'red;stroke:blue',
      'red" onload="alert(1)',
      "red'",
      'rgb(0, 0, 0)\nurl(javascript:alert(1))',
      'url(https://example.test/color)',
      'expression(alert(1))',
      'javascript:alert(1)',
      'var(--external-color)',
      '</style>',
    ]

    for (const color of invalid) {
      expect(sanitizeCssColor(color)).toBeUndefined()
    }
  })

  it('allows only the strict font-name character set', () => {
    expect(sanitizeFontName('Roboto Mono-2_v1.5')).toBe('Roboto Mono-2_v1.5')

    for (const font of ["Bad'Font", 'Bad"Font', 'Bad;Font', 'Bad}Font', 'Bad<Font', 'Bad/Font', 'Bad(Font)', 'Bad,Font']) {
      expect(sanitizeFontName(font)).toBe('Inter')
    }
  })
})

describe('renderMermaidSVG security regression coverage', () => {
  const malicious = 'red";} </style><svg onload=alert(1)><script>javascript:</script>'
  const themeKeys = ['bg', 'fg', 'line', 'accent', 'muted', 'surface', 'border'] as const

  for (const key of themeKeys) {
    it(`sanitizes malicious ${key} input`, () => {
      const svg = renderMermaidSVG(SOURCE, { [key]: malicious } as RenderOptions)

      expect(svg).not.toMatch(FORBIDDEN_SVG)
      expect(svg).not.toContain(malicious)
    })
  }

  it('sanitizes malicious font input', () => {
    const svg = renderMermaidSVG(SOURCE, { font: malicious })

    expect(svg).not.toMatch(FORBIDDEN_SVG)
    expect(svg).not.toContain(malicious)
    expect(svg).toContain("font-family: 'Inter'")
    expect(svg.match(/<\/style>/g)).toHaveLength(1)
  })
})
