/**
 * Shared ELK instance singleton.
 *
 * Uses elk.bundled.js (pure synchronous JS, ~1.6 MB) for all environments.
 * The singleton is created lazily on first use and cached forever.
 *
 * ELK's FakeWorker wraps both postMessage and onmessage in setTimeout(0),
 * making the normal API fully async. To bypass this:
 *   1. During construction, we capture setTimeout(0) callbacks and flush them
 *      synchronously — this registers the layout algorithms immediately.
 *   2. For layout calls, we call dispatcher.saveDispatch() directly (skipping
 *      the FakeWorker's postMessage setTimeout) and intercept the result via
 *      rawWorker.onmessage (which the dispatcher calls synchronously).
 */

import type { ElkNode } from 'elkjs'
// @ts-ignore — static import of bundled ELK
import ELKBundled from 'elkjs/lib/elk.bundled.js'

interface RawFakeWorker {
  postMessage(msg: unknown): void
  onmessage: ((e: { data: Record<string, unknown> }) => void) | null
  dispatcher: {
    saveDispatch(msg: { data: Record<string, unknown> }): void
  }
}

let elk: unknown = null
let rawWorker: RawFakeWorker | null = null

type ElkInitializer = () => unknown

const defaultElkInitializer: ElkInitializer = () => new ELKBundled()
let elkInitializer: ElkInitializer = defaultElkInitializer

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Validate the private ELK worker interface used by the synchronous adapter. */
function getRawWorker(instance: unknown): RawFakeWorker {
  if (!isRecord(instance) || !isRecord(instance.worker) || !isRecord(instance.worker.worker)) {
    throw new Error('ELK initialization failed: required private worker.worker interface is unavailable')
  }

  const worker = instance.worker.worker
  if (typeof worker.postMessage !== 'function' || !('onmessage' in worker)) {
    throw new Error('ELK initialization failed: required private FakeWorker interface is unavailable')
  }
  if (!isRecord(worker.dispatcher) || typeof worker.dispatcher.saveDispatch !== 'function') {
    throw new Error('ELK initialization failed: required private dispatcher.saveDispatch() interface is unavailable')
  }

  return worker as unknown as RawFakeWorker
}

/**
 * Ensure the ELK singleton exists.
 *
 * Patches setTimeout during construction to capture and synchronously flush
 * the algorithm registration callback that ELK queues via setTimeout(0).
 * Without this, layout calls fail with "algorithm not found" until the
 * next macrotask.
 */
function ensureElk(): void {
  if (elk) return

  // Capture setTimeout(0) callbacks queued during ELK construction
  const pending: (() => void)[] = []
  const origSetTimeout = globalThis.setTimeout
  const g = globalThis as Record<string, unknown>
  const selfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self')
  const shouldHideSelf = selfDescriptor !== undefined && typeof g.document === 'undefined'

  let instance: unknown
  try {
    // @ts-ignore — simplified signature for intercepting ELK's zero-delay callbacks
    globalThis.setTimeout = (fn: () => void, delay?: number) => {
      if (delay === 0) { pending.push(fn); return 0 }
      return origSetTimeout(fn, delay)
    }

    // Bun defines `self` (= globalThis) but not `document`, which tricks
    // elk-worker.min.js into taking the Web Worker branch instead of the
    // CJS branch. Temporarily hide `self` so it exports {Worker: FakeWorker}.
    if (shouldHideSelf && !Reflect.deleteProperty(g, 'self')) {
      throw new Error('ELK initialization failed: unable to temporarily hide globalThis.self')
    }

    instance = elkInitializer()
  } finally {
    globalThis.setTimeout = origSetTimeout
    if (selfDescriptor) {
      Object.defineProperty(globalThis, 'self', selfDescriptor)
    } else {
      Reflect.deleteProperty(g, 'self')
    }
  }

  // Flush captured callbacks synchronously — registers layout algorithms
  try {
    pending.forEach(fn => fn())

    // Cache only after initialization and private-interface validation succeed.
    const worker = getRawWorker(instance)
    elk = instance
    rawWorker = worker
  } catch (error) {
    elk = null
    rawWorker = null
    throw error
  }
}

/** Replace the ELK constructor and clear the singleton for robustness tests. */
export function __setElkInitializerForTests(initializer: ElkInitializer): void {
  elkInitializer = initializer
  elk = null
  rawWorker = null
}

/** Restore the production ELK constructor and clear the singleton. */
export function __resetElkForTests(): void {
  elkInitializer = defaultElkInitializer
  elk = null
  rawWorker = null
}

/**
 * Run ELK layout synchronously.
 *
 * Bypasses BOTH of ELK's setTimeout(0) wrappers:
 *   - FakeWorker.postMessage wraps dispatch in setTimeout(0) — bypassed by
 *     calling dispatcher.saveDispatch() directly
 *   - PromisedWorker.onmessage wraps receive in setTimeout(0) — bypassed by
 *     replacing rawWorker.onmessage with a direct interceptor
 */
export function elkLayoutSync(graph: ElkNode): ElkNode {
  ensureElk()
  const worker = rawWorker
  if (!worker) {
    throw new Error('ELK synchronous adapter is unavailable after initialization')
  }

  let result: ElkNode | undefined
  let error: unknown

  // Replace onmessage to intercept the result synchronously
  // (the dispatcher calls this directly, without setTimeout)
  const origOnmessage = worker.onmessage
  worker.onmessage = (answer: { data: Record<string, unknown> }) => {
    if (answer.data.error) {
      error = answer.data.error
    } else {
      result = answer.data.data as ElkNode
    }
  }

  // Call dispatcher.saveDispatch directly — bypasses FakeWorker.postMessage's
  // setTimeout(0) wrapper. The dispatcher processes the layout synchronously
  // and calls rawWorker.onmessage with the result.
  try {
    worker.dispatcher.saveDispatch({ data: { id: 0, cmd: 'layout', graph } as unknown as Record<string, unknown> })
  } finally {
    worker.onmessage = origOnmessage
  }

  if (error) throw error
  if (!result) throw new Error('ELK layout did not return synchronously')
  return result
}
