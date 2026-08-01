// SVG-only package entry point.
// Keep this list explicit so ASCII rendering code cannot become part of this bundle.
export {
  renderMermaid,
  renderMermaidSVG,
  renderMermaidSVGAsync,
  renderMermaidSync,
} from './index.ts'

export type { MermaidGraph, PositionedGraph, RenderOptions } from './types.ts'
