/**
 * Ensure Web Crypto exists on `globalThis` with `getRandomValues`.
 * - Node < 19 has no global Web Crypto by default.
 * - BSON (mongoose) picks a fast path from `globalThis.crypto` but then calls bare
 *   `crypto.getRandomValues` in `bson.node.mjs`; `Object.defineProperty` matches how
 *   Node exposes this so the identifier resolves reliably across load orders.
 */
import { webcrypto } from 'node:crypto'

const g = globalThis as typeof globalThis & { crypto?: Crypto }

const hasWebCrypto =
  g.crypto != null && typeof g.crypto.getRandomValues === 'function'

if (!hasWebCrypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto as Crypto,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}
