<div align="center">

# beautiful-mermaid

**Render Mermaid diagrams as beautiful SVGs or ASCII art**

Ultra-fast, fully themeable, zero DOM dependencies. Built for the AI era.

![beautiful-mermaid sequence diagram example](hero.png)

[![npm version](https://img.shields.io/npm/v/beautiful-mermaid.svg)](https://www.npmjs.com/package/beautiful-mermaid)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[**Live Demo & Samples**](https://agents.craft.do/mermaid)

**[→ Use it live in Craft Agents](https://agents.craft.do)**

</div>

---

## Why We Built This

Diagrams are essential for AI-assisted programming. When you're working with an AI coding assistant, being able to visualize data flows, state machines, and system architecture—directly in your terminal or chat interface—makes complex concepts instantly graspable.

[Mermaid](https://mermaid.js.org/) is the de facto standard for text-based diagrams. It's brilliant. But the default renderer has problems:

- **Aesthetics** — Might be personal preference, but wished they looked more professional
- **Complex theming** — Customizing colors requires wrestling with CSS classes
- **No terminal output** — Can't render to ASCII for CLI tools
- **Heavy dependencies** — Pulls in a lot of code for simple diagrams

We built `beautiful-mermaid` at [Craft](https://craft.do) to power diagrams in [Craft Agents](https://agents.craft.do). It's fast, beautiful, and works everywhere—from rich UIs to plain terminals.


The ASCII rendering engine is based on [mermaid-ascii](https://github.com/AlexanderGrooff/mermaid-ascii) by Alexander Grooff. We ported it from Go to TypeScript and extended it. Thank you Alexander for the excellent foundation! (And inspiration that this was possible.)

## Features

- **6 diagram types** — Flowcharts, State, Sequence, Class, ER, and XY Charts (bar, line, combined)
- **Dual output** — SVG for rich UIs, ASCII/Unicode for terminals
- **Synchronous rendering** — No async, no flash. Works with React `useMemo()`
- **15 built-in themes** — And dead simple to add your own
- **Full Shiki compatibility** — Use any VS Code theme directly
- **Live theme switching** — CSS custom properties, no re-render needed
- **Mono mode** — Beautiful diagrams from just 2 colors
- **Zero DOM dependencies** — Pure TypeScript, works everywhere
- **Ultra-fast** — Renders 100+ diagrams in under 500ms

## Installation

```bash
npm install beautiful-mermaid
# or
bun add beautiful-mermaid
# or
pnpm add beautiful-mermaid
```

## Quick Start

### SVG Output

```typescript
import { renderMermaidSVG } from 'beautiful-mermaid'

const svg = renderMermaidSVG(`
  graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]
`)
```

Rendering is **fully synchronous** — no `await`, no promises. The ELK.js layout engine runs synchronously via a FakeWorker bypass, so you get your SVG string instantly.

Need async? Use `renderMermaidSVGAsync()` — same output, returns a `Promise<string>`.

### ASCII Output

```typescript
import { renderMermaidASCII } from 'beautiful-mermaid'

const ascii = renderMermaidASCII(`graph LR; A --> B --> C`)
```

```
┌───┐     ┌───┐     ┌───┐
│   │     │   │     │   │
│ A │────►│ B │────►│ C │
│   │     │   │     │   │
└───┘     └───┘     └───┘
```

---

## React Integration

Because rendering is synchronous, you can use `useMemo()` for zero-flash diagram rendering:

```tsx
import { renderMermaidSVG } from 'beautiful-mermaid'

function MermaidDiagram({ code }: { code: string }) {
  const { svg, error } = React.useMemo(() => {
    try {
      return {
        svg: renderMermaidSVG(code, {
          bg: 'var(--background)',
          fg: 'var(--foreground)',
          transparent: true,
        }),
        error: null,
      }
    } catch (err) {
      return { svg: null, error: err instanceof Error ? err : new Error(String(err)) }
    }
  }, [code])

  if (error) return <pre>{error.message}</pre>
  return <div dangerouslySetInnerHTML={{ __html: svg! }} />
}
```

**Why this works well:**
- **No flash** — SVG is computed synchronously during render, not in a useEffect
- **CSS variables** — Pass `var(--background)` etc. instead of hex colors. The SVG inherits from your app's CSS, so theme switches apply instantly without re-rendering
- **Memoized** — Only re-renders when `code` changes

---

## Theming

The theming system is the heart of `beautiful-mermaid`. It's designed to be both powerful and dead simple.

### The Two-Color Foundation

Every diagram needs just two colors: **background** (`bg`) and **foreground** (`fg`). That's it. From these two colors, the entire diagram is derived using `color-mix()`:

```typescript
const svg = renderMermaidSVG(diagram, {
  bg: '#1a1b26',  // Background
  fg: '#a9b1d6',  // Foreground
})
```

This is **Mono Mode**—a coherent, beautiful diagram from just two colors. The system automatically derives:

| Element | Derivation |
|---------|------------|
| Text | `--fg` at 100% |
| Secondary text | `--fg` at 60% into `--bg` |
| Edge labels | `--fg` at 40% into `--bg` |
| Faint text | `--fg` at 25% into `--bg` |
| Connectors | `--fg` at 50% into `--bg` |
| Arrow heads | `--fg` at 85% into `--bg` |
| Node fill | `--fg` at 3% into `--bg` |
| Group header | `--fg` at 5% into `--bg` |
| Inner strokes | `--fg` at 12% into `--bg` |
| Node stroke | `--fg` at 20% into `--bg` |

### Enriched Mode

For richer themes, you can provide optional "enrichment" colors that override specific derivations:

```typescript
const svg = renderMermaidSVG(diagram, {
  bg: '#1a1b26',
  fg: '#a9b1d6',
  // Optional enrichment:
  line: '#3d59a1',    // Edge/connector color
  accent: '#7aa2f7',  // Arrow heads, highlights
  muted: '#565f89',   // Secondary text, labels
  surface: '#292e42', // Node fill tint
  border: '#3d59a1',  // Node stroke
})
```

If an enrichment color isn't provided, it falls back to the `color-mix()` derivation. This means you can provide just the colors you care about.

### CSS Custom Properties = Live Switching

All colors are CSS custom properties on the `<svg>` element. This means you can switch themes instantly without re-rendering:

```javascript
// Switch theme by updating CSS variables
svg.style.setProperty('--bg', '#282a36')
svg.style.setProperty('--fg', '#f8f8f2')
// The entire diagram updates immediately
```

For React apps, pass CSS variable references instead of hex values:

```typescript
const svg = renderMermaidSVG(diagram, {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  accent: 'var(--accent)',
  transparent: true,
})
// Theme switches apply automatically via CSS cascade — no re-render needed
```

### Built-in Themes

15 carefully curated themes ship out of the box:

| Theme | Type | Background | Accent |
|-------|------|------------|--------|
| `zinc-light` | Light | `#FFFFFF` | Derived |
| `zinc-dark` | Dark | `#18181B` | Derived |
| `tokyo-night` | Dark | `#1a1b26` | `#7aa2f7` |
| `tokyo-night-storm` | Dark | `#24283b` | `#7aa2f7` |
| `tokyo-night-light` | Light | `#d5d6db` | `#34548a` |
| `catppuccin-mocha` | Dark | `#1e1e2e` | `#cba6f7` |
| `catppuccin-latte` | Light | `#eff1f5` | `#8839ef` |
| `nord` | Dark | `#2e3440` | `#88c0d0` |
| `nord-light` | Light | `#eceff4` | `#5e81ac` |
| `dracula` | Dark | `#282a36` | `#bd93f9` |
| `github-light` | Light | `#ffffff` | `#0969da` |
| `github-dark` | Dark | `#0d1117` | `#4493f8` |
| `solarized-light` | Light | `#fdf6e3` | `#268bd2` |
| `solarized-dark` | Dark | `#002b36` | `#268bd2` |
| `one-dark` | Dark | `#282c34` | `#c678dd` |

```typescript
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid'

const svg = renderMermaidSVG(diagram, THEMES['tokyo-night'])
```

### Adding Your Own Theme

Creating a theme is trivial. At minimum, just provide `bg` and `fg`:

```typescript
const myTheme = {
  bg: '#0f0f0f',
  fg: '#e0e0e0',
}

const svg = renderMermaidSVG(diagram, myTheme)
```

Want richer colors? Add any of the optional enrichments:

```typescript
const myRichTheme = {
  bg: '#0f0f0f',
  fg: '#e0e0e0',
  accent: '#ff6b6b',  // Pop of color for arrows
  muted: '#666666',   // Subdued labels
}
```

### Full Shiki Compatibility

Use **any VS Code theme** directly via Shiki integration. This gives you access to hundreds of community themes:

```typescript
import { getSingletonHighlighter } from 'shiki'
import { renderMermaidSVG, fromShikiTheme } from 'beautiful-mermaid'

// Load any theme from Shiki's registry
const highlighter = await getSingletonHighlighter({
  themes: ['vitesse-dark', 'rose-pine', 'material-theme-darker']
})

// Extract diagram colors from the theme
const colors = fromShikiTheme(highlighter.getTheme('vitesse-dark'))

const svg = renderMermaidSVG(diagram, colors)
```

The `fromShikiTheme()` function intelligently maps VS Code editor colors to diagram roles:

| Editor Color | Diagram Role |
|--------------|--------------|
| `editor.background` | `bg` |
| `editor.foreground` | `fg` |
| `editorLineNumber.foreground` | `line` |
| `focusBorder` / keyword token | `accent` |
| comment token | `muted` |
| `editor.selectionBackground` | `surface` |
| `editorWidget.border` | `border` |

---

## Mermaid Syntax Support

`beautiful-mermaid` implements a practical subset of Mermaid syntax. In the tables below, **Basic** means the documented core forms are supported, **Experimental** means the feature follows a Mermaid beta syntax, and **Full** would mean complete compatibility with Mermaid (no diagram type currently has that status). `ASCII` includes both plain ASCII and Unicode box-drawing output.

### Diagram Types

| Diagram type | Header | SVG | ASCII | Status | Scope and test sources |
|---|---|:---:|:---:|---|---|
| Flowchart | `graph TD` / `flowchart LR` | ✓ | ✓ | Basic | Nodes, edges, groups, directions, and the styling subset below. `src/__tests__/integration.test.ts`, `src/__tests__/ascii.test.ts`, `src/__tests__/readme-examples.test.ts` |
| State | `stateDiagram-v2` (also `stateDiagram`) | ✓ | ✓ | Basic | Transitions, descriptions/aliases, start/end pseudostates, composite states, and direction overrides. ASCII shares the flowchart pipeline; there is no dedicated end-to-end ASCII state fixture. `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/readme-examples.test.ts` |
| Sequence | `sequenceDiagram` | ✓ | ✓ | Basic | Participants/actors, messages, notes, and structural blocks; `+`/`-` activation boxes are SVG-only. `src/__tests__/sequence-parser.test.ts`, `src/__tests__/sequence-integration.test.ts`, `src/__tests__/ascii.test.ts` |
| Class | `classDiagram` | ✓ | ✓ | Basic | Class members/annotations and the documented relationship subset. Namespace declarations are parsed but are not rendered as groups. `src/__tests__/class-parser.test.ts`, `src/__tests__/class-integration.test.ts`, `src/__tests__/ascii.test.ts`, `src/__tests__/class-arrow-directions.test.ts` |
| ER | `erDiagram` | ✓ | ✓ | Basic | Entities, attributes/keys, relationship labels, cardinalities, and identifying/non-identifying lines. `src/__tests__/er-parser.test.ts`, `src/__tests__/er-integration.test.ts`, `src/__tests__/ascii.test.ts` |
| XY chart | `xychart-beta` | ✓ | ✓ | Experimental | Bar, line, mixed/multi-series charts, axes, ranges, titles, and horizontal orientation. `src/__tests__/xychart-integration.test.ts`, `src/__tests__/xychart-ascii.test.ts`, `src/__tests__/readme-examples.test.ts` |

### Syntax Features

`✓` means supported in that output, `△` means output-specific or partial support, and `✗` means unsupported. Specialized diagrams use their own parsers, so flowchart/state syntax does not automatically apply to sequence, class, ER, or XY charts.

| Syntax feature | SVG / ASCII | Example and limits | Test source |
|---|---|---|---|
| Flowchart headers | ✓ / ✓ | `graph LR`, `flowchart TD`; directions accepted: `TD`, `TB`, `LR`, `BT`, `RL` | `src/__tests__/parser.test.ts`, `src/__tests__/ascii.test.ts`, `src/__tests__/svg-integrity.test.ts` |
| State header | ✓ / ✓ | `stateDiagram-v2`; `stateDiagram` is also accepted | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/readme-examples.test.ts` |
| Sequence header | ✓ / ✓ | `sequenceDiagram`; put the header and following statements on separate lines | `src/__tests__/sequence-integration.test.ts`, `src/__tests__/ascii.test.ts`, `src/__tests__/readme-examples.test.ts` |
| Class header | ✓ / ✓ | `classDiagram`; put the header and following statements on separate lines | `src/__tests__/class-integration.test.ts`, `src/__tests__/ascii.test.ts`, `src/__tests__/readme-examples.test.ts` |
| ER header | ✓ / ✓ | `erDiagram`; put the header and following statements on separate lines | `src/__tests__/er-integration.test.ts`, `src/__tests__/ascii.test.ts`, `src/__tests__/readme-examples.test.ts` |
| XY chart header | ✓ / ✓ | `xychart-beta`; put directives on separate lines | `src/__tests__/xychart-integration.test.ts`, `src/__tests__/xychart-ascii.test.ts`, `src/__tests__/readme-examples.test.ts` |
| Top-level semicolon statements | ✓ / ✓ | Flowchart/state parser only: `graph LR; A --> B`; semicolons inside quoted or delimited labels are preserved. Not supported as a general separator by the specialized parsers. | `src/__tests__/syntax-compat.test.ts`, `src/__tests__/readme-examples.test.ts` |
| Compact flowchart arrows | ✓ / ✓ | `A-->B` and `A--text-->B` are equivalent to spaced forms. State transitions also allow optional surrounding spaces. | `src/__tests__/syntax-compat.test.ts`, `src/__tests__/parser.test.ts` |
| Flowchart node shapes | ✓ / ✓ | Bare `A` plus `A[text]`, `A(text)`, `A{text}`, `A([text])`, `A((text))`, `A[[text]]`, `A(((text)))`, `A{{text}}`, `A[(db)]`, `A>note]`, `A[/trap\]`, `A[\trap/]`. ASCII uses shape-specific box/corner approximations. | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/renderer.test.ts` |
| Flowchart edge styles | ✓ / ✓ | Directed `-->`, dotted `-.->`, thick `==>`, and no-arrow `---`; dotted/thick no-arrow forms `-.-` and `===` are also accepted. | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/ascii-edge-styles.test.ts` |
| Flowchart edge labels | ✓ / ✓ | Pipe form <code>--&vert;text&vert;</code> and embedded form `-- text -->`; dotted and thick equivalents are supported. | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/ascii-edge-styles.test.ts` |
| Chained, parallel, and bidirectional flowchart edges | ✓ / ✓ | `A --> B --> C`, `A & B --> C & D`, `<-->`, `<-.->`, `<==>` | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/renderer.test.ts` |
| `linkStyle` | ✓ / ✗ | Flowchart/state SVG only: numeric indices, comma-separated indices, and `default`; rendered properties are `stroke` and `stroke-width`. | `src/__tests__/linkstyle.test.ts`, `src/__tests__/readme-examples.test.ts` |
| `classDef` and class assignment | ✓ / ✗ | Flowchart SVG only: `classDef hot fill:#f00`, `class A,B hot`, and node suffix `A:::hot`. ASCII currently does not apply these styles visually. | `src/__tests__/parser.test.ts`, `src/__tests__/renderer.test.ts` |
| Node `style` statement | ✓ / ✗ | Flowchart SVG only: `style A,B fill:#f00,stroke:#333`; rendered node properties are `fill`, `stroke`, `stroke-width`, and text `color`. | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/renderer.test.ts` |
| Flowchart subgraphs | ✓ / ✓ | `subgraph id [Label] ... end`, including nested subgraphs | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/ascii.test.ts` |
| Root flow direction | ✓ / △ | SVG preserves `TD`/`TB`, `LR`, `BT`, and `RL`. ASCII preserves `TD`/`TB`, `LR`, and `BT`, but currently normalizes `RL` to `LR`. | `src/__tests__/parser.test.ts`, `src/__tests__/integration.test.ts`, `src/__tests__/ascii.test.ts` |
| Direction overrides | ✓ / △ | `direction LR` inside a flowchart subgraph or at state/composite-state scope. ASCII normalizes subgraph `BT` to `TD` and `RL` to `LR`. | `src/__tests__/parser.test.ts`, `src/__tests__/ascii.test.ts` |
| Sequence participants, messages, blocks, and notes | ✓ / ✓ | `participant`/`actor`; solid/dashed/open messages; `loop`, `alt`/`else`, `opt`, `par`/`and`, `critical`, `break`, `rect`; `Note left of`/`right of`/`over` | `src/__tests__/sequence-parser.test.ts`, `src/__tests__/sequence-integration.test.ts`, `src/__tests__/ascii-multiline.test.ts` |
| Sequence `autonumber` | ✗ / ✗ | The directive is currently ignored; messages are not numbered. | No positive test; confirmed by `src/sequence/parser.ts` and `src/ascii/sequence.ts` |
| XY chart directives and orientation | ✓ / ✓ | `title`, categorical/numeric `x-axis`, ranged/titled `y-axis`, `bar`, `line`, multiple series, and `xychart-beta horizontal` | `src/__tests__/xychart-integration.test.ts`, `src/__tests__/xychart-ascii.test.ts`, `src/__tests__/readme-examples.test.ts` |
| `%%` comments | ✓ / ✓ | Whole statements/lines beginning with `%%` are ignored; trailing inline comments are not a documented part of this subset. | `src/__tests__/parser.test.ts`, `src/__tests__/ascii.test.ts` |

### Not Supported or Out of Scope

- Other Mermaid diagram families such as `gantt`, `pie`, `mindmap`, `gitGraph`, `journey`, `timeline`, `requirementDiagram`, `quadrantChart`, `sankey-beta`, `block-beta`, `packet-beta`, and `architecture-beta` are not routed to a renderer (`src/index.ts`, `src/ascii/index.ts`).
- Advanced flowchart forms outside the explicit parser patterns are not supported, including `click`/callback links, edge IDs and animation, image/icon nodes, the general `@{ shape: ... }` form, and Mermaid init/config directives (`src/parser.ts`).
- Advanced state constructs such as choice/fork/join markers, concurrency regions, and state notes are not parsed (`src/parser.ts`).
- Sequence `autonumber`, `box`, `create`, and `destroy` are not implemented. Standalone `activate A` / `deactivate A` lines are ignored; activation via message suffixes such as `A->>+B` is supported in SVG (`src/sequence/parser.ts`).
- Styling support is deliberately narrow: flowchart/state `linkStyle` affects SVG only, and flowchart `classDef`/`class`/`style` affects SVG only. Full Mermaid CSS, theme directives, and interactive callbacks are out of scope.

This is a **Mermaid-format subset**, not a complete Mermaid implementation. Use the official Mermaid renderer when full syntax compatibility is required.

## Supported Diagrams

### Flowcharts

```
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process]
  B -->|No| D[End]
  C --> D
```

SVG preserves all directions: `TD`/`TB` (top-down), `LR` (left-right), `BT` (bottom-top), and `RL` (right-left). ASCII currently normalizes `RL` to `LR`.

### State Diagrams

```
stateDiagram-v2
  [*] --> Idle
  Idle --> Processing: start
  Processing --> Complete: done
  Complete --> [*]
```

### Sequence Diagrams

```
sequenceDiagram
  Alice->>Bob: Hello Bob!
  Bob-->>Alice: Hi Alice!
  Alice->>Bob: How are you?
  Bob-->>Alice: Great, thanks!
```

### Class Diagrams

```
classDiagram
  Animal <|-- Duck
  Animal <|-- Fish
  Animal: +int age
  Animal: +String gender
  Animal: +isMammal() bool
  Duck: +String beakColor
  Duck: +swim()
  Duck: +quack()
```

### ER Diagrams

```
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "is in"
```

### Inline Edge Styling

Use `linkStyle` to override edge colors and stroke widths — just like [Mermaid's linkStyle](https://mermaid.js.org/syntax/flowchart.html#styling-links):

```
graph TD
  A --> B --> C
  linkStyle 0 stroke:#ff0000,stroke-width:2px
  linkStyle default stroke:#888888
```

|             Syntax              |                 Effect                 |
| ------------------------------- | -------------------------------------- |
| `linkStyle 0 stroke:#f00`       | Style a single edge by index (0-based) |
| `linkStyle 0,2 stroke:#f00`     | Style multiple edges at once           |
| `linkStyle default stroke:#888` | Default style applied to all edges     |

Index-specific styles override the default. Supported properties: `stroke`, `stroke-width`.

For SVG output, this works in both flowcharts and state diagrams; ASCII does not apply `linkStyle`.

### XY Charts

Bar charts, line charts, and combinations — using Mermaid's `xychart-beta` syntax.

**Bar chart:**

```
xychart-beta
    title "Monthly Revenue"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Revenue ($K)" 0 --> 500
    bar [180, 250, 310, 280, 350, 420]
```

**Line chart:**

```
xychart-beta
    title "User Growth"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    line [1200, 1800, 2500, 3100, 3800, 4500]
```

**Combined bar + line:**

```
xychart-beta
    title "Sales with Trend"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    bar [300, 380, 280, 450, 350, 520]
    line [300, 330, 320, 353, 352, 395]
```

**Horizontal orientation:**

```
xychart-beta horizontal
    title "Language Popularity"
    x-axis [Python, JavaScript, Java, Go, Rust]
    bar [30, 25, 20, 12, 8]
```

**Axis configuration:**

- Categorical x-axis: `x-axis [A, B, C]`
- Numeric x-axis range: `x-axis 0 --> 100`
- Axis titles: `x-axis "Category" [A, B, C]`
- Y-axis range: `y-axis "Score" 0 --> 100`

**Multi-series:** Add multiple `bar` and/or `line` declarations. Each series gets a distinct color from a monochromatic palette derived from the theme's accent color.

### XY Chart Styling

The chart renderer follows a clean, minimal design philosophy inspired by Apple and Craft:

- **Dot grid** — A subtle dot pattern fills the plot area instead of traditional solid grid lines
- **Rounded bars** — All bar corners are rounded for a modern, polished look
- **Smooth curves** — Line series use natural cubic spline interpolation, producing mathematically smooth curves through all data points (not straight segments or staircase steps)
- **Floating labels** — No visible axis lines or tick marks; labels float freely for a clutter-free aesthetic
- **Drop-shadow lines** — Each line series has a subtle shadow beneath it for depth
- **Monochromatic palette** — Series 0 uses the theme's accent color; additional series get darker/lighter shades of the same hue with subtle hue drift, adapting automatically to light or dark backgrounds
- **Interactive tooltips** — When rendered with `interactive: true`, hovering over bars or data points shows value tooltips. Multi-line tooltips appear when multiple series share an x-position
- **Sparse line dots** — Lines with 12 or fewer data points show data point dots by default for readability
- **Full theme support** — All 15 built-in themes (and custom themes) apply to charts. The accent color drives the entire series color palette
- **Live theme switching** — Chart series colors are CSS custom properties (`--xychart-color-N`), so theme changes apply instantly without re-rendering

---

## ASCII Output

For terminal environments, CLI tools, or anywhere you need plain text, render to ASCII or Unicode box-drawing characters:

```typescript
import { renderMermaidASCII } from 'beautiful-mermaid'

// Unicode mode (default) — prettier box drawing
const unicode = renderMermaidASCII(`graph LR; A --> B`)

// Pure ASCII mode — maximum compatibility
const ascii = renderMermaidASCII(`graph LR; A --> B`, { useAscii: true })
```

**Unicode output:**
```
┌───┐     ┌───┐
│   │     │   │
│ A │────►│ B │
│   │     │   │
└───┘     └───┘
```

**ASCII output:**
```
+---+     +---+
|   |     |   |
| A |---->| B |
|   |     |   |
+---+     +---+
```

### ASCII Options

```typescript
renderMermaidASCII(diagram, {
  useAscii: false,      // true = ASCII, false = Unicode (default)
  paddingX: 5,          // Horizontal spacing between nodes
  paddingY: 5,          // Vertical spacing between nodes
  boxBorderPadding: 1,  // Padding inside node boxes
  colorMode: 'auto',    // 'none' | 'auto' | 'ansi16' | 'ansi256' | 'truecolor' | 'html'
  theme: { ... },       // Partial<AsciiTheme> — override default colors
})
```

### ASCII XY Charts

XY charts render to ASCII with dedicated chart-drawing characters:

- **Bar charts** — `█` blocks (Unicode) or `#` (ASCII mode)
- **Line charts** — Staircase routing with rounded corners: `╭╮╰╯│─` (Unicode) or `+|-` (ASCII)
- **Multi-series** — Each series gets a distinct ANSI color from the theme's accent palette
- **Legends** — Automatically shown when multiple series are present
- **Horizontal charts** — Fully supported with categories on the y-axis

---

## API Reference

### `renderMermaidSVG(text, options?): string`

Render a Mermaid diagram to SVG. Synchronous. Auto-detects diagram type.

**Parameters:**
- `text` — Mermaid source code
- `options` — Optional `RenderOptions` object

**RenderOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bg` | `string` | `#FFFFFF` | Background color (or CSS variable) |
| `fg` | `string` | `#27272A` | Foreground color (or CSS variable) |
| `line` | `string?` | — | Edge/connector color |
| `accent` | `string?` | — | Arrow heads, highlights |
| `muted` | `string?` | — | Secondary text, labels |
| `surface` | `string?` | — | Node fill tint |
| `border` | `string?` | — | Node stroke color |
| `font` | `string` | `Inter` | Font family |
| `transparent` | `boolean` | `false` | Render with transparent background |
| `padding` | `number` | `40` | Canvas padding in px |
| `nodeSpacing` | `number` | `24` | Horizontal spacing between sibling nodes |
| `layerSpacing` | `number` | `40` | Vertical spacing between layers |
| `componentSpacing` | `number` | `24` | Spacing between disconnected components |
| `thoroughness` | `number` | `3` | Crossing minimization trials (1-7, higher = better but slower) |
| `interactive` | `boolean` | `false` | Enable hover tooltips on XY chart bars and data points |

**XY Charts:** Diagrams starting with `xychart-beta` are auto-detected — no separate function needed. The `accent` color option drives the chart series color palette.

### `renderMermaidSVGAsync(text, options?): Promise<string>`

Async version of `renderMermaidSVG()`. Same output, returns a `Promise<string>`. Useful in async server handlers or data loaders.

### `renderMermaidASCII(text, options?): string`

Render a Mermaid diagram to ASCII/Unicode text. Synchronous.

**AsciiRenderOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useAscii` | `boolean` | `false` | Use ASCII instead of Unicode |
| `paddingX` | `number` | `5` | Horizontal node spacing |
| `paddingY` | `number` | `5` | Vertical node spacing |
| `boxBorderPadding` | `number` | `1` | Inner box padding |
| `colorMode` | `string` | `'auto'` | `'none'`, `'auto'`, `'ansi16'`, `'ansi256'`, `'truecolor'`, or `'html'` |
| `theme` | `Partial<AsciiTheme>` | — | Override default colors for ASCII output |

### `parseMermaid(text): MermaidGraph`

Parse Mermaid source into a structured graph object (for custom processing).

### `fromShikiTheme(theme): DiagramColors`

Extract diagram colors from a Shiki theme object.

### `THEMES: Record<string, DiagramColors>`

Object containing all 15 built-in themes.

### `DEFAULTS: { bg: string, fg: string }`

Default colors (`#FFFFFF` / `#27272A`).

---

## Attribution

The ASCII rendering engine is based on [mermaid-ascii](https://github.com/AlexanderGrooff/mermaid-ascii) by Alexander Grooff. We ported it from Go to TypeScript and extended it with:

- Sequence diagram support
- Class diagram support
- ER diagram support
- Unicode box-drawing characters
- Configurable spacing and padding

Thank you Alexander for the excellent foundation!

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with care by the team at [Craft](https://craft.do)

</div>
