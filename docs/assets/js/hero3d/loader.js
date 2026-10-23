// three.js is loaded from jsDelivr on demand, pinned to one exact version.
// The core build is imported by URL (no import map), so the studio and the
// embed element share the same module instance and nothing loads before the
// 3D view is opened.

export const THREE_VERSION = '0.186.1';
export const THREE_URL = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.min.js`;

let pending = null;

/** Resolves to the three.js module namespace (one network load per page). */
export function loadThree() {
  if (!pending) {
    pending = import(THREE_URL).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

/** True when the browser can create a WebGL 2 context. */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}
