// ============================================================================
// Theme system — CSS custom property-based theming for mermaid SVG diagrams.
//
// Architecture:
//   - Two required variables: --bg (background) and --fg (foreground)
//   - Five optional enrichment variables: --line, --accent, --muted, --surface, --border
//   - Unset optionals fall back to color-mix() derivations from bg + fg
//   - All derived values computed in a <style> block inside the SVG
//
// This means the SVG is a function of its CSS variables. The caller provides
// colors, and the SVG adapts. No light/dark mode detection needed.
// ============================================================================

import { escapeXmlAttribute, sanitizeCssColor, sanitizeFontName } from './sanitize.ts'
import type { RenderOptions } from './types.ts'

// ============================================================================
// Types
// ============================================================================

/**
 * Diagram color configuration.
 *
 * Required: bg + fg give you a clean mono diagram.
 * Optional: line, accent, muted, surface, border bring in richer color
 * from Shiki themes or custom palettes. Each falls back to a color-mix()
 * derivation from bg + fg if not set.
 */
export interface DiagramColors {
  /** Background color → CSS variable --bg */
  bg: string
  /** Foreground / primary text color → CSS variable --fg */
  fg: string

  // -- Optional enrichment (each falls back to color-mix from bg+fg) --

  /** Edge/connector color → CSS variable --line */
  line?: string
  /** Arrow heads, highlights, special nodes → CSS variable --accent */
  accent?: string
  /** Secondary text, edge labels → CSS variable --muted */
  muted?: string
  /** Node/box fill tint → CSS variable --surface */
  surface?: string
  /** Node/group stroke color → CSS variable --border */
  border?: string
}

// ============================================================================
// Defaults
// ============================================================================

/** Default bg/fg when no colors are provided (zinc light) */
export const DEFAULTS: Readonly<{ bg: string; fg: string }> = {
  bg: '#FFFFFF',
  fg: '#27272A',
} as const

// ============================================================================
// color-mix() weights for derived CSS variables
//
// When an optional enrichment variable is NOT set, we compute the derived
// value by mixing --fg into --bg at these percentages. This produces a
// coherent mono hierarchy on any bg/fg combination.
// ============================================================================

export const MIX = {
  /** Primary text: near-full fg */
  text:         100, // just use --fg directly
  /** Secondary text (group headers): fg mixed at 60% */
  textSec:      60,
  /** Muted text (edge labels, notes): fg mixed at 40% */
  textMuted:    40,
  /** Faint text (de-emphasized): fg mixed at 25% */
  textFaint:    25,
  /** Edge/connector lines: fg mixed at 50% for clear visibility */
  line:         50,
  /** Arrow head fill: fg mixed at 85% for clear visibility */
  arrow:        85,
  /** Node fill tint: fg mixed at 3% */
  nodeFill:     3,
  /** Node/group stroke: fg mixed at 20% */
  nodeStroke:   20,
  /** Group header band tint: fg mixed at 5% */
  groupHeader:  5,
  /** Inner divider strokes: fg mixed at 12% */
  innerStroke:  12,
  /** Key badge background opacity (ER diagrams) */
  keyBadge:     10,
} as const

// ============================================================================
// Well-known theme palettes
//
// Curated bg/fg pairs (+ optional enrichment) for popular editor themes.
// Users can also extract from Shiki theme objects via fromShikiTheme().
// ============================================================================

export const THEMES: Record<string, DiagramColors> = {
  'zinc-light': {
    bg: '#FFFFFF', fg: '#27272A',
  },
  'zinc-dark': {
    bg: '#18181B', fg: '#FAFAFA',
  },
  'tokyo-night': {
    bg: '#1a1b26', fg: '#a9b1d6',
    line: '#3d59a1', accent: '#7aa2f7', muted: '#565f89',
  },
  'tokyo-night-storm': {
    bg: '#24283b', fg: '#a9b1d6',
    line: '#3d59a1', accent: '#7aa2f7', muted: '#565f89',
  },
  'tokyo-night-light': {
    bg: '#d5d6db', fg: '#343b58',
    line: '#34548a', accent: '#34548a', muted: '#9699a3',
  },
  'catppuccin-mocha': {
    bg: '#1e1e2e', fg: '#cdd6f4',
    line: '#585b70', accent: '#cba6f7', muted: '#6c7086',
  },
  'catppuccin-latte': {
    bg: '#eff1f5', fg: '#4c4f69',
    line: '#9ca0b0', accent: '#8839ef', muted: '#9ca0b0',
  },
  'nord': {
    bg: '#2e3440', fg: '#d8dee9',
    line: '#4c566a', accent: '#88c0d0', muted: '#616e88',
  },
  'nord-light': {
    bg: '#eceff4', fg: '#2e3440',
    line: '#aab1c0', accent: '#5e81ac', muted: '#7b88a1',
  },
  'dracula': {
    bg: '#282a36', fg: '#f8f8f2',
    line: '#6272a4', accent: '#bd93f9', muted: '#6272a4',
  },
  'github-light': {
    bg: '#ffffff', fg: '#1f2328',
    line: '#d1d9e0', accent: '#0969da', muted: '#59636e',
  },
  'github-dark': {
    bg: '#0d1117', fg: '#e6edf3',
    line: '#3d444d', accent: '#4493f8', muted: '#9198a1',
  },
  'solarized-light': {
    bg: '#fdf6e3', fg: '#657b83',
    line: '#93a1a1', accent: '#268bd2', muted: '#93a1a1',
  },
  'solarized-dark': {
    bg: '#002b36', fg: '#839496',
    line: '#586e75', accent: '#268bd2', muted: '#586e75',
  },
  'one-dark': {
    bg: '#282c34', fg: '#abb2bf',
    line: '#4b5263', accent: '#c678dd', muted: '#5c6370',
  },
} as const

export type ThemeName = keyof typeof THEMES

/** Platform font stack used when network font loading is disabled. */
export const SYSTEM_FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/** Platform monospace stack used for code-like labels without network fonts. */
export const SYSTEM_MONO_FONT_STACK = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', monospace"

// ============================================================================
// Shiki theme extraction
//
// Extracts DiagramColors from a Shiki ThemeRegistrationResolved object.
// This provides native compatibility with any VS Code / TextMate theme.
// ============================================================================

/**
 * Minimal subset of Shiki's ThemeRegistrationResolved that we need.
 * We don't import from shiki to avoid a hard dependency.
 */
interface ShikiThemeLike {
  type?: string
  colors?: Record<string, string>
  tokenColors?: Array<{
    scope?: string | string[]
    settings?: { foreground?: string }
  }>
}

/**
 * Extract diagram colors from a Shiki theme object.
 * Works with any VS Code / TextMate theme loaded by Shiki.
 *
 * Maps editor UI colors to diagram roles:
 *   editor.background         → bg
 *   editor.foreground         → fg
 *   editorLineNumber.fg       → line (optional)
 *   focusBorder / keyword     → accent (optional)
 *   comment token             → muted (optional)
 *   editor.selectionBackground→ surface (optional)
 *   editorWidget.border       → border (optional)
 *
 * @example
 * ```ts
 * import { getSingletonHighlighter } from 'shiki'
 * import { fromShikiTheme } from 'beautiful-mermaid'
 *
 * const hl = await getSingletonHighlighter({ themes: ['tokyo-night'] })
 * const colors = fromShikiTheme(hl.getTheme('tokyo-night'))
 * const svg = renderMermaidSVG(code, colors)
 * ```
 */
export function fromShikiTheme(theme: ShikiThemeLike): DiagramColors {
  const c = theme.colors ?? {}
  const dark = theme.type === 'dark'

  // Helper: find a token color by scope name
  const tokenColor = (scope: string): string | undefined =>
    theme.tokenColors?.find(t =>
      Array.isArray(t.scope) ? t.scope.includes(scope) : t.scope === scope
    )?.settings?.foreground

  return {
    bg: c['editor.background'] ?? (dark ? '#1e1e1e' : '#ffffff'),
    fg: c['editor.foreground'] ?? (dark ? '#d4d4d4' : '#333333'),
    line:    c['editorLineNumber.foreground'] ?? undefined,
    accent:  c['focusBorder'] ?? tokenColor('keyword') ?? undefined,
    muted:   tokenColor('comment') ?? c['editorLineNumber.foreground'] ?? undefined,
    surface: c['editor.selectionBackground'] ?? undefined,
    border:  c['editorWidget.border'] ?? undefined,
  }
}

// ============================================================================
// Static color resolution
// ============================================================================

/** Parsed RGB color with an optional 8-bit alpha channel. */
export interface RGBA {
  r: number
  g: number
  b: number
  a?: number
}

/** Supported literal color formats for static output. */
export const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** Assert that a value can be resolved without CSS color evaluation. */
export function validateHexColor(value: string, label: string): void {
  if (!HEX_RE.test(value)) {
    throw new Error(
      `Invalid color for '${label}': '${value}'. ` +
      'Static color mode supports #RGB, #RRGGBB, or #RRGGBBAA values only.'
    )
  }
}

/** Parse #RGB, #RRGGBB, or #RRGGBBAA into numeric channels. */
export function parseHex(hex: string): RGBA {
  if (!HEX_RE.test(hex)) {
    throw new Error(
      `Invalid hex color: '${hex}'. Expected #RGB, #RRGGBB, or #RRGGBBAA.`
    )
  }
  let value = hex.slice(1)
  if (value.length === 3) {
    value = [...value].map(channel => channel + channel).join('')
  }

  const parsed: RGBA = {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
  if (value.length === 8) parsed.a = Number.parseInt(value.slice(6, 8), 16)
  return parsed
}

/** Serialize numeric channels as lowercase #RRGGBB or #RRGGBBAA. */
export function toHex(rgba: RGBA): string {
  const channel = (value: number): string => {
    const finiteValue = Number.isFinite(value) ? value : 0
    return Math.round(Math.max(0, Math.min(255, finiteValue))).toString(16).padStart(2, '0')
  }
  const rgb = `#${channel(rgba.r)}${channel(rgba.g)}${channel(rgba.b)}`
  return rgba.a !== undefined && rgba.a !== 255 ? `${rgb}${channel(rgba.a)}` : rgb
}

/** Equivalent to color-mix(in srgb, fg pct%, bg) for literal hex colors. */
export function colorMix(fg: string, bg: string, pct: number): string {
  const foreground = parseHex(fg)
  const background = parseHex(bg)
  const ratio = pct / 100
  const mixed: RGBA = {
    r: background.r + ratio * (foreground.r - background.r),
    g: background.g + ratio * (foreground.g - background.g),
    b: background.b + ratio * (foreground.b - background.b),
  }

  if (foreground.a !== undefined || background.a !== undefined) {
    const foregroundAlpha = foreground.a ?? 255
    const backgroundAlpha = background.a ?? 255
    mixed.a = backgroundAlpha + ratio * (foregroundAlpha - backgroundAlpha)
  }
  return toHex(mixed)
}

interface ColorDerivationRule {
  cssVar: string
  mixKey: keyof typeof MIX | null
  override: keyof DiagramColors | null
  source: 'fg' | 'bg' | null
}

/** Shared derivation graph for dynamic CSS and static literal colors. */
export const COLOR_GRAPH: readonly ColorDerivationRule[] = [
  { cssVar: '_text',         mixKey: 'text',        override: null,      source: 'fg' },
  { cssVar: '_text-sec',     mixKey: 'textSec',     override: 'muted',   source: null },
  { cssVar: '_text-muted',   mixKey: 'textMuted',   override: 'muted',   source: null },
  { cssVar: '_text-faint',   mixKey: 'textFaint',   override: null,      source: null },
  { cssVar: '_line',         mixKey: 'line',        override: 'line',    source: null },
  { cssVar: '_arrow',        mixKey: 'arrow',       override: 'accent',  source: null },
  { cssVar: '_node-fill',    mixKey: 'nodeFill',    override: 'surface', source: null },
  { cssVar: '_node-stroke',  mixKey: 'nodeStroke',  override: 'border',  source: null },
  { cssVar: '_group-fill',   mixKey: null,          override: null,      source: 'bg' },
  { cssVar: '_group-hdr',    mixKey: 'groupHeader', override: null,      source: null },
  { cssVar: '_inner-stroke', mixKey: 'innerStroke', override: null,      source: null },
  { cssVar: '_key-badge',    mixKey: 'keyBadge',    override: null,      source: null },
] as const

/** Every private SVG color resolved to a literal hex value. */
export interface ResolvedColors {
  bg: string
  _text: string
  '_text-sec': string
  '_text-muted': string
  '_text-faint': string
  _line: string
  _arrow: string
  '_node-fill': string
  '_node-stroke': string
  '_group-fill': string
  '_group-hdr': string
  '_inner-stroke': string
  '_key-badge': string
}

export type ColorKey = Exclude<keyof ResolvedColors, 'bg'>

/** Resolve the current CSS color cascade to literal colors. */
export function resolveColors(colors: DiagramColors): ResolvedColors {
  validateHexColor(colors.bg, 'bg')
  validateHexColor(colors.fg, 'fg')

  const result: Record<string, string> = { bg: colors.bg }
  for (const rule of COLOR_GRAPH) {
    if (rule.source === 'fg') {
      result[rule.cssVar] = colors.fg
      continue
    }
    if (rule.source === 'bg') {
      result[rule.cssVar] = colors.bg
      continue
    }

    const overrideValue = rule.override ? colors[rule.override] : undefined
    if (overrideValue) {
      validateHexColor(overrideValue, rule.override!)
      result[rule.cssVar] = overrideValue
    } else {
      result[rule.cssVar] = colorMix(colors.fg, colors.bg, MIX[rule.mixKey!])
    }
  }

  return result as unknown as ResolvedColors
}

/** Access a private color as a CSS variable or a resolved literal. */
export function createColorFn(resolved: ResolvedColors | null): {
  (key: ColorKey): string
  bg: () => string
} {
  const color = ((key: ColorKey) => resolved?.[key] ?? `var(--${key})`) as {
    (key: ColorKey): string
    bg: () => string
  }
  color.bg = () => resolved?.bg ?? 'var(--bg)'
  return color
}

/** Replace all known theme variables in an SVG and reject unresolved variables. */
export function applyResolvedColors(svg: string, resolved: ResolvedColors): string {
  const replacements: ReadonlyArray<readonly [string, string]> = [
    ['bg', resolved.bg],
    ['fg', resolved._text],
    ['line', resolved._line],
    ['accent', resolved._arrow],
    ['muted', resolved['_text-muted']],
    ['surface', resolved['_node-fill']],
    ['border', resolved['_node-stroke']],
    ...COLOR_GRAPH.map(rule => [rule.cssVar, resolved[rule.cssVar as ColorKey]] as const),
  ]

  let output = svg
  for (const [name, value] of replacements) {
    output = output.split(`var(--${name})`).join(value)
  }
  output = output.replace(/\b(fill|stroke)="transparent"/gi, '$1="#00000000"')
  if (output.includes('var(')) {
    throw new Error('Static color mode produced an unresolved CSS variable')
  }
  return output
}

/** Sanitize render colors before strict static resolution. */
export function sanitizeStaticColors(colors: DiagramColors): DiagramColors {
  return {
    bg: sanitizeCssColor(colors.bg, DEFAULTS.bg) ?? DEFAULTS.bg,
    fg: sanitizeCssColor(colors.fg, DEFAULTS.fg) ?? DEFAULTS.fg,
    line: sanitizeCssColor(colors.line),
    accent: sanitizeCssColor(colors.accent),
    muted: sanitizeCssColor(colors.muted),
    surface: sanitizeCssColor(colors.surface),
    border: sanitizeCssColor(colors.border),
  }
}

/** Normalize an inline paint value to hex, or omit it when CSS evaluation is required. */
export function normalizeStaticColor(value: string): string | undefined {
  if (HEX_RE.test(value)) return value
  if (/^transparent$/i.test(value)) return '#00000000'

  const match = value.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/i
  )
  if (!match) return undefined

  const rgba: RGBA = {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  }
  if (match[4] !== undefined) {
    const alpha = Number(match[4])
    rgba.a = alpha <= 1 ? alpha * 255 : alpha
  }
  return toHex(rgba)
}

/** Build an SVG opening tag that contains no CSS custom properties. */
export function svgOpenTagStatic(
  width: number,
  height: number,
  bg: string,
  transparent?: boolean,
): string {
  const safeBg = HEX_RE.test(bg) ? bg : DEFAULTS.bg
  const background = transparent ? 'none' : safeBg
  const style = escapeXmlAttribute(`background:${background}`)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `width="${width}" height="${height}" style="${style}">`
  )
}

/** Build the font-only style block used by static color output. */
export function buildStaticStyleBlock(
  font: string,
  hasMonoFont: boolean,
  fontMode: NonNullable<RenderOptions['fontMode']> = 'external',
): string {
  const safeFont = sanitizeFontName(font)
  const textStack = fontMode === 'system'
    ? SYSTEM_FONT_STACK
    : `'${safeFont}', system-ui, sans-serif`
  const monoStack = fontMode === 'system'
    ? SYSTEM_MONO_FONT_STACK
    : "'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace"

  return [
    '<style>',
    `  text { font-family: ${textStack}; }`,
    ...(hasMonoFont ? [`  .mono { font-family: ${monoStack}; }`] : []),
    '</style>',
  ].join('\n')
}

// ============================================================================
// SVG style block — the CSS variable derivation system
//
// Generates the <style> content that maps user-facing variables (--bg, --fg,
// --line, etc.) to internal derived variables (--_text, --_line, etc.) using
// color-mix() fallbacks.
// ============================================================================

/**
 * Build the CSS variable derivation rules for the SVG <style> block.
 *
 * When an optional variable (--line, --accent, etc.) is set on the SVG or
 * a parent element, it's used directly. When unset, the fallback computes
 * a blended value from --fg and --bg using color-mix().
 */
export function buildStyleBlock(
  font: string,
  hasMonoFont: boolean,
  fontMode: NonNullable<RenderOptions['fontMode']> = 'external',
): string {
  const safeFont = sanitizeFontName(font)
  const fontImports = [
    `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(safeFont)}:wght@400;500;600;700&amp;display=swap');`,
    ...(hasMonoFont
      ? [`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&amp;display=swap');`]
      : []),
  ]

  // Derived CSS variables: use override if set, else mix from bg+fg.
  // The --_ prefix signals "private/derived" — not meant for external override.
  const derivedVars = `
    /* Derived from --bg and --fg (overridable via --line, --accent, etc.) */
    --_text:          var(--fg);
    --_text-sec:      var(--muted, color-mix(in srgb, var(--fg) ${MIX.textSec}%, var(--bg)));
    --_text-muted:    var(--muted, color-mix(in srgb, var(--fg) ${MIX.textMuted}%, var(--bg)));
    --_text-faint:    color-mix(in srgb, var(--fg) ${MIX.textFaint}%, var(--bg));
    --_line:          var(--line, color-mix(in srgb, var(--fg) ${MIX.line}%, var(--bg)));
    --_arrow:         var(--accent, color-mix(in srgb, var(--fg) ${MIX.arrow}%, var(--bg)));
    --_node-fill:     var(--surface, color-mix(in srgb, var(--fg) ${MIX.nodeFill}%, var(--bg)));
    --_node-stroke:   var(--border, color-mix(in srgb, var(--fg) ${MIX.nodeStroke}%, var(--bg)));
    --_group-fill:    var(--bg);
    --_group-hdr:     color-mix(in srgb, var(--fg) ${MIX.groupHeader}%, var(--bg));
    --_inner-stroke:  color-mix(in srgb, var(--fg) ${MIX.innerStroke}%, var(--bg));
    --_key-badge:     color-mix(in srgb, var(--fg) ${MIX.keyBadge}%, var(--bg));`

  if (fontMode === 'system') {
    return [
      '<style>',
      `  text { font-family: ${SYSTEM_FONT_STACK}; }`,
      ...(hasMonoFont ? [`  .mono { font-family: ${SYSTEM_MONO_FONT_STACK}; }`] : []),
      `  svg {${derivedVars}`,
      `  }`,
      '</style>',
    ].join('\n')
  }

  return [
    '<style>',
    `  ${fontImports.join('\n  ')}`,
    `  text { font-family: '${safeFont}', system-ui, sans-serif; }`,
    ...(hasMonoFont ? [`  .mono { font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace; }`] : []),
    `  svg {${derivedVars}`,
    `  }`,
    '</style>',
  ].join('\n')
}

/**
 * Build the SVG opening tag with CSS variables set as inline styles.
 * Only includes optional variables that are actually provided — unset ones
 * will fall back to the color-mix() derivations in the <style> block.
 *
 * @param transparent - If true, omits the background style for transparent SVGs
 */
export function svgOpenTag(
  width: number,
  height: number,
  colors: DiagramColors,
  transparent?: boolean,
): string {
  const bg = sanitizeCssColor(colors.bg, DEFAULTS.bg) ?? DEFAULTS.bg
  const fg = sanitizeCssColor(colors.fg, DEFAULTS.fg) ?? DEFAULTS.fg
  const line = sanitizeCssColor(colors.line)
  const accent = sanitizeCssColor(colors.accent)
  const muted = sanitizeCssColor(colors.muted)
  const surface = sanitizeCssColor(colors.surface)
  const border = sanitizeCssColor(colors.border)

  // Build the style string with only the provided color variables
  const vars = [
    `--bg:${bg}`,
    `--fg:${fg}`,
    line    ? `--line:${line}` : '',
    accent  ? `--accent:${accent}` : '',
    muted   ? `--muted:${muted}` : '',
    surface ? `--surface:${surface}` : '',
    border  ? `--border:${border}` : '',
  ].filter(Boolean).join(';')

  const bgStyle = transparent ? '' : ';background:var(--bg)'
  const style = escapeXmlAttribute(`${vars}${bgStyle}`)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `width="${width}" height="${height}" style="${style}">`
  )
}
