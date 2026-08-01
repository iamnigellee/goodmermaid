import { describe, expect, it } from 'bun:test'
import { renderMermaidSVG } from '../index.ts'
import { parseMermaid, splitMermaidStatements } from '../parser.ts'

describe('Mermaid top-level statement compatibility', () => {
  it('renders a header and edge separated by a top-level semicolon', () => {
    const svg = renderMermaidSVG('graph LR; A --> B')

    expect(svg).toContain('<svg')
    expect(svg).toContain('data-from="A"')
    expect(svg).toContain('data-to="B"')
  })

  it('parses multiple edge statements on one line', () => {
    const graph = parseMermaid('graph LR; A-->B; B-->C')

    expect(graph.edges).toHaveLength(2)
    expect([...graph.nodes.keys()]).toEqual(['A', 'B', 'C'])
  })

  it('preserves a semicolon inside a quoted node label', () => {
    const graph = parseMermaid('graph LR; A["A;B"] --> B')

    expect(graph.nodes.get('A')?.label).toBe('A;B')
    expect(graph.edges).toHaveLength(1)
  })

  it('preserves arrow-like text inside a quoted node label', () => {
    const graph = parseMermaid('graph LR; A["a---b"]')

    expect(graph.nodes.get('A')?.label).toBe('a---b')
    expect(graph.edges).toHaveLength(0)
  })

  it('ignores empty statements, extra semicolons, and trailing semicolons', () => {
    const graph = parseMermaid(';; graph LR;;; A-->B;; C-->D;;;')

    expect(graph.edges).toHaveLength(2)
    expect([...graph.nodes.keys()]).toEqual(['A', 'B', 'C', 'D'])
  })

  it('splits only at top-level semicolons', () => {
    expect(splitMermaidStatements('graph LR; A["A;B"]-->B; C(Test;Value)')).toEqual([
      'graph LR',
      'A["A;B"]-->B',
      'C(Test;Value)',
    ])
  })
})

describe('Mermaid compact arrow compatibility', () => {
  it('renders compact and spaced arrows identically', () => {
    const compact = renderMermaidSVG('graph LR\nA-->B')
    const spaced = renderMermaidSVG('graph LR\nA --> B')

    expect(compact).toBe(spaced)
  })

  it('parses a compact text-labelled arrow', () => {
    const compact = parseMermaid('graph LR\nA--text-->B')
    const spaced = parseMermaid('graph LR\nA -- text --> B')

    expect(compact.edges).toEqual(spaced.edges)
    expect(compact.edges[0]?.label).toBe('text')
  })
})
