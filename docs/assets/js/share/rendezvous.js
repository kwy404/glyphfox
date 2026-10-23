// Everything a live session needs comes from the six words. PBKDF2-SHA256
// (250,000 iterations, fixed salt) turns the phrase into a master secret and
// HKDF splits it into three independent values: the broker topic, the key that
// seals the signaling messages and the key that seals every message between
// the peers. Brokers only see a random topic and ciphertext; the data channel
// is DTLS encrypted by WebRTC and sealed again with the words' key, so it is
// end to end encrypted with a key only the people who know the words have.

import { fromUtf8, randomBytes, randomId, toBase64Url, utf8 } from './bytes.js';
import { phraseOf } from './words.js';

export const ITERATIONS = 250000;
export const MAX_AGE_MS = 11 * 60 * 1000;
export const MAX_SKEW_MS = 2 * 60 * 1000;
const SALT = 'glyphfox share v1';
const VERSION = 1;

const subtle = () => globalThis.crypto.subtle;

/** { topic, key, dataKey } for six words. Every peer gets the same values. */
export async function deriveRoom(words, iterations = ITERATIONS) {
  const base = await subtle().importKey('raw', utf8(phraseOf(words)), 'PBKDF2', false, ['deriveBits']);
  const master = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: utf8(SALT), iterations }, base, 256);
  const hkdf = await subtle().importKey('raw', master, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8(info) });
  const aes = { name: 'AES-GCM', length: 256 };
  const topicBits = new Uint8Array(await subtle().deriveBits(params('glyphfox share topic'), hkdf, 128));
  const key = await subtle().deriveKey(params('glyphfox share signaling key'), hkdf, aes, false, ['encrypt', 'decrypt']);
  const dataKey = await subtle().deriveKey(params('glyphfox share data key'), hkdf, aes, false, ['encrypt', 'decrypt']);
  return { topic: `glyphfox/v1/${toBase64Url(topicBits)}`, key, dataKey };
}

/** Seals a JSON body: version byte, 12 byte IV, AES-GCM ciphertext (label as additional data). */
export async function seal(key, label, body, now = Date.now()) {
  const plain = utf8(JSON.stringify({ ...body, ts: now, n: randomId(12) }));
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: utf8(label) }, key, plain));
  const out = new Uint8Array(13 + ct.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(ct, 13);
  return out;
}

/** Opens a sealed body. Throws when it was sealed with other words, another label, or edited. */
export async function open(key, label, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 13 + 16 || bytes[0] !== VERSION) throw new Error('Not a glyphfox share message');
  let plain;
  try {
    plain = await subtle().decrypt({ name: 'AES-GCM', iv: bytes.subarray(1, 13), additionalData: utf8(label) }, key, bytes.subarray(13));
  } catch {
    throw new Error('Could not open the message');
  }
  const msg = JSON.parse(fromUtf8(new Uint8Array(plain)));
  if (!msg || typeof msg !== 'object' || !Number.isFinite(msg.ts) || typeof msg.n !== 'string') throw new Error('Malformed message');
  return msg;
}

/** Rejects replays (a nonce seen before) and messages too old or from the future. */
export class ReplayGuard {
  constructor({ maxAge = MAX_AGE_MS, skew = MAX_SKEW_MS, now = () => Date.now() } = {}) {
    this.maxAge = maxAge;
    this.skew = skew;
    this.now = now;
    this.seen = new Set();
  }
  accept(msg) {
    const t = this.now();
    if (msg.ts < t - this.maxAge || msg.ts > t + this.skew) return false;
    if (this.seen.has(msg.n)) return false;
    this.seen.add(msg.n);
    return true;
  }
}
