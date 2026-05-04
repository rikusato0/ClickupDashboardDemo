/**
 * Node < 19 does not expose `globalThis.crypto` (Web Crypto).
 * Some deps use `crypto.randomUUID()` etc. and throw ReferenceError without this.
 */
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto) {
  ;(globalThis as typeof globalThis & { crypto: Crypto }).crypto =
    webcrypto as Crypto
}
