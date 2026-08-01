// ============================================================================
// Sanitizers for untrusted values embedded in generated SVG/CSS.
// ============================================================================

const SAFE_CSS_VARIABLES = new Set([
  '--bg',
  '--fg',
  '--line',
  '--accent',
  '--muted',
  '--surface',
  '--border',
])

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)`
const PERCENTAGE = `${NUMBER}%`
const RGB_COMPONENT = `(?:${NUMBER}|${PERCENTAGE})`
const ALPHA_COMPONENT = `(?:${NUMBER}|${PERCENTAGE})`
const HUE = `${NUMBER}(?:deg|grad|rad|turn)?`

const RGB_COMMA = new RegExp(
  `^rgb\\(\\s*${RGB_COMPONENT}\\s*,\\s*${RGB_COMPONENT}\\s*,\\s*${RGB_COMPONENT}\\s*\\)$`,
  'i',
)
const RGBA_COMMA = new RegExp(
  `^rgba\\(\\s*${RGB_COMPONENT}\\s*,\\s*${RGB_COMPONENT}\\s*,\\s*${RGB_COMPONENT}\\s*,\\s*${ALPHA_COMPONENT}\\s*\\)$`,
  'i',
)
const RGB_MODERN = new RegExp(
  `^rgba?\\(\\s*${RGB_COMPONENT}\\s+${RGB_COMPONENT}\\s+${RGB_COMPONENT}(?:\\s*\\/\\s*${ALPHA_COMPONENT})?\\s*\\)$`,
  'i',
)
const HSL_COMMA = new RegExp(
  `^hsl\\(\\s*${HUE}\\s*,\\s*${PERCENTAGE}\\s*,\\s*${PERCENTAGE}\\s*\\)$`,
  'i',
)
const HSLA_COMMA = new RegExp(
  `^hsla\\(\\s*${HUE}\\s*,\\s*${PERCENTAGE}\\s*,\\s*${PERCENTAGE}\\s*,\\s*${ALPHA_COMPONENT}\\s*\\)$`,
  'i',
)
const HSL_MODERN = new RegExp(
  `^hsla?\\(\\s*${HUE}\\s+${PERCENTAGE}\\s+${PERCENTAGE}(?:\\s*\\/\\s*${ALPHA_COMPONENT})?\\s*\\)$`,
  'i',
)

/** Return whether a value is in the supported, injection-safe CSS color subset. */
export function isSafeCssColor(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const color = value.trim()
  if (color.length === 0) return false

  // Reject dangerous CSS/XML structures before applying the value whitelist.
  if (
    /[;"'{}\r\n\f<>]/.test(color)
    || /url\s*\(|expression\s*\(|javascript\s*:|<\//i.test(color)
  ) {
    return false
  }

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return true
  if (/^transparent$/i.test(color)) return true

  const variableMatch = color.match(/^var\(\s*(--[a-z0-9_-]+)\s*\)$/i)
  if (variableMatch) return SAFE_CSS_VARIABLES.has(variableMatch[1]!.toLowerCase())

  return RGB_COMMA.test(color)
    || RGBA_COMMA.test(color)
    || RGB_MODERN.test(color)
    || HSL_COMMA.test(color)
    || HSLA_COMMA.test(color)
    || HSL_MODERN.test(color)
}

/**
 * Keep a supported CSS color, otherwise return the supplied safe fallback.
 * Optional theme colors omit the fallback so invalid input stays unset.
 */
export function sanitizeCssColor(value: unknown, fallback?: string): string | undefined {
  if (isSafeCssColor(value)) return value.trim()
  return isSafeCssColor(fallback) ? fallback.trim() : undefined
}

/** Keep a safe font family name, falling back to the built-in default. */
export function sanitizeFontName(value: unknown): string {
  if (typeof value !== 'string') return 'Inter'

  const font = value.trim()
  return font.length > 0 && /^[A-Za-z0-9 ._-]+$/.test(font) ? font : 'Inter'
}

/** Escape a value for a double-quoted XML attribute. */
export function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
