import { afterEach, describe, expect, it } from 'bun:test'
import { renderMermaidSVG } from '../index.ts'
import {
  __resetElkForTests,
  __setElkInitializerForTests,
  elkLayoutSync,
} from '../elk-instance.ts'

interface GlobalSnapshot {
  setTimeout: typeof globalThis.setTimeout
  self: PropertyDescriptor | undefined
}

function snapshotGlobals(): GlobalSnapshot {
  return {
    setTimeout: globalThis.setTimeout,
    self: Object.getOwnPropertyDescriptor(globalThis, 'self'),
  }
}

function expectGlobalsUnchanged(before: GlobalSnapshot): void {
  expect(globalThis.setTimeout).toBe(before.setTimeout)
  expect(Object.getOwnPropertyDescriptor(globalThis, 'self')).toEqual(before.self)
}

afterEach(() => {
  __resetElkForTests()
})

describe('ELK synchronous adapter robustness', () => {
  it('restores globalThis.setTimeout and self after normal rendering', () => {
    __resetElkForTests()
    const before = snapshotGlobals()

    const svg = renderMermaidSVG('graph LR\nA --> B')

    expect(svg).toContain('<svg')
    expectGlobalsUnchanged(before)
  })

  it('restores global objects when ELK initialization throws', () => {
    const before = snapshotGlobals()
    __setElkInitializerForTests(() => {
      throw new Error('simulated initializer failure')
    })

    expect(() => elkLayoutSync({ id: 'root' })).toThrow('simulated initializer failure')
    expectGlobalsUnchanged(before)
  })

  it('reports a clear ELK error when the private dispatcher interface is missing', () => {
    const before = snapshotGlobals()
    __setElkInitializerForTests(() => ({
      worker: {
        worker: {
          postMessage: () => {},
          onmessage: null,
          dispatcher: {},
        },
      },
    }))

    expect(() => elkLayoutSync({ id: 'root' })).toThrow(/ELK.*dispatcher\.saveDispatch/i)
    expectGlobalsUnchanged(before)
  })
})
