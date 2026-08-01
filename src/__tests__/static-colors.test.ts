import { describe, expect, it } from 'bun:test'
import { renderMermaidSVG } from '../index.ts'
import {
  HEX_RE,
  colorMix,
  parseHex,
  resolveColors,
  toHex,
} from '../theme.ts'
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
      bar [25, 50, 75]
      line [20, 60, 40]`,
  },
] as const

const STATIC_SYSTEM_OPTIONS = {
  colorMode: 'static',
  fontMode: 'system',
} as const satisfies RenderOptions

function expectStaticSvg(svg: string): void {
  expect(svg).toContain('<svg')
  expect(svg).toEndWith('</svg>')
  expect(svg).not.toContain('var(')
  expect(svg).not.toContain('color-mix(')
  expect(svg).not.toContain('@import')
  expect(svg).not.toContain('https://fonts')
}

function expectSafeStyleAttributes(svg: string): void {
  const assignments = svg.match(/\sstyle\s*=/gi) ?? []
  const attributes = [...svg.matchAll(/\sstyle="([^"]*)"/gi)]
  expect(attributes).toHaveLength(assignments.length)
  for (const attribute of attributes) expect(attribute[1]).not.toContain('"')
}

describe('static color utilities', () => {
  it('parses 3, 6, and 8 digit hex colors', () => {
    expect(parseHex('#F80')).toEqual({ r: 255, g: 136, b: 0 })
    expect(parseHex('#FF8000')).toEqual({ r: 255, g: 128, b: 0 })
    expect(parseHex('#FF800080')).toEqual({ r: 255, g: 128, b: 0, a: 128 })
  })

  it('rejects malformed hex colors', () => {
    expect(() => parseHex('#abcd')).toThrow(/Invalid hex color/)
    expect(() => parseHex('#gggggg')).toThrow(/Invalid hex color/)
    expect(() => parseHex('red')).toThrow(/Invalid hex color/)
  })

  it('serializes with rounding, clamping, and optional alpha', () => {
    expect(toHex({ r: 127.5, g: 300, b: -10 })).toBe('#80ff00')
    expect(toHex({ r: 255, g: 128, b: 0, a: 128 })).toBe('#ff800080')
    expect(toHex({ r: 255, g: 128, b: 0, a: 255 })).toBe('#ff8000')
  })

  it('mixes foreground into background in sRGB channel space', () => {
    expect(colorMix('#000000', '#ffffff', 0)).toBe('#ffffff')
    expect(colorMix('#000000', '#ffffff', 50)).toBe('#808080')
    expect(colorMix('#000000', '#ffffff', 100)).toBe('#000000')
    expect(colorMix('#ff000000', '#00ff00ff', 50)).toBe('#80800080')
  })

  it('resolves every derived color to hex and honors enrichments', () => {
    const colors = resolveColors({
      bg: '#ffffff',
      fg: '#27272a',
      line: '#123456',
      accent: '#abcdef',
      muted: '#667788',
      surface: '#f0f0f0',
      border: '#999999',
    })

    for (const value of Object.values(colors)) expect(HEX_RE.test(value)).toBe(true)
    expect(colors._line).toBe('#123456')
    expect(colors._arrow).toBe('#abcdef')
    expect(colors['_text-sec']).toBe('#667788')
    expect(colors['_node-fill']).toBe('#f0f0f0')
    expect(colors['_node-stroke']).toBe('#999999')
  })
})

describe('static + system rendering', () => {
  for (const diagram of DIAGRAMS) {
    it(`renders ${diagram.name} without runtime CSS color or font dependencies`, () => {
      expectStaticSvg(renderMermaidSVG(diagram.source, STATIC_SYSTEM_OPTIONS))
    })

    it(`keeps ${diagram.name} SVG serialization well formed`, () => {
      const svg = renderMermaidSVG(diagram.source, STATIC_SYSTEM_OPTIONS)
      expectSafeStyleAttributes(svg)
      expect(svg).toEndWith('</svg>')
    })
  }

  it('resolves flowchart inline hex styles and drops CSS-only paint values', () => {
    const hexSvg = renderMermaidSVG(`flowchart LR
      A --> B
      style A fill:#ff0000,stroke:#cc0000`, STATIC_SYSTEM_OPTIONS)
    expect(hexSvg).toContain('fill="#ff0000"')
    expect(hexSvg).toContain('stroke="#cc0000"')

    const cssSvg = renderMermaidSVG(`flowchart LR
      A --> B
      style A fill:hsl(0,100%,50%)`, STATIC_SYSTEM_OPTIONS)
    expectStaticSvg(cssSvg)
    expect(cssSvg).not.toContain('hsl(')
  })

  it('renders interactive xychart colors and transparency as hex literals', () => {
    const svg = renderMermaidSVG(DIAGRAMS[5].source, {
      ...STATIC_SYSTEM_OPTIONS,
      interactive: true,
    })
    expectStaticSvg(svg)
    expect(svg).toContain('fill="#00000000"')
    expect(svg).toMatch(/\.xychart-bar\.xychart-color-0 \{ stroke: #[0-9a-f]{6}; fill: #[0-9a-f]{6,8}; \}/i)
  })
})

describe('font and default mode compatibility', () => {
  it('keeps implicit defaults byte-identical to explicit default modes', () => {
    const source = 'flowchart LR\n  A --> B'
    expect(renderMermaidSVG(source)).toBe(renderMermaidSVG(source, {
      colorMode: 'css-variables',
      fontMode: 'external',
    }))
  })

  it('keeps the existing CSS-variable and external-font output by default', () => {
    const svg = renderMermaidSVG('flowchart LR\n  A --> B')
    expect(svg).toContain('var(')
    expect(svg).toContain('color-mix(')
    expect(svg).toContain('@import')
    expect(svg).toContain('https://fonts.googleapis.com')
  })

  it('uses no network font imports in system mode for either color mode', () => {
    for (const colorMode of ['css-variables', 'static'] as const) {
      const svg = renderMermaidSVG('flowchart LR\n  A --> B', {
        colorMode,
        fontMode: 'system',
      })
      expect(svg).not.toContain('@import')
      expect(svg).not.toContain('https://fonts')
      expect(svg).toContain('-apple-system')
    }
  })

  it('keeps embedded as the existing placeholder font behavior', () => {
    const svg = renderMermaidSVG('flowchart LR\n  A --> B', { fontMode: 'embedded' })
    expect(svg).toContain('@import')
    expect(svg).toContain('fonts.googleapis.com')
  })
})

describe('static mode sanitization', () => {
  it('sanitizes malicious background and font values across all renderers', () => {
    const maliciousBg = '\"><script>alert(1)</script>'
    const maliciousFont = "Inter';}</style><svg onload=alert(1)>"

    for (const diagram of DIAGRAMS) {
      const svg = renderMermaidSVG(diagram.source, {
        ...STATIC_SYSTEM_OPTIONS,
        bg: maliciousBg,
        font: maliciousFont,
      })
      expectStaticSvg(svg)
      expectSafeStyleAttributes(svg)
      expect(svg).not.toContain(maliciousBg)
      expect(svg).not.toContain(maliciousFont)
      expect(svg).not.toMatch(/<script\b|\bonload\s*=/i)
      expect(svg).toContain('background:#FFFFFF')
    }
  })
})
