// Signaling for live sessions over public MQTT brokers, with nothing of ours
// in between: a minimal MQTT 3.1.1 client over WebSocket (CONNECT, SUBSCRIBE,
// PUBLISH at QoS 0, PINGREQ, DISCONNECT) and a hub that talks to several
// brokers at once. Whichever broker delivers first wins; duplicates are
// dropped by the replay guard. Brokers only carry a random topic and
// ciphertext (see rendezvous.js), and only while peers are finding each other.

import { Emitter, concatBytes, fromUtf8, randomId, utf8 } from './bytes.js';

export const DEFAULT_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];

const TYPES = { CONNACK: 2, PUBLISH: 3, SUBACK: 9 };

function encodeLength(n) {
  const out = [];
  do {
    let byte = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) byte |= 0x80;
    out.push(byte);
  } while (n > 0);
  return Uint8Array.from(out);
}

function decodeLength(bytes, offset) {
  let value = 0;
  let mult = 1;
  for (let i = 0; i < 4; i++) {
    if (offset + i >= bytes.length) return null;
    const b = bytes[offset + i];
    value += (b & 0x7f) * mult;
    if ((b & 0x80) === 0) return { value, size: i + 1 };
    mult *= 128;
  }
  throw new Error('Malformed MQTT remaining length');
}

function encodeString(s) {
  const b = utf8(s);
  return concatBytes([Uint8Array.of(b.length >> 8, b.length & 0xff), b]);
}

const packet = (first, body) => concatBytes([Uint8Array.of(first), encodeLength(body.length), body]);

export const connectPacket = ({ clientId, keepAlive = 30 }) => packet(0x10, concatBytes([encodeString('MQTT'), Uint8Array.of(4, 0x02, keepAlive >> 8, keepAlive & 0xff), encodeString(clientId)]));
export const subscribePacket = (id, topic) => packet(0x82, concatBytes([Uint8Array.of(id >> 8, id & 0xff), encodeString(topic), Uint8Array.of(0)]));
export const publishPacket = (topic, payload) => packet(0x30, concatBytes([encodeString(topic), payload]));

/** Splits a byte stream into packets { type, flags, body }, across partial and joined frames. */
export class PacketReader {
  constructor() {
    this.buf = new Uint8Array(0);
  }
  push(bytes) {
    this.buf = this.buf.length ? concatBytes([this.buf, bytes]) : bytes;
    const out = [];
    for (;;) {
      if (this.buf.length < 2) break;
      const len = decodeLength(this.buf, 1);
      if (!len) break;
      const end = 1 + len.size + len.value;
      if (this.buf.length < end) break;
      out.push({ type: this.buf[0] >> 4, flags: this.buf[0] & 0x0f, body: this.buf.slice(1 + len.size, end) });
      this.buf = this.buf.subarray(end);
    }
    return out;
  }
}

export function parsePublish(p) {
  const n = (p.body[0] << 8) | p.body[1];
  const topic = fromUtf8(p.body.subarray(2, 2 + n));
  const qos = (p.flags >> 1) & 3;
  return { topic, payload: p.body.subarray(2 + n + (qos > 0 ? 2 : 0)) };
}

class MqttClient extends Emitter {
  constructor(url, { WebSocket = globalThis.WebSocket, timeout = 8000 } = {}) {
    super();
    this.url = url;
    this.WebSocket = WebSocket;
    this.timeout = timeout;
    this.reader = new PacketReader();
    this.pending = null;
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) {
          this.close();
          reject(err);
        } else resolve(this);
      };
      const timer = setTimeout(() => done(new Error(`${this.url}: no answer`)), this.timeout);
      let ws;
      try {
        ws = new this.WebSocket(this.url, ['mqtt']);
      } catch (err) {
        done(err);
        return;
      }
      this.ws = ws;
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => ws.send(connectPacket({ clientId: `gf${randomId(9).replace(/[-_]/g, 'x')}` }));
      ws.onerror = () => done(new Error(`${this.url}: connection error`));
      ws.onclose = () => {
        done(new Error(`${this.url}: closed`));
        this.closed();
      };
      ws.onmessage = (e) => {
        for (const p of this.reader.push(new Uint8Array(e.data))) {
          if (p.type === TYPES.CONNACK) {
            if (p.body[1] === 0) {
              this.ping = setInterval(() => this.send(Uint8Array.of(0xc0, 0)), 25000);
              done();
            } else done(new Error(`${this.url}: refused (${p.body[1]})`));
          } else if (p.type === TYPES.PUBLISH) this.emit('message', parsePublish(p));
          else if (p.type === TYPES.SUBACK && this.pending) {
            const ok = p.body[2] !== 0x80;
            const w = this.pending;
            this.pending = null;
            ok ? w.resolve() : w.reject(new Error(`${this.url}: subscription refused`));
          }
        }
      };
    });
  }

  send(bytes) {
    if (this.ws?.readyState === 1) this.ws.send(bytes);
  }

  subscribe(topic) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        reject(new Error(`${this.url}: no subscription answer`));
      }, this.timeout);
      this.pending = { resolve: () => (clearTimeout(timer), resolve()), reject: (e) => (clearTimeout(timer), reject(e)) };
      this.send(subscribePacket(1, topic));
    });
  }

  publish(topic, payload) {
    this.send(publishPacket(topic, payload));
  }

  closed() {
    clearInterval(this.ping);
    if (this.pending) this.pending.reject(new Error(`${this.url}: closed`));
    this.pending = null;
    this.emit('close');
  }

  close() {
    if (!this.ws) return;
    const ws = this.ws;
    this.ws = null;
    try {
      if (ws.readyState === 1) ws.send(Uint8Array.of(0xe0, 0));
      ws.close();
    } catch {
      // already gone
    }
    clearInterval(this.ping);
  }
}

/** Several brokers used in parallel as one meeting point for a topic. */
export class RelayHub extends Emitter {
  constructor(topic, { brokers = DEFAULT_BROKERS, WebSocket, timeout = 9000 } = {}) {
    super();
    this.topic = topic;
    this.brokers = brokers;
    this.WebSocket = WebSocket;
    this.timeout = timeout;
    this.clients = [];
    this.failed = [];
    this.stopped = false;
  }

  /** Resolves as soon as one broker is subscribed, rejects when none can be. */
  start() {
    return new Promise((resolve, reject) => {
      let finished = 0;
      let settled = false;
      for (const url of this.brokers) {
        const client = new MqttClient(url, { WebSocket: this.WebSocket, timeout: this.timeout });
        client
          .connect()
          .then(() => (this.stopped ? Promise.reject(new Error('stopped')) : client.subscribe(this.topic)))
          .then(() => {
            if (this.stopped) return client.close();
            client.on('message', (m) => m.topic === this.topic && this.emit('message', m.payload));
            client.on('close', () => {
              this.clients = this.clients.filter((c) => c !== client);
              this.emit('status', this.status());
            });
            this.clients.push(client);
            this.emit('status', this.status());
            if (!settled) {
              settled = true;
              resolve(this);
            }
          })
          .catch((err) => {
            client.close();
            this.failed.push(`${url}: ${err.message}`);
          })
          .finally(() => {
            finished++;
            if (!settled && finished === this.brokers.length) {
              settled = true;
              reject(new Error(`No public relay answered (${this.failed.join('; ')})`));
            }
          });
      }
    });
  }

  status() {
    return { connected: this.clients.length, total: this.brokers.length };
  }

  publish(payload) {
    for (const c of this.clients) c.publish(this.topic, payload);
    return this.clients.length;
  }

  close() {
    this.stopped = true;
    for (const c of this.clients) c.close();
    this.clients = [];
  }
}
