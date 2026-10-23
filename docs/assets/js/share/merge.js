// Conflict free merging of a shared collection: one last writer wins register
// per icon. Every change carries a stamp { v, by }: v counts the edits of that
// icon and by is the stable id of the browser that made it. The higher v wins;
// equal v (two people saved the same icon at once) is settled by the larger
// by, then by the content hash, so every peer keeps the same version without
// asking anyone. Deleting an icon leaves a tombstone with its own stamp, so a
// stale copy cannot bring it back.

/** FNV-1a hash of an item's content (name, body, tags, categories). */
export function hashItem(item) {
  const text = JSON.stringify([item.name, item.body, item.tags || [], item.categories || []]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** True when stamp a should replace stamp b (b may be missing). */
export function wins(a, b) {
  if (!b) return true;
  if (a.v !== b.v) return a.v > b.v;
  if (a.by !== b.by) return a.by > b.by;
  return (a.h || '') > (b.h || '');
}

// Ids end up in markup (data-id), so they are restricted to URL safe characters.
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const validStamp = (s) => Boolean(s) && typeof s.id === 'string' && ID.test(s.id) && Number.isSafeInteger(s.v) && s.v > 0 && typeof s.by === 'string' && ID.test(s.by);

/**
 * The versions this browser knows: id -> { id, v, by, h, deleted }.
 * The content itself lives in the collection; the ledger only stamps it.
 */
export class Ledger {
  constructor(me, entries = []) {
    this.me = me;
    this.map = new Map();
    for (const e of entries) if (validStamp(e)) this.map.set(e.id, { id: e.id, v: e.v, by: e.by, h: e.h || '', deleted: Boolean(e.deleted) });
  }

  get(id) {
    return this.map.get(id) || null;
  }

  /** Every stamp, tombstones included (to persist or to send to a peer). */
  entries() {
    return [...this.map.values()];
  }

  /**
   * Compares the local collection with the ledger and stamps what changed here:
   * new or edited icons get v + 1, icons that disappeared get a tombstone.
   * Returns the operations to send: { id, v, by, h, item } or { id, v, by, deleted }.
   * With quiet, hashes are refreshed without new stamps (while applying a peer's change).
   */
  diff(list, { quiet = false } = {}) {
    const ops = [];
    const seen = new Set();
    for (const item of list) {
      seen.add(item.id);
      const h = hashItem(item);
      const e = this.map.get(item.id);
      if (e && !e.deleted && e.h === h) continue;
      if (quiet) {
        if (e && !e.deleted) e.h = h;
        continue;
      }
      const next = { id: item.id, v: (e ? e.v : 0) + 1, by: this.me, h, deleted: false };
      this.map.set(item.id, next);
      ops.push({ id: next.id, v: next.v, by: next.by, h, item: { name: item.name, body: item.body, tags: item.tags || [], categories: item.categories || [] } });
    }
    if (!quiet) {
      for (const e of this.map.values()) {
        if (e.deleted || seen.has(e.id)) continue;
        const tomb = { id: e.id, v: e.v + 1, by: this.me, h: '', deleted: true };
        this.map.set(e.id, tomb);
        ops.push({ id: tomb.id, v: tomb.v, by: tomb.by, deleted: true });
      }
    }
    return ops;
  }

  /**
   * Applies a peer's operation. Returns what the collection has to do,
   * { save: item } or { remove: id }, or null when the local version wins.
   * clean (optional) rebuilds untrusted content and returns null to reject it.
   */
  apply(op, clean = (x) => x) {
    if (!validStamp(op)) return null;
    const local = this.map.get(op.id);
    if (op.deleted) {
      const stamp = { id: op.id, v: op.v, by: op.by, h: '', deleted: true };
      if (!wins(stamp, local)) return null;
      this.map.set(op.id, stamp);
      return local && !local.deleted ? { remove: op.id } : null;
    }
    const item = op.item && clean(op.item);
    if (!item) return null;
    const h = hashItem(item);
    const stamp = { id: op.id, v: op.v, by: op.by, h, deleted: false };
    if (!wins(stamp, local)) return null;
    if (local && !local.deleted && local.h === h) {
      this.map.set(op.id, stamp);
      return null; // same content, newer stamp: nothing to redraw
    }
    this.map.set(op.id, stamp);
    return { save: { id: op.id, ...item } };
  }

  /** Operations that bring a peer up to date: every live icon and every tombstone. */
  snapshot(list) {
    const byId = new Map(list.map((i) => [i.id, i]));
    const ops = [];
    for (const e of this.map.values()) {
      if (e.deleted) ops.push({ id: e.id, v: e.v, by: e.by, deleted: true });
      else {
        const item = byId.get(e.id);
        if (item) ops.push({ id: e.id, v: e.v, by: e.by, h: e.h, item: { name: item.name, body: item.body, tags: item.tags || [], categories: item.categories || [] } });
      }
    }
    return ops;
  }
}
