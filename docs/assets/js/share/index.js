// Shared collections in the studio: a link that carries the whole collection
// in its fragment (#share=...), and live sessions where friends edit one
// collection together over WebRTC, with presence (who is editing what).
// Hooks: studio.js calls route() for #share= and #live= and init() once the
// icons are loaded; everything else lives here.

import { $, $$, copy, gf, lang, toast } from '../app.js';
import * as collection from '../collection.js';
import { editingId } from '../editor.js';
import { randomId } from './bytes.js';
import { decodeCollection, encodeCollection, shareLink } from './codec.js';
import { Ledger, hashItem } from './merge.js';
import { Room } from './room.js';
import { cleanItem } from './sanitize.js';
import { phrase } from './strings.js';
import { WORD_COUNT, generateWords, phraseOf, resolvePhrase, splitPhrase, wordsLink } from './words.js';

const s = (key, vars) => phrase(lang, key, vars);
const COLORS = ['#ff7a1a', '#4ade80', '#60a5fa', '#f472b6', '#facc15', '#a78bfa', '#2dd4bf', '#fb7185'];
const LEDGER_KEY = 'gf-share-ledger';
const PRESENCE_EVERY_MS = 1500;
const OPS_PER_MESSAGE = 12;

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // private mode: keep it in memory
    }
  },
};

const me = (() => {
  let id = store.get('gf-share-me', '');
  if (!/^[A-Za-z0-9_-]{8,24}$/.test(id)) store.set('gf-share-me', (id = randomId(9)));
  return id;
})();

let data = null;
let ledger = null;
let room = null;
let words = null;
let applying = false;
let pendingImport = null;
const presence = new Map(); // peer id -> { tool, editing, editingName }
let lastPresence = '';
let presenceTimer = 0;
let ui = null;

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function icon(name, size = 16) {
  const ic = gf.lookupIcon(name);
  return ic ? gf.renderToString(ic, { size }) : '';
}

/** The picture of a pairing word: the icon of that name, or the first icon with that tag. */
function wordIcon(word) {
  if (gf.lookupIcon(word)) return icon(word, 18);
  const hit = data && data.icons.find((i) => i.tags.includes(word));
  return hit ? gf.renderToString(hit, { size: 18 }) : '';
}

function loadLedger() {
  let entries = [];
  try {
    entries = JSON.parse(store.get(LEDGER_KEY, '[]'));
  } catch {
    entries = [];
  }
  return new Ledger(me, Array.isArray(entries) ? entries : []);
}

function saveLedger() {
  store.set(LEDGER_KEY, JSON.stringify(ledger.entries()));
}

function myInfo() {
  let color = store.get('gf-share-color', '');
  if (!COLORS.includes(color)) store.set('gf-share-color', (color = COLORS[Math.floor(Math.random() * COLORS.length)]));
  const name = (ui?.name.value || store.get('gf-share-name', '')).trim().slice(0, 32) || `${s('live.guest')} ${me.slice(0, 3).toUpperCase()}`;
  store.set('gf-share-name', name);
  return { name, color };
}

// Share link -----------------------------------------------------------------

async function copyLink() {
  const list = collection.load();
  if (!list.length) {
    toast(s('link.empty'));
    return;
  }
  try {
    const link = shareLink(location.href, await encodeCollection(list));
    await copy(link, link.length > 8000 ? s('link.long', { k: Math.round(link.length / 1024) }) : s('link.copied', { n: list.length }));
  } catch {
    toast(s('link.failed'));
  }
}

async function showImport(payload) {
  let items;
  try {
    items = await decodeCollection(payload);
  } catch {
    toast(s('import.bad'));
    return;
  }
  if (!items.length) {
    toast(s('import.bad'));
    return;
  }
  pendingImport = items;
  const box = ui.importBox;
  box.hidden = false;
  box.querySelector('[data-share-import-title]').textContent = items.length === 1 ? s('import.title.one') : s('import.title', { n: items.length });
  box.querySelector('[data-share-import-grid]').innerHTML = items
    .slice(0, 24)
    .map((i) => `<span class="share-tile" title="${esc(i.name)}">${gf.renderToString({ name: i.name, body: i.body, tags: i.tags, categories: i.categories }, { size: 28 })}</span>`)
    .join('');
}

function addImport() {
  const items = pendingImport || [];
  pendingImport = null;
  ui.importBox.hidden = true;
  const have = new Set(collection.load().map((i) => hashItem(i)));
  let added = 0;
  for (const item of [...items].reverse()) {
    if (have.has(hashItem(item))) continue;
    have.add(hashItem(item));
    collection.save({ ...item, source: 'link' });
    added++;
  }
  toast(added ? s('import.done', { n: added }) : s('import.none'));
}

// Live session ---------------------------------------------------------------

function sendOps(ops, to) {
  for (let i = 0; i < ops.length; i += OPS_PER_MESSAGE) room.send({ k: 'ops', ops: ops.slice(i, i + OPS_PER_MESSAGE) }, to);
}

function onCollectionChange(list) {
  if (!room || !ledger) return;
  if (applying) {
    ledger.diff(list, { quiet: true });
    return;
  }
  const ops = ledger.diff(list);
  saveLedger();
  if (ops.length) sendOps(ops);
}

function peerName(id) {
  const p = room && room.roster.get(id);
  return p ? p.name : s('live.guest');
}

function applyOps(ops, from) {
  if (!Array.isArray(ops)) return;
  const before = new Map(collection.load().map((i) => [i.id, i.name]));
  let last = null;
  applying = true;
  try {
    for (const op of ops.slice(0, OPS_PER_MESSAGE * 2)) {
      const r = ledger.apply(op, cleanItem);
      if (!r) continue;
      if (r.save) {
        collection.save({ ...r.save, source: 'live' });
        last = s('live.updated', { name: peerName(from), icon: r.save.name });
      } else if (r.remove) {
        collection.remove(r.remove);
        last = s('live.removed', { name: peerName(from), icon: before.get(r.remove) || '' });
      }
    }
  } finally {
    applying = false;
  }
  saveLedger();
  if (last && ops.length === 1) toast(last);
}

function currentPresence() {
  const tab = $('[data-studio-tabs] [aria-selected="true"]');
  const tool = tab ? tab.dataset.tool : '';
  const id = tool === 'editor' ? editingId() : null;
  const item = id ? collection.get(id) : null;
  return { tool, editing: item ? id : null, editingName: item ? item.name : '' };
}

function sendPresence(force = false) {
  if (!room) return;
  const p = currentPresence();
  const key = JSON.stringify(p);
  if (!force && key === lastPresence) return;
  lastPresence = key;
  room.send({ k: 'presence', ...p });
  decorate();
}

function onMessage(body, from) {
  if (body.k === 'ops') applyOps(body.ops, from);
  else if (body.k === 'presence') {
    const tool = typeof body.tool === 'string' ? body.tool.slice(0, 16) : '';
    const editing = typeof body.editing === 'string' ? body.editing.slice(0, 64) : null;
    const editingName = typeof body.editingName === 'string' ? body.editingName.slice(0, 64) : '';
    presence.set(from, { tool, editing, editingName });
    renderPeople();
    decorate();
  }
}

async function startSession(joinWords) {
  if (room) return;
  const info = myInfo();
  ledger = ledger || loadLedger();
  // Stamp whatever changed here since the last session before anyone asks for it.
  ledger.diff(collection.load());
  saveLedger();
  const r = new Room({ info });
  room = r;
  presence.clear();
  lastPresence = '';
  r.on('status', ({ phase }) => {
    if (room === r) renderLive(phase);
  });
  r.on('roster', () => room === r && renderPeople());
  r.on('join', (peer) => {
    if (room !== r) return;
    if (r.role === 'host') sendOps(ledger.snapshot(collection.load()), peer.id);
    else if (peer.host) sendOps(ledger.snapshot(collection.load()));
    sendPresence(true);
    if (!peer.host || r.role === 'host') toast(s('live.joined', { name: peer.name }));
    renderPeople();
  });
  r.on('leave', (peer) => {
    if (room !== r) return;
    presence.delete(peer.id);
    if (peer.name) toast(s('live.gone', { name: peer.name }));
    renderPeople();
    decorate();
  });
  r.on('message', (body, from) => room === r && onMessage(body, from));
  r.on('error', (err) => {
    if (room !== r) return;
    toast(err.message);
  });
  r.on('status', ({ phase }) => {
    if (phase === 'closed' && room === r) endSession(false);
  });
  presenceTimer = setInterval(() => sendPresence(false), PRESENCE_EVERY_MS);
  renderLive('deriving');
  try {
    if (joinWords) {
      words = joinWords;
      await r.join(joinWords);
    } else {
      words = generateWords();
      await r.create(words);
    }
  } catch (err) {
    if (room === r) {
      toast(err.message === 'stopped' ? s('live.left') : err.message);
      r.leave();
      endSession(false);
    }
  }
}

function endSession(user = true) {
  const r = room;
  room = null;
  words = null;
  clearInterval(presenceTimer);
  presence.clear();
  if (r) r.leave();
  if (user) toast(s('live.left'));
  renderLive('idle');
  decorate();
}

// Rendering ------------------------------------------------------------------

function avatar(p) {
  const letter = esc((p.name || '?').trim().charAt(0).toUpperCase() || '?');
  return `<span class="share-avatar" style="--c:${p.color}" aria-hidden="true">${letter}</span>`;
}

function activity(id) {
  const p = presence.get(id);
  if (!p) return s('live.activity.away');
  if (p.editing && p.editingName) return s('live.activity.editing', { icon: p.editingName });
  const key = `live.activity.${p.tool}`;
  const text = phrase(lang, key);
  return text === key ? s('live.activity.away') : text;
}

function renderPeople() {
  if (!ui || !room) return;
  const list = room.peers();
  ui.people.innerHTML = list
    .map((p) => {
      const tags = [p.me ? s('live.you') : '', p.host ? s('live.host') : ''].filter(Boolean).join(', ');
      return `<li>${avatar(p)}<span class="share-who"><b>${esc(p.name)}</b>${tags ? ` <small>(${esc(tags)})</small>` : ''}<span class="faint">${esc(p.me ? '' : activity(p.id))}</span></span></li>`;
    })
    .join('');
  ui.peopleBox.hidden = list.length < 2;
}

function renderWords() {
  if (!words || !room || room.role !== 'host') {
    ui.wordsBox.hidden = true;
    return;
  }
  ui.wordsBox.hidden = false;
  ui.wordList.innerHTML = words.map((w, i) => `<li><span class="share-n">${i + 1}</span>${wordIcon(w)}<b>${esc(w)}</b></li>`).join('');
}

function renderLive(phase) {
  if (!ui) return;
  const active = Boolean(room) && phase !== 'idle' && phase !== 'closed';
  ui.idle.hidden = active;
  ui.active.hidden = !active;
  if (active) {
    ui.status.textContent = s(`live.status.${phase}`);
    ui.status.dataset.phase = phase;
    renderWords();
    renderPeople();
  }
  ui.liveButton.classList.toggle('share-on', active);
}

/** Marks the collection cards a friend is editing, and warns in the editor. */
function decorate() {
  if (!ui) return;
  const editors = new Map();
  if (room) {
    for (const [id, p] of presence) {
      if (!p.editing) continue;
      const peer = room.roster.get(id);
      if (peer) editors.set(p.editing, [...(editors.get(p.editing) || []), peer]);
    }
  }
  for (const card of $$('[data-col-grid] [data-id]')) {
    const who = editors.get(card.dataset.id) || [];
    let badge = card.querySelector('.share-badge');
    if (!who.length) {
      if (badge) badge.remove();
      card.classList.remove('share-editing');
      continue;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'share-badge';
      card.appendChild(badge);
    }
    card.classList.add('share-editing');
    card.style.setProperty('--c', who[0].color);
    badge.innerHTML = who.map(avatar).join('');
    badge.title = who.map((p) => s('live.badge', { name: p.name })).join(', ');
  }
  const mine = editingId();
  const others = mine ? editors.get(mine) || [] : [];
  ui.editorNote.hidden = !others.length;
  if (others.length) ui.editorNote.textContent = others.map((p) => s('live.editingToo', { name: p.name })).join(' / ');
}

function checkJoinWords() {
  const parts = splitPhrase(ui.joinInput.value);
  const r = resolvePhrase(parts);
  const ready = r.ok && parts.length === WORD_COUNT;
  ui.joinButton.disabled = !ready;
  ui.joinHint.textContent = ready ? s('live.words.ok') : s('live.words.bad');
  ui.joinHint.dataset.ok = String(ready);
  return ready ? r.words : null;
}

function build() {
  const panel = $('[data-panel="collection"] .tool-collection');
  const head = $('.col-head', panel);
  const actions = $('.hero-actions', head);
  actions.insertAdjacentHTML(
    'afterbegin',
    `<button class="btn small" type="button" data-share="link">${icon('link')}<span>${esc(s('link.button'))}</span></button>` +
      `<button class="btn small" type="button" data-share="live" aria-expanded="false" aria-controls="share-live">${icon('users')}<span>${esc(s('live.button'))}</span></button>`,
  );
  head.insertAdjacentHTML(
    'afterend',
    `<div class="card pad share-import" data-share-import hidden>
      <div><h3 class="side-title" data-share-import-title></h3><p class="muted">${esc(s('import.lead'))}</p></div>
      <div class="share-grid" data-share-import-grid></div>
      <div class="hero-actions"><button class="btn small primary" type="button" data-share="add">${esc(s('import.add'))}</button><button class="btn small" type="button" data-share="dismiss">${esc(s('import.dismiss'))}</button></div>
    </div>
    <section class="card pad share-live" id="share-live" data-share-live hidden aria-labelledby="share-live-title">
      <div class="share-live-head">
        <h3 class="subtitle" id="share-live-title">${icon('users', 20)}<span>${esc(s('live.title'))}</span></h3>
        <p class="muted">${esc(s('live.lead'))}</p>
      </div>
      <div class="share-idle" data-share-idle>
        <label class="field"><span>${esc(s('live.name'))}</span><input class="input" data-share-name maxlength="32" spellcheck="false" autocomplete="nickname"></label>
        <div class="hero-actions"><button class="btn small primary" type="button" data-share="start">${esc(s('live.start'))}</button></div>
        <p class="share-or faint">${esc(s('live.or'))}</p>
        <label class="field"><span>${esc(s('live.words'))}</span><input class="input" data-share-words spellcheck="false" autocomplete="off" autocapitalize="none" placeholder="rocket whale cactus anchor crown tent"></label>
        <p class="faint share-hint" data-share-hint aria-live="polite"></p>
        <div class="hero-actions"><button class="btn small" type="button" data-share="join" disabled>${esc(s('live.join'))}</button></div>
      </div>
      <div class="share-active" data-share-active hidden>
        <p class="share-status" data-share-status aria-live="polite"></p>
        <div class="share-words" data-share-words-box hidden>
          <h4 class="side-title">${esc(s('live.yours'))}</h4>
          <ol class="share-word-list" data-share-word-list></ol>
          <div class="hero-actions"><button class="btn small" type="button" data-share="copy-words">${esc(s('live.copyWords'))}</button><button class="btn small" type="button" data-share="copy-invite">${esc(s('live.copyLink'))}</button></div>
        </div>
        <div class="share-people" data-share-people-box hidden>
          <h4 class="side-title">${esc(s('live.people'))}</h4>
          <ul data-share-people></ul>
        </div>
        <div class="hero-actions"><button class="btn small" type="button" data-share="leave">${esc(s('live.leave'))}</button></div>
        <p class="faint small-note">${esc(s('live.note'))}</p>
      </div>
    </section>`,
  );
  const side = $('[data-panel="editor"] .ed-side');
  side.insertAdjacentHTML('afterbegin', '<p class="share-note" data-share-editor-note hidden role="status"></p>');
  ui = {
    liveButton: $('[data-share="live"]', actions),
    importBox: $('[data-share-import]'),
    live: $('[data-share-live]'),
    idle: $('[data-share-idle]'),
    active: $('[data-share-active]'),
    name: $('[data-share-name]'),
    joinInput: $('[data-share-words]'),
    joinButton: $('[data-share="join"]'),
    joinHint: $('[data-share-hint]'),
    status: $('[data-share-status]'),
    wordsBox: $('[data-share-words-box]'),
    wordList: $('[data-share-word-list]'),
    peopleBox: $('[data-share-people-box]'),
    people: $('[data-share-people]'),
    editorNote: $('[data-share-editor-note]'),
  };
  ui.name.value = store.get('gf-share-name', '');
  ui.name.addEventListener('change', () => store.set('gf-share-name', ui.name.value.trim().slice(0, 32)));
  ui.joinInput.addEventListener('input', checkJoinWords);
  ui.joinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !ui.joinButton.disabled) ui.joinButton.click();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-share]');
    if (!b) return;
    const act = b.dataset.share;
    if (act === 'link') copyLink();
    else if (act === 'live') openLive(ui.live.hidden);
    else if (act === 'add') addImport();
    else if (act === 'dismiss') {
      pendingImport = null;
      ui.importBox.hidden = true;
    } else if (act === 'start') startSession(null);
    else if (act === 'join') {
      const w = checkJoinWords();
      if (w) startSession(w);
    } else if (act === 'leave') endSession(true);
    else if (act === 'copy-words' && words) copy(phraseOf(words), s('live.copied'));
    else if (act === 'copy-invite' && words) copy(wordsLink(location.href, words), s('live.copied'));
  });
  // The studio redraws the collection grid on every change: mark it again.
  new MutationObserver(() => decorate()).observe($('[data-col-grid]'), { childList: true });
  collection.onChange(onCollectionChange);
  window.addEventListener('beforeunload', () => room && room.leave());
  checkJoinWords();
  renderLive('idle');
}

function openLive(open) {
  ui.live.hidden = !open;
  ui.liveButton.setAttribute('aria-expanded', String(open));
  if (open) (room ? ui.liveButton : ui.name.value ? ui.joinInput : ui.name).focus({ preventScroll: true });
}

let queued = null;

/** Studio hook: true when the hash is a shared collection or a live invite (shown in the collection tab). */
export function route(tool, value) {
  if (tool !== 'share' && tool !== 'live') return false;
  queued = { tool, value };
  if (ui) flush();
  return true;
}

function flush() {
  const q = queued;
  queued = null;
  if (!q) return;
  history.replaceState(null, '', '#collection');
  if (q.tool === 'share') showImport(q.value);
  else {
    openLive(true);
    if (!room) {
      ui.joinInput.value = splitPhrase(q.value).join(' ');
      checkJoinWords();
    }
  }
}

/** Studio hook: builds the share controls once the icons are loaded. */
export function init(iconData) {
  if (ui) return;
  data = iconData;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('../../share.css', import.meta.url).href;
  document.head.appendChild(css);
  try {
    build();
  } catch (err) {
    // The rest of the studio keeps working without the share controls.
    console.error(err);
    ui = null;
    return;
  }
  flush();
}
