// Hero 3D: any icon extruded with three.js (loaded from jsDelivr on demand).
// Strokes become stroke meshes from SVGLoader.pointsToStroke, extruded into
// solid walls; filled shapes go through SVGLoader shapes and ExtrudeGeometry.

import { $, $$, download, gf, has, t, toast } from './app.js';

let THREE = null;
let SVGLoader = null;
let OrbitControls = null;
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let group = null;
let lights = [];
let raf = 0;
let visible = false;
const state = { icon: 'heart', variant: 'outline', material: 'clay', light: 'studio', color: '#ff7a1a', bg: 'dark', depth: 2, spin: true };

async function loadThree() {
  if (THREE) return;
  THREE = await import('three');
  ({ SVGLoader } = await import('three/addons/loaders/SVGLoader.js'));
  ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
}

/** Extrudes a flat triangle mesh (from pointsToStroke) into a solid. */
function extrudeMesh(flat, depth) {
  const pos = flat.getAttribute('position');
  const index = flat.getIndex();
  const n = pos.count;
  const tris = [];
  if (index) for (let i = 0; i < index.count; i += 3) tris.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)]);
  else for (let i = 0; i < n; i += 3) tris.push([i, i + 1, i + 2]);
  // Weld equal vertices so the outline can be found.
  const key = (i) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)}`;
  const map = new Map();
  const verts = [];
  const remap = new Array(n);
  for (let i = 0; i < n; i++) {
    const k = key(i);
    if (!map.has(k)) {
      map.set(k, verts.length);
      verts.push([pos.getX(i), pos.getY(i)]);
    }
    remap[i] = map.get(k);
  }
  const faces = tris.map(([a, b, c]) => [remap[a], remap[b], remap[c]]).filter(([a, b, c]) => a !== b && b !== c && a !== c);
  const edges = new Map();
  for (const [a, b, c] of faces) {
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const k = p < q ? `${p}_${q}` : `${q}_${p}`;
      const e = edges.get(k);
      if (e) e.count++;
      else edges.set(k, { p, q, count: 1 });
    }
  }
  const out = [];
  const push = (x, y, z) => out.push(x, y, z);
  for (const [a, b, c] of faces) {
    push(verts[a][0], verts[a][1], depth);
    push(verts[b][0], verts[b][1], depth);
    push(verts[c][0], verts[c][1], depth);
    push(verts[a][0], verts[a][1], 0);
    push(verts[c][0], verts[c][1], 0);
    push(verts[b][0], verts[b][1], 0);
  }
  for (const { p, q, count } of edges.values()) {
    if (count !== 1) continue;
    const [x1, y1] = verts[p];
    const [x2, y2] = verts[q];
    push(x1, y1, 0);
    push(x2, y2, 0);
    push(x2, y2, depth);
    push(x1, y1, 0);
    push(x2, y2, depth);
    push(x1, y1, depth);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  geo.computeVertexNormals();
  return geo;
}

function material() {
  const color = new THREE.Color(state.color);
  switch (state.material) {
    case 'glossy':
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
    case 'metal':
      return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.28, side: THREE.DoubleSide });
    case 'glass':
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, transmission: 0.92, thickness: 1.2, ior: 1.45, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    default:
      return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  }
}

function setLights() {
  for (const l of lights) scene.remove(l);
  lights = [];
  const add = (l) => {
    scene.add(l);
    lights.push(l);
    return l;
  };
  if (state.light === 'sunset') {
    add(new THREE.HemisphereLight(0xffd2a8, 0x2a1440, 1.1));
    const key = add(new THREE.DirectionalLight(0xff9d5c, 2.6));
    key.position.set(-14, 10, 18);
    const fill = add(new THREE.DirectionalLight(0x8a5cff, 1.4));
    fill.position.set(16, -6, 10);
  } else if (state.light === 'neon') {
    add(new THREE.AmbientLight(0x101018, 1));
    const a = add(new THREE.PointLight(0xff4fd8, 900, 120));
    a.position.set(-14, 12, 16);
    const b = add(new THREE.PointLight(0x2de2ff, 900, 120));
    b.position.set(16, -10, 16);
    const c = add(new THREE.DirectionalLight(0xffffff, 0.6));
    c.position.set(0, 0, 20);
  } else {
    add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.4));
    const key = add(new THREE.DirectionalLight(0xffffff, 2.4));
    key.position.set(-10, 14, 20);
    const rim = add(new THREE.DirectionalLight(0xffffff, 1.2));
    rim.position.set(14, -8, -10);
  }
}

function build() {
  if (group) {
    scene.remove(group);
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
  group = new THREE.Group();
  const icon = gf.lookupIcon(has(state.icon) ? state.icon : 'heart') || gf.lookupIcon(Object.keys({})[0]);
  if (!icon) return;
  const mat = material();
  const depth = state.depth;
  const style = SVGLoader.getStrokeStyle(2, '#000', 'round', 'round', 4);
  const layers = state.variant === 'solid' ? gf.solidLayers(icon) : null;
  const strokes = layers ? layers.strokes : gf.splitLayers(gf.iconNodes(icon)).primary;
  for (const node of strokes) {
    for (const poly of gf.geometry.flattenNode(node, 0.15)) {
      const pts = poly.points.map(([x, y]) => new THREE.Vector2(x, -y));
      if (poly.closed && pts.length > 2) pts.push(pts[0].clone());
      const flat = SVGLoader.pointsToStroke(pts, style);
      if (!flat) continue;
      group.add(new THREE.Mesh(extrudeMesh(flat, depth), mat));
    }
  }
  if (layers) {
    for (const g of layers.groups) {
      const body = gf.nodesToString(g.fill.map(([tag, a]) => [tag, { ...a, fill: '#000' }]));
      const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`);
      for (const p of data.paths) {
        for (const shape of SVGLoader.createShapes(p)) {
          const geo = new THREE.ExtrudeGeometry(shape, { depth: depth * 0.9, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 3, curveSegments: 24 });
          geo.scale(1, -1, 1);
          const m = new THREE.Mesh(geo, mat);
          group.add(m);
        }
      }
    }
  }
  group.position.set(-12, 12, -depth / 2);
  const pivot = new THREE.Group();
  pivot.add(group);
  scene.add(pivot);
  group = pivot;
}

function setBackground() {
  if (state.bg === 'none') {
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
  } else scene.background = new THREE.Color(state.bg === 'light' ? '#f3f1ec' : '#0b0b0f');
}

function resize() {
  const host = $('[data-th-stage]');
  const w = host.clientWidth;
  const h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function loop() {
  raf = 0;
  if (!visible) return;
  if (state.spin && group) group.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
  raf = requestAnimationFrame(loop);
}

export async function showThree(data) {
  visible = true;
  const host = $('[data-th-stage]');
  const status = $('[data-th-status]');
  try {
    await loadThree();
  } catch {
    status.textContent = t('three.error');
    return;
  }
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', t('three.canvas'));
    renderer.domElement.setAttribute('role', 'img');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 500);
    camera.position.set(0, 0, 52);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    status.hidden = true;
    new ResizeObserver(resize).observe(host);
    if (!has(state.icon)) state.icon = data.icons[0].name;
    wire();
    setLights();
    setBackground();
    build();
    resize();
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

export function hideThree() {
  visible = false;
}

function wire() {
  for (const input of $$('[data-th]')) {
    const ev = input.type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(ev, () => {
      const k = input.dataset.th;
      state[k] = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
      const o = $(`[data-th-o="${k}"]`);
      if (o) o.textContent = input.value;
      if (k === 'light') setLights();
      else if (k === 'bg') setBackground();
      else if (k !== 'spin') build();
    });
  }
  for (const seg of $$('[data-th-seg]')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
      state[seg.dataset.thSeg] = b.value;
      build();
    });
  }
  $('[data-th-act="png"]').addEventListener('click', () => {
    renderer.render(scene, camera);
    renderer.domElement.toBlob((blob) => {
      download(blob, `${state.icon}-3d.png`, 'image/png');
      toast(t('toast.downloaded'));
    }, 'image/png');
  });
}
