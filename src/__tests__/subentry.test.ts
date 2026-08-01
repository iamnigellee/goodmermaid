import { beforeAll, describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
const distDirectory = join(repositoryRoot, 'dist')

async function importDist<T>(fileName: string): Promise<T> {
  return import(pathToFileURL(join(distDirectory, fileName)).href) as Promise<T>
}

beforeAll(async () => {
  const build = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: repositoryRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    build.exited,
    new Response(build.stdout).text(),
    new Response(build.stderr).text(),
  ])

  if (exitCode !== 0) {
    throw new Error(`Subentry build failed (exit ${exitCode})\n${stdout}\n${stderr}`)
  }
})

describe('package subentries', () => {
  test('build emits JavaScript and declarations for every entry', async () => {
    const expectedFiles = [
      'index.js',
      'index.d.ts',
      'ascii-subentry.js',
      'ascii-subentry.d.ts',
      'svg-subentry.js',
      'svg-subentry.d.ts',
      'themes-subentry.js',
      'themes-subentry.d.ts',
    ]

    await Promise.all(expectedFiles.map(file => readFile(join(distDirectory, file))))
  })

  test('ASCII bundle contains no ELK implementation or layout hook', async () => {
    const source = await readFile(join(distDirectory, 'ascii-subentry.js'), 'utf8')

    expect(source).not.toMatch(/\belkjs\b/i)
    expect(source).not.toMatch(/\blayout\b/i)
    expect(source).not.toContain('saveDispatch')
  })

  test('ASCII subentry exposes only ASCII APIs and renders without ELK', async () => {
    const ascii = await importDist<typeof import('../ascii-subentry.ts')>('ascii-subentry.js')

    expect(Object.keys(ascii).sort()).toEqual([
      'DEFAULT_ASCII_THEME',
      'detectColorMode',
      'diagramColorsToAsciiTheme',
      'renderMermaidASCII',
      'renderMermaidAscii',
    ])
    expect(ascii.renderMermaidASCII('graph LR; A --> B', {
      colorMode: 'none',
      useAscii: true,
    })).toContain('A')
  })

  test('SVG subentry links ELK and renders SVG', async () => {
    const source = await readFile(join(distDirectory, 'svg-subentry.js'), 'utf8')
    const svg = await importDist<typeof import('../svg-subentry.ts')>('svg-subentry.js')

    expect(source).toMatch(/from ["']elkjs\//)
    expect(Object.keys(svg).sort()).toEqual([
      'renderMermaid',
      'renderMermaidSVG',
      'renderMermaidSVGAsync',
      'renderMermaidSync',
    ])
    expect(svg.renderMermaidSVG('graph LR; A --> B')).toStartWith('<svg')
  })

  test('themes subentry exposes the complete theme API', async () => {
    const themes = await importDist<typeof import('../themes-subentry.ts')>('themes-subentry.js')

    expect(Object.keys(themes).sort()).toEqual([
      'DEFAULTS',
      'MIX',
      'THEMES',
      'buildStyleBlock',
      'fromShikiTheme',
      'svgOpenTag',
    ])
    expect(themes.buildStyleBlock('Inter', false)).toContain('<style>')
    expect(themes.svgOpenTag(100, 50, themes.DEFAULTS)).toStartWith('<svg')
  })
})
