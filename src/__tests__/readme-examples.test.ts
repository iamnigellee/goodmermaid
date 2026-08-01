import { describe, expect, it } from 'bun:test'
import { renderMermaidASCII, renderMermaidSVG } from '../index.ts'

function expectSafeSvg(source: string): void {
  const svg = renderMermaidSVG(source)
  const normalizedSvg = svg.toLowerCase()

  expect(typeof svg).toBe('string')
  expect(svg).toContain('<svg')
  expect(normalizedSvg).not.toContain('<script')
  expect(normalizedSvg).not.toContain('onload')
  expect(normalizedSvg).not.toContain('onerror')
}

describe('README examples', () => {
  it('renders Quick Start > SVG Output (README line 67)', () => {
    const source = `
  graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]
`

    expectSafeSvg(source)
  })

  it('renders Quick Start > ASCII Output (README line 84)', () => {
    const source = `graph LR; A --> B --> C`

    expectSafeSvg(source)
    expect(renderMermaidASCII(source).trim()).not.toBe('')
  })

  it('renders Supported Diagrams > Flowcharts (README line 294)', () => {
    const source = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process]
  B -->|No| D[End]
  C --> D`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > State Diagrams (README line 306)', () => {
    const source = `stateDiagram-v2
  [*] --> Idle
  Idle --> Processing: start
  Processing --> Complete: done
  Complete --> [*]`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > Sequence Diagrams (README line 316)', () => {
    const source = `sequenceDiagram
  Alice->>Bob: Hello Bob!
  Bob-->>Alice: Hi Alice!
  Alice->>Bob: How are you?
  Bob-->>Alice: Great, thanks!`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > Class Diagrams (README line 326)', () => {
    const source = `classDiagram
  Animal <|-- Duck
  Animal <|-- Fish
  Animal: +int age
  Animal: +String gender
  Animal: +isMammal() bool
  Duck: +String beakColor
  Duck: +swim()
  Duck: +quack()`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > ER Diagrams (README line 340)', () => {
    const source = `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "is in"`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > Inline Edge Styling (README line 351)', () => {
    const source = `graph TD
  A --> B --> C
  linkStyle 0 stroke:#ff0000,stroke-width:2px
  linkStyle default stroke:#888888`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > XY Charts > Bar chart (README line 374)', () => {
    const source = `xychart-beta
    title "Monthly Revenue"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Revenue ($K)" 0 --> 500
    bar [180, 250, 310, 280, 350, 420]`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > XY Charts > Line chart (README line 384)', () => {
    const source = `xychart-beta
    title "User Growth"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    line [1200, 1800, 2500, 3100, 3800, 4500]`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > XY Charts > Combined bar + line (README line 393)', () => {
    const source = `xychart-beta
    title "Sales with Trend"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    bar [300, 380, 280, 450, 350, 520]
    line [300, 330, 320, 353, 352, 395]`

    expectSafeSvg(source)
  })

  it('renders Supported Diagrams > XY Charts > Horizontal orientation (README line 403)', () => {
    const source = `xychart-beta horizontal
    title "Language Popularity"
    x-axis [Python, JavaScript, Java, Go, Rust]
    bar [30, 25, 20, 12, 8]`

    expectSafeSvg(source)
  })

  it('renders ASCII Output > Unicode mode (README line 443)', () => {
    const source = `graph LR; A --> B`

    expectSafeSvg(source)
    expect(renderMermaidASCII(source).trim()).not.toBe('')
  })

  it('renders ASCII Output > Pure ASCII mode (README line 446)', () => {
    const source = `graph LR; A --> B`

    expectSafeSvg(source)
    expect(renderMermaidASCII(source, { useAscii: true }).trim()).not.toBe('')
  })
})
