import assert from 'node:assert/strict'
import test from 'node:test'

import {
  renderMermaidASCII,
  renderMermaidSVG,
  renderMermaidSVGAsync,
} from 'beautiful-mermaid'

const diagram = 'graph LR; A --> B --> C'

test('the packed package renders in a Node ESM consumer', async () => {
  const svg = renderMermaidSVG(diagram)
  assert.match(svg, /<svg\b/)
  assert.doesNotMatch(svg, /<script\b/i)

  const ascii = renderMermaidASCII(diagram, { colorMode: 'none' })
  assert.equal(typeof ascii, 'string')
  assert.match(ascii, /┌/u)
  assert.match(ascii, /┐/u)
  assert.match(ascii, /\bA\b/u)
  assert.match(ascii, /\bB\b/u)
  assert.match(ascii, /\bC\b/u)

  const pendingSvg = renderMermaidSVGAsync(diagram)
  assert.ok(pendingSvg instanceof Promise)
  const asyncSvg = await pendingSvg
  assert.match(asyncSvg, /<svg\b/)
  assert.doesNotMatch(asyncSvg, /<script\b/i)

  const svgPreview = svg.slice(0, 160).replaceAll(/\s+/g, ' ')
  console.log(`[packtest] Node ${process.version}`)
  console.log(`[packtest] SVG preview: ${svgPreview}`)
  console.log(`[packtest] ASCII render:\n${ascii}`)
  console.log('[packtest] Async SVG render resolved successfully')
})
