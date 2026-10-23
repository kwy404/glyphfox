// Shared collections of the studio: the link encoding, the sanitizer, the
// merge rules of live sessions, the six words and the sealed messages.
import { describe, expect, it } from 'vitest';
import { decodeCollection, encodeCollection, payloadOf, shareLink } from '../docs/assets/js/share/codec.js';
import { Ledger, hashItem, wins } from '../docs/assets/js/share/merge.js';
import { cleanBody, cleanItem } from '../docs/assets/js/share/sanitize.js';
import { WORDLIST } from '../docs/assets/js/share/wordlist.js';
import { generateWords, resolvePhrase, resolveWord, wordsLink } from '../docs/assets/js/share/words.js';
import { ReplayGuard, deriveRoom, open, seal } from '../docs/assets/js/share/rendezvous.js';
import { strings } from '../docs/assets/js/share/strings.js';
import { PacketReader, parsePublish, publishPacket } from '../docs/assets/js/share/relay.js';
import { Room } from '../docs/assets/js/share/room.js';

const ITEMS = [
  { name: 'rocket-mark', body: '<path d="M12 3c3 3 4 7 3 12H9C8 10 9 6 12 3Z"/><circle cx="12" cy="10" r="1.5"/>', tags: ['launch', 'space'], categories: ['symbols'] },
  { name: 'duo-box', body: '<rect class="gf-secondary" x="4" y="4" width="16" height="16" rx="2" fill="currentColor" stroke="none" opacity="0.3"/><rect x="4" y="4" width="16" height="16" rx="2"/>', tags: [], categories: ['shapes'] },
];

describe('share links', () => {
  it('round trips a collection through a compressed link', async () => {
    const payload = await encodeCollection(ITEMS);
    expect(payload).toMatch(/^z1\.[A-Za-z0-9_-]+$/);
    const link = shareLink('https://kwy404.github.io/glyphfox/studio.html#collection', payload);
    expect(link).toBe(`https://kwy404.github.io/glyphfox/studio.html#share=${payload}`);
    expect(payloadOf(link)).toBe(payload);
    expect(await decodeCollection(link)).toEqual(ITEMS);
    expect(await decodeCollection(payload)).toEqual(ITEMS);
  });

  it('reads links made without compression too', async () => {
    const payload = await encodeCollection(ITEMS, { compress: false });
    expect(payload).toMatch(/^j1\./);
    expect(await decodeCollection(payload)).toEqual(ITEMS);
  });

  it('compresses repetitive collections well', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...ITEMS[i % 2], name: `icon-${i}` }));
    const z = await encodeCollection(many);
    const j = await encodeCollection(many, { compress: false });
    expect(z.length).toBeLessThan(j.length / 4);
    expect(await decodeCollection(z)).toHaveLength(60);
  });

  it('rejects links that are not glyphfox collections', async () => {
    const payload = await encodeCollection(ITEMS);
    await expect(decodeCollection('nope')).rejects.toThrow();
    await expect(decodeCollection('z9.AAAA')).rejects.toThrow();
    await expect(decodeCollection(payload.slice(0, payload.length - 12))).rejects.toThrow();
    await expect(decodeCollection(`j1.${Buffer.from('{"v":1,"i":5}').toString('base64url')}`)).rejects.toThrow();
  });

  it('keeps only safe shapes from untrusted icons', async () => {
    const evil = [
      { name: 'Évil <Icon>!', body: '<script>alert(1)</script><path d="M4 4h16" onclick="x()" style="fill:red"/><g><path d="M1 1h2"/></g><image href="x.png"/><circle cx="12" cy="12" r="javascript:1"/>', tags: ['<b>', 'Ok'], categories: [] },
      { name: 'empty', body: '<script>alert(1)</script>', tags: [], categories: [] },
    ];
    const [item, ...rest] = await decodeCollection(await encodeCollection(evil));
    expect(rest).toEqual([]);
    expect(item.name).toBe('evil-icon');
    expect(item.body).toBe('<path d="M4 4h16"/><circle cx="12" cy="12"/>');
    expect(item.tags).toEqual(['b', 'ok']);
    expect(item.categories).toEqual(['shapes']);
    expect(cleanBody('<path class="gf-secondary x" d="M1 1"/>')).toBe('<path d="M1 1"/>');
    expect(cleanItem({ name: 'a', body: 42 })).toBeNull();
  });

  it('caps the number of icons in a link', async () => {
    const many = Array.from({ length: 520 }, (_, i) => ({ ...ITEMS[0], name: `n${i}` }));
    expect(await decodeCollection(await encodeCollection(many))).toHaveLength(500);
  });
});

const item = (id, name, body = '<path d="M4 4h16"/>') => ({ id, name, body, tags: [], categories: ['shapes'] });

/** Sends every op of one ledger to another and applies the result to its list. */
function deliver(ops, ledger, list) {
  for (const op of ops) {
    const r = ledger.apply(op, cleanItem);
    if (r && r.save) {
      const i = list.findIndex((x) => x.id === r.save.id);
      if (i >= 0) list[i] = r.save;
      else list.push(r.save);
    } else if (r && r.remove) list.splice(list.findIndex((x) => x.id === r.remove), 1);
  }
  ledger.diff(list, { quiet: true });
}

const state = (list) => list.map((i) => `${i.id}:${hashItem(i)}`).sort();

describe('merge rules of live sessions', () => {
  it('stamps local edits with a growing version counter', () => {
    const ledger = new Ledger('alice');
    const list = [item('a', 'one')];
    expect(ledger.diff(list)).toMatchObject([{ id: 'a', v: 1, by: 'alice', item: { name: 'one' } }]);
    expect(ledger.diff(list)).toEqual([]);
    list[0] = item('a', 'two');
    expect(ledger.diff(list)).toMatchObject([{ id: 'a', v: 2 }]);
    expect(ledger.diff([])).toEqual([{ id: 'a', v: 3, by: 'alice', deleted: true }]);
  });

  it('lets the higher version win, then the larger author id', () => {
    expect(wins({ v: 2, by: 'a' }, { v: 1, by: 'z' })).toBe(true);
    expect(wins({ v: 1, by: 'z' }, { v: 2, by: 'a' })).toBe(false);
    expect(wins({ v: 2, by: 'b' }, { v: 2, by: 'a' })).toBe(true);
    expect(wins({ v: 2, by: 'a' }, { v: 2, by: 'b' })).toBe(false);
    expect(wins({ v: 2, by: 'a', h: 'x' }, { v: 2, by: 'a', h: 'w' })).toBe(true);
    expect(wins({ v: 1, by: 'a' }, null)).toBe(true);
  });

  it('ignores stale and invalid operations', () => {
    const ledger = new Ledger('bob');
    const list = [item('a', 'new')];
    ledger.diff(list);
    ledger.diff([item('a', 'newer')]);
    expect(ledger.apply({ id: 'a', v: 1, by: 'zed', item: item('a', 'old') })).toBeNull();
    expect(ledger.apply({ id: 'a', v: 0, by: 'x', item: item('a', 'zero') })).toBeNull();
    expect(ledger.apply({ id: '', v: 5, by: 'x', item: item('', 'none') })).toBeNull();
    expect(ledger.apply({ id: 'x" onclick="y', v: 5, by: 'x', item: item('z', 'none') })).toBeNull();
    expect(ledger.apply({ id: 'ok', v: 5, by: '<b>', item: item('ok', 'none') })).toBeNull();
    expect(ledger.apply({ id: 'b', v: 1, by: 'x', item: { name: 'bad', body: '<script/>' } }, cleanItem)).toBeNull();
    expect(ledger.apply({ id: 'a', v: 9, by: 'x', item: item('a', 'won') }, cleanItem)).toEqual({ save: { id: 'a', name: 'won', body: '<path d="M4 4h16"/>', tags: [], categories: ['shapes'] } });
  });

  it('keeps deletions with tombstones and lets a newer edit bring an icon back', () => {
    const a = new Ledger('alice');
    const listA = [item('x', 'shared')];
    const created = a.diff(listA);
    const b = new Ledger('bob');
    const listB = [];
    deliver(created, b, listB);
    expect(state(listB)).toEqual(state(listA));
    const tomb = a.diff([]);
    listA.length = 0;
    deliver(tomb, b, listB);
    expect(listB).toEqual([]);
    // A stale copy of the icon (v1) does not resurrect it.
    deliver(created, b, listB);
    expect(listB).toEqual([]);
    // A real edit made after the deletion (v3) does.
    deliver([{ id: 'x', v: 3, by: 'carol', item: item('x', 'back') }], b, listB);
    expect(listB.map((i) => i.name)).toEqual(['back']);
  });

  it('converges when two people save the same icon at once', () => {
    const a = new Ledger('alice');
    const b = new Ledger('bob');
    const listA = [item('x', 'base')];
    const listB = [];
    deliver(a.diff(listA), b, listB);
    listA[0] = item('x', 'alice-edit', '<path d="M2 2h4"/>');
    listB[0] = item('x', 'bob-edit', '<path d="M6 6h4"/>');
    const fromA = a.diff(listA);
    const fromB = b.diff(listB);
    expect(fromA[0].v).toBe(fromB[0].v);
    deliver(fromB, a, listA);
    deliver(fromA, b, listB);
    expect(state(listA)).toEqual(state(listB));
    expect(listA[0].name).toBe('bob-edit');
  });

  it('converges for random edits delivered in any order', () => {
    let seed = 7;
    const rand = (n) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const peers = ['ana', 'bea', 'caio'].map((id) => ({ ledger: new Ledger(id), list: [], inbox: [] }));
    for (let step = 0; step < 300; step++) {
      const p = peers[rand(3)];
      const id = `i${rand(6)}`;
      const at = p.list.findIndex((x) => x.id === id);
      if (rand(4) === 0 && at >= 0) p.list.splice(at, 1);
      else if (at >= 0) p.list[at] = item(id, `e${step}`);
      else p.list.push(item(id, `n${step}`));
      const ops = p.ledger.diff(p.list);
      for (const q of peers) if (q !== p) q.inbox.push(...ops);
      // Deliver a random part of someone's inbox, out of order.
      const q = peers[rand(3)];
      const take = q.inbox.splice(0, rand(q.inbox.length + 1));
      deliver(take.reverse(), q.ledger, q.list);
    }
    for (const q of peers) deliver(q.inbox.splice(0), q.ledger, q.list);
    // Late joiners exchange snapshots, as a session does on connect.
    for (const p of peers) for (const q of peers) if (p !== q) deliver(p.ledger.snapshot(p.list), q.ledger, q.list);
    expect(state(peers[1].list)).toEqual(state(peers[0].list));
    expect(state(peers[2].list)).toEqual(state(peers[0].list));
  });

  it('refreshes hashes quietly while a remote change is applied', () => {
    const ledger = new Ledger('me');
    const list = [item('a', 'one')];
    ledger.diff(list);
    list[0] = { ...list[0], name: 'renamed-by-save' };
    expect(ledger.diff(list, { quiet: true })).toEqual([]);
    expect(ledger.diff(list)).toEqual([]);
    expect(ledger.snapshot(list)).toMatchObject([{ id: 'a', v: 1, item: { name: 'renamed-by-save' } }]);
  });
});

describe('six words and sealed messages', () => {
  it('draws six words from 256 icon words', () => {
    expect(new Set(WORDLIST).size).toBe(256);
    expect(WORDLIST.every((w) => /^[a-z]+$/.test(w))).toBe(true);
    const words = generateWords();
    expect(words).toHaveLength(6);
    expect(words.every((w) => WORDLIST.includes(w))).toBe(true);
    expect(generateWords(() => Uint8Array.of(0, 1, 2, 3, 4, 255))).toEqual([WORDLIST[0], WORDLIST[1], WORDLIST[2], WORDLIST[3], WORDLIST[4], WORDLIST[255]]);
  });

  it('forgives case, accents, short starts and one typo', () => {
    expect(resolveWord(' Rocket! ')).toBe('rocket');
    expect(resolveWord('rokcet')).toBe('rocket');
    expect(resolveWord('whal')).toBe('whale');
    expect(resolveWord('zz')).toBeNull();
    const r = resolvePhrase('rocket, whale-cactus anchor crown tent');
    expect(r).toEqual({ ok: true, words: ['rocket', 'whale', 'cactus', 'anchor', 'crown', 'tent'], missing: [] });
    expect(resolvePhrase('rocket whale').missing).toEqual([2, 3, 4, 5]);
    expect(wordsLink('https://x.dev/studio.html#editor', r.words)).toBe('https://x.dev/studio.html#live=rocket-whale-cactus-anchor-crown-tent');
  });

  it('derives the same room from the same words only', async () => {
    const w = ['rocket', 'whale', 'cactus', 'anchor', 'crown', 'tent'];
    const a = await deriveRoom(w, 1000);
    const b = await deriveRoom(['Rocket', 'WHALE', 'cactus', 'anchor', 'crown', 'tent'], 1000);
    const c = await deriveRoom(['rocket', 'whale', 'cactus', 'anchor', 'crown', 'bee'], 1000);
    expect(a.topic).toMatch(/^glyphfox\/v1\/[A-Za-z0-9_-]{22}$/);
    expect(b.topic).toBe(a.topic);
    expect(c.topic).not.toBe(a.topic);
    const sealed = await seal(a.dataKey, 'data', { t: 'app', body: { k: 'ops' } });
    expect((await open(b.dataKey, 'data', sealed)).body).toEqual({ k: 'ops' });
    await expect(open(c.dataKey, 'data', sealed)).rejects.toThrow();
    await expect(open(a.key, 'data', sealed)).rejects.toThrow();
    await expect(open(a.dataKey, 'signal', sealed)).rejects.toThrow();
    const tampered = sealed.slice();
    tampered[tampered.length - 1] ^= 1;
    await expect(open(a.dataKey, 'data', tampered)).rejects.toThrow();
  });

  it('drops replayed and stale signaling messages', () => {
    let now = 1_000_000;
    const guard = new ReplayGuard({ now: () => now });
    expect(guard.accept({ ts: now, n: 'a' })).toBe(true);
    expect(guard.accept({ ts: now, n: 'a' })).toBe(false);
    expect(guard.accept({ ts: now - 12 * 60 * 1000, n: 'b' })).toBe(false);
    expect(guard.accept({ ts: now + 5 * 60 * 1000, n: 'c' })).toBe(false);
  });

  it('has every string in English and Portuguese', () => {
    expect(Object.keys(strings['pt-BR']).sort()).toEqual(Object.keys(strings.en).sort());
  });
});

// An in-memory MQTT broker behind a fake WebSocket, and fake WebRTC peers
// whose data channels deliver in memory: enough to run whole sessions.
const brokers = new Map();
class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.reader = new PacketReader();
    if (!brokers.has(url)) brokers.set(url, new Map());
    this.topics = brokers.get(url);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }
  deliver(bytes) {
    setTimeout(() => this.readyState === 1 && this.onmessage?.({ data: bytes.slice().buffer }), 0);
  }
  send(bytes) {
    for (const p of this.reader.push(bytes)) {
      if (p.type === 1) this.deliver(Uint8Array.of(0x20, 2, 0, 0));
      else if (p.type === 8) {
        const n = (p.body[2] << 8) | p.body[3];
        const topic = new TextDecoder().decode(p.body.subarray(4, 4 + n));
        if (!this.topics.has(topic)) this.topics.set(topic, new Set());
        this.topics.get(topic).add(this);
        this.deliver(Uint8Array.of(0x90, 3, p.body[0], p.body[1], 0));
      } else if (p.type === 3) {
        const { topic, payload } = parsePublish(p);
        for (const ws of this.topics.get(topic) || []) ws.deliver(publishPacket(topic, payload));
      } else if (p.type === 14) this.close();
    }
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    for (const set of this.topics.values()) set.delete(this);
    this.onclose?.();
  }
}

const pcs = new Map();
class FakeChannel {
  constructor() {
    this.readyState = 'connecting';
    this.bufferedAmount = 0;
    this.peer = null;
  }
  send(bytes) {
    const copy = bytes.slice().buffer;
    setTimeout(() => this.peer.readyState === 'open' && this.peer.onmessage?.({ data: copy }), 0);
  }
  close() {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    this.onclose?.();
    this.peer?.close();
  }
}
class FakePC {
  constructor() {
    this.id = Math.random().toString(36).slice(2);
    this.iceGatheringState = 'complete';
    this.connectionState = 'new';
    this.channels = [];
    this.handlers = new Map();
  }
  addEventListener(type, fn) {
    this.handlers.set(type, fn);
  }
  removeEventListener() {}
  createDataChannel() {
    const ch = new FakeChannel();
    this.channels.push(ch);
    return ch;
  }
  async createOffer() {
    return { type: 'offer', sdp: `offer ${this.id}` };
  }
  async createAnswer() {
    return { type: 'answer', sdp: `answer ${this.id}` };
  }
  async setLocalDescription(d) {
    this.localDescription = d;
    pcs.set(this.id, this);
  }
  async setRemoteDescription(d) {
    if (d.type !== 'answer') return;
    const other = pcs.get(d.sdp.split(' ')[1]);
    for (const mine of this.channels) {
      const theirs = new FakeChannel();
      mine.peer = theirs;
      theirs.peer = mine;
      other.ondatachannel?.({ channel: theirs });
      setTimeout(() => {
        for (const ch of [mine, theirs]) {
          ch.readyState = 'open';
          ch.onopen?.();
        }
      }, 0);
    }
  }
  close() {
    this.connectionState = 'closed';
    for (const ch of this.channels) ch.close();
  }
}

const until = async (check, ms = 4000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe('live sessions over a fake network', () => {
  it('connects a host and two guests, relays messages and handles leaving', async () => {
    const options = { iterations: 1000, brokers: ['wss://one.test/mqtt', 'wss://two.test/mqtt'], WebSocket: FakeWebSocket, RTCPeerConnection: FakePC };
    const words = ['rocket', 'whale', 'cactus', 'anchor', 'crown', 'tent'];
    const host = new Room({ ...options, info: { name: 'Ana', color: '#4ade80' } });
    const bea = new Room({ ...options, info: { name: 'Bea <b>', color: 'red' } });
    const caio = new Room({ ...options, info: { name: 'Caio', color: '#60a5fa' } });
    const stranger = new Room({ ...options, info: { name: 'Eve' } });
    const got = { host: [], bea: [], caio: [] };
    host.on('message', (body, from) => got.host.push([body.k, from]));
    bea.on('message', (body, from) => got.bea.push([body.k, from]));
    caio.on('message', (body, from) => got.caio.push([body.k, from]));
    const left = [];
    host.on('leave', (p) => left.push(p.name));
    const errors = [];
    caio.on('error', (e) => errors.push(e.message));
    try {
      await host.create(words);
      await stranger.join(['rocket', 'whale', 'cactus', 'anchor', 'crown', 'bee']);
      await bea.join(words);
      await until(() => bea.peers().length === 2);
      await caio.join(words);
      await until(() => host.peers().length === 3 && bea.peers().length === 3 && caio.peers().length === 3);
      expect(host.peers().map((p) => p.name).sort()).toEqual(['Ana', 'Bea b', 'Caio']);
      expect(bea.peers().find((p) => p.host).name).toBe('Ana');
      expect(caio.peers().find((p) => p.id === bea.id).color).toBe('#ff7a1a');
      expect(stranger.hostId).toBeNull();
      // The guests left the brokers once connected; the host stays to welcome others.
      expect(bea.hub.clients).toEqual([]);
      expect(host.hub.clients.length).toBe(2);

      bea.send({ k: 'hello-all' });
      host.send({ k: 'only-caio' }, caio.id);
      caio.send({ k: 'only-host' }, host.id);
      caio.send({ k: 'only-bea' }, bea.id);
      await until(() => got.host.length === 2 && got.caio.length === 2 && got.bea.length === 1);
      // Relayed messages take one more hop, so only the sets are compared.
      const sorted = (list) => [...list].sort((a, b) => a[0].localeCompare(b[0]));
      expect(sorted(got.host)).toEqual([['hello-all', bea.id], ['only-host', caio.id]]);
      expect(sorted(got.caio)).toEqual([['hello-all', bea.id], ['only-caio', host.id]]);
      expect(got.bea).toEqual([['only-bea', caio.id]]);

      bea.leave();
      await until(() => left.length === 1 && caio.peers().length === 2);
      expect(left).toEqual(['Bea b']);
      host.leave();
      await until(() => errors.length === 1);
      expect(caio.phase).toBe('closed');
    } finally {
      for (const r of [host, bea, caio, stranger]) r.leave();
    }
  });
});
