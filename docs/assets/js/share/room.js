// A live session: peers connected over WebRTC data channels, found through
// public MQTT brokers with nothing but six words.
//   host:  derives the room from the words, waits for knocks and sends each
//          new guest a WebRTC offer (up to MAX_GUESTS guests at once)
//   guest: knocks until its offer arrives, answers, then leaves the brokers
// The host forwards messages between guests, so everyone sees everyone. Every
// signaling message is sealed with the words' key, and every data channel
// message is sealed again with the words' data key (see rendezvous.js).

import { Emitter, randomId } from './bytes.js';
import { RelayHub } from './relay.js';
import { ITERATIONS, ReplayGuard, deriveRoom, open, seal } from './rendezvous.js';

export const MAX_GUESTS = 7;
export const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const KNOCK_EVERY_MS = 1500;
const JOIN_TIMEOUT_MS = 45000;
const ANSWER_REPEATS = 12;
const ICE_WAIT_MS = 5000;
const SIGNAL = 'glyphfox share signal';
const DATA = 'glyphfox share data';
const HIGH_WATER = 1024 * 1024;

/** Resolves when ICE gathering is complete (or after a few seconds with what was found). */
function gathered(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    const timer = setTimeout(done, ICE_WAIT_MS);
    pc.addEventListener('icegatheringstatechange', check);
  });
}

/** One peer connection and its data channel. Messages are sealed and kept in order both ways. */
class Link extends Emitter {
  constructor(id, pc, dataKey) {
    super();
    this.id = id;
    this.pc = pc;
    this.dataKey = dataKey;
    this.dc = null;
    this.info = null;
    this.answered = false;
    this.out = Promise.resolve();
    this.in = Promise.resolve();
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.emit('close');
    });
  }

  attach(dc) {
    this.dc = dc;
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => this.emit('open');
    dc.onclose = () => this.emit('close');
    dc.onmessage = (e) => {
      const bytes = new Uint8Array(e.data);
      this.in = this.in.then(async () => {
        let msg;
        try {
          msg = await open(this.dataKey, DATA, bytes);
        } catch {
          return; // not sealed with these words: ignore it
        }
        this.emit('message', msg);
      });
    };
  }

  get open() {
    return this.dc?.readyState === 'open';
  }

  send(msg) {
    this.out = this.out.then(async () => {
      if (!this.open) return;
      const bytes = await seal(this.dataKey, DATA, msg);
      if (this.dc.bufferedAmount > HIGH_WATER) {
        await new Promise((resolve) => {
          this.dc.bufferedAmountLowThreshold = HIGH_WATER / 4;
          this.dc.onbufferedamountlow = () => {
            this.dc.onbufferedamountlow = null;
            resolve();
          };
        });
      }
      if (this.open) this.dc.send(bytes);
    });
    return this.out;
  }

  close() {
    try {
      this.dc?.close();
      this.pc.close();
    } catch {
      // already closed
    }
  }
}

export class Room extends Emitter {
  /** info: what peers see about us ({ name, color }). */
  constructor({ info = {}, iterations = ITERATIONS, brokers, WebSocket, RTCPeerConnection = globalThis.RTCPeerConnection, iceServers = ICE_SERVERS } = {}) {
    super();
    this.id = randomId(9);
    this.info = info;
    this.iterations = iterations;
    this.hubOptions = { ...(brokers ? { brokers } : {}), ...(WebSocket ? { WebSocket } : {}) };
    this.RTC = RTCPeerConnection;
    this.iceServers = iceServers;
    this.guard = new ReplayGuard();
    this.links = new Map();
    this.roster = new Map();
    this.timers = [];
    this.hub = null;
    this.role = null;
    this.hostId = null;
    this.stopped = false;
  }

  /** Every peer we know, us included: [{ id, name, color, host, me }]. */
  peers() {
    return [...this.roster.values()];
  }

  status(phase) {
    this.phase = phase;
    this.emit('status', { phase, brokers: this.hub ? this.hub.status() : null, peers: this.roster.size - 1 });
  }

  async meet(words) {
    if (!this.RTC) throw new Error('This browser has no WebRTC');
    this.status('deriving');
    this.rv = await deriveRoom(words, this.iterations);
    if (this.stopped) throw new Error('stopped');
    this.status('connecting');
    this.hub = new RelayHub(this.rv.topic, this.hubOptions);
    this.hub.on('message', (payload) => this.receive(payload));
    this.hub.on('status', () => this.status(this.phase));
    await this.hub.start();
    if (this.stopped) throw new Error('stopped');
  }

  /** Opens a room for six words and waits for guests. */
  async create(words) {
    this.role = 'host';
    this.hostId = this.id;
    this.roster.set(this.id, { ...this.info, id: this.id, host: true, me: true });
    await this.meet(words);
    this.status('waiting');
  }

  /** Joins the room of six words. Emits 'error' when no host answers in time. */
  async join(words) {
    this.role = 'guest';
    this.roster.set(this.id, { ...this.info, id: this.id, host: false, me: true });
    await this.meet(words);
    this.status('joining');
    this.after(JOIN_TIMEOUT_MS, () => {
      if (!this.hostId) this.fail(new Error('Nobody answered these words. Check them and try again.'));
    });
    this.every(KNOCK_EVERY_MS, () => !this.hostId && this.signal({ k: 'join' }));
  }

  async signal(body) {
    if (this.stopped || !this.hub) return;
    this.hub.publish(await seal(this.rv.key, SIGNAL, { ...body, f: this.id }));
  }

  async receive(payload) {
    let msg;
    try {
      msg = await open(this.rv.key, SIGNAL, payload);
    } catch {
      return; // other words or noise
    }
    if (this.stopped || msg.f === this.id || typeof msg.f !== 'string' || !this.guard.accept(msg)) return;
    if (this.role === 'host') this.hostSignal(msg);
    else this.guestSignal(msg);
  }

  async hostSignal(msg) {
    if (msg.k === 'join') {
      const known = this.links.get(msg.f);
      if (known) {
        if (!known.answered && known.offer) this.signal({ k: 'offer', to: msg.f, sdp: known.offer });
        return;
      }
      if (this.links.size >= MAX_GUESTS) return;
      const pc = new this.RTC({ iceServers: this.iceServers });
      const link = this.track(new Link(msg.f, pc, this.rv.dataKey));
      link.attach(pc.createDataChannel('glyphfox', { ordered: true }));
      this.after(JOIN_TIMEOUT_MS + KNOCK_EVERY_MS * ANSWER_REPEATS, () => !link.open && this.drop(link));
      await pc.setLocalDescription(await pc.createOffer());
      await gathered(pc);
      if (this.stopped) return;
      link.offer = pc.localDescription.sdp;
      this.signal({ k: 'offer', to: msg.f, sdp: link.offer });
    } else if (msg.k === 'answer' && msg.to === this.id && typeof msg.sdp === 'string') {
      const link = this.links.get(msg.f);
      if (!link || link.answered) return;
      link.answered = true;
      try {
        await link.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      } catch (err) {
        this.drop(link);
        this.emit('error', err);
      }
    }
  }

  async guestSignal(msg) {
    if (msg.k !== 'offer' || msg.to !== this.id || this.hostId || typeof msg.sdp !== 'string') return;
    this.hostId = msg.f;
    const pc = new this.RTC({ iceServers: this.iceServers });
    const link = this.track(new Link(msg.f, pc, this.rv.dataKey));
    pc.ondatachannel = (e) => link.attach(e.channel);
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
    } catch (err) {
      this.fail(err);
      return;
    }
    let n = 0;
    const sdp = pc.localDescription.sdp;
    this.every(KNOCK_EVERY_MS, () => !link.open && n++ < ANSWER_REPEATS && this.signal({ k: 'answer', to: this.hostId, sdp }));
    this.after(KNOCK_EVERY_MS * (ANSWER_REPEATS + 8), () => {
      if (!link.open) this.fail(new Error('The connection could not be opened. A strict firewall may block peer to peer links.'));
    });
  }

  /** Wires a link's events into the room. */
  track(link) {
    this.links.set(link.id, link);
    link.on('open', () => {
      link.send({ t: 'hello', peer: { id: this.id, name: this.info.name, color: this.info.color } });
      if (this.role === 'guest') {
        // Connected: the brokers are no longer needed.
        this.stopTimers();
        this.hub?.close();
      }
    });
    link.on('message', (msg) => this.onData(link, msg));
    link.on('close', () => this.drop(link));
    return link;
  }

  drop(link) {
    if (!this.links.has(link.id)) return;
    this.links.delete(link.id);
    link.close();
    const peer = this.roster.get(link.id);
    if (this.role === 'host') {
      this.roster.delete(link.id);
      if (peer) this.emit('leave', peer);
      this.broadcastRoster();
      this.status('waiting');
    } else if (!this.stopped) {
      this.roster.clear();
      this.fail(new Error('The session ended.'));
    }
  }

  onData(link, msg) {
    if (this.stopped || !this.links.has(link.id)) return;
    if (msg.t === 'hello' && msg.peer && typeof msg.peer === 'object') {
      const peer = { id: link.id, name: cleanText(msg.peer.name, 32) || 'Guest', color: cleanColor(msg.peer.color), host: this.role === 'guest', me: false };
      const first = !link.info;
      link.info = peer;
      if (this.role === 'host') {
        this.roster.set(link.id, peer);
        this.broadcastRoster();
      } else this.roster.set(link.id, peer);
      if (first) this.emit('join', peer);
      this.status('connected');
    } else if (msg.t === 'roster' && this.role === 'guest' && Array.isArray(msg.peers)) {
      const before = new Set(this.roster.keys());
      const next = new Map([[this.id, this.roster.get(this.id)]]);
      for (const p of msg.peers.slice(0, MAX_GUESTS + 1)) {
        if (!p || typeof p.id !== 'string' || p.id === this.id) continue;
        next.set(p.id, { id: p.id, name: cleanText(p.name, 32) || 'Guest', color: cleanColor(p.color), host: p.id === this.hostId, me: false });
      }
      this.roster = next;
      for (const [id, p] of next) if (!before.has(id)) this.emit('join', p);
      for (const id of before) if (!next.has(id)) this.emit('leave', { id });
      this.emit('roster', this.peers());
    } else if (msg.t === 'app' && msg.body && typeof msg.body === 'object') {
      const from = this.role === 'host' ? link.id : typeof msg.from === 'string' ? msg.from : link.id;
      if (this.role === 'host') {
        // Forward between guests: to one peer, or to everyone but the sender.
        if (typeof msg.to === 'string' && msg.to !== this.id) {
          this.links.get(msg.to)?.send({ t: 'app', from, body: msg.body });
          return;
        }
        if (!msg.to) for (const other of this.links.values()) if (other !== link && other.info) other.send({ t: 'app', from, body: msg.body });
      }
      this.emit('message', msg.body, from);
    }
  }

  broadcastRoster() {
    const peers = this.peers().map(({ id, name, color, host }) => ({ id, name, color, host }));
    for (const link of this.links.values()) if (link.info) link.send({ t: 'roster', peers });
    this.emit('roster', this.peers());
  }

  /** Sends an app message to everyone, or to one peer with to. */
  send(body, to) {
    if (this.role === 'host') {
      if (to) return this.links.get(to)?.send({ t: 'app', body });
      for (const link of this.links.values()) if (link.info) link.send({ t: 'app', body });
    } else {
      const link = this.links.get(this.hostId);
      if (link?.open) link.send({ t: 'app', to: to || undefined, body });
    }
  }

  every(ms, fn) {
    const t = setInterval(fn, ms);
    this.timers.push(() => clearInterval(t));
    fn();
  }

  after(ms, fn) {
    const t = setTimeout(fn, ms);
    this.timers.push(() => clearTimeout(t));
  }

  stopTimers() {
    for (const off of this.timers) off();
    this.timers = [];
  }

  fail(err) {
    if (this.stopped) return;
    this.emit('error', err);
    this.leave();
  }

  /** Leaves the room: closes every link, every broker and every timer. */
  leave() {
    if (this.stopped) return;
    this.stopped = true;
    this.stopTimers();
    this.hub?.close();
    for (const link of this.links.values()) link.close();
    this.links.clear();
    this.status('closed');
  }
}

/** Plain text of at most max characters. */
export function cleanText(text, max) {
  return String(text ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .slice(0, max);
}

/** A #rrggbb color, or the accent orange. */
export function cleanColor(color) {
  return /^#[0-9a-f]{6}$/i.test(String(color)) ? String(color) : '#ff7a1a';
}
