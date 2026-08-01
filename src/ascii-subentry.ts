// ASCII-only package entry point. This module intentionally has no SVG/ELK imports.
export {
  DEFAULT_ASCII_THEME,
  detectColorMode,
  diagramColorsToAsciiTheme,
  renderMermaidASCII,
  renderMermaidAscii,
} from './ascii/index.ts'

export type {
  AsciiRenderOptions,
  AsciiTheme,
  ColorMode,
} from './ascii/index.ts'
