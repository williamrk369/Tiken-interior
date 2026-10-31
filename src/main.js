// Tiken Interior – 23' × 23' house: living hall, L-shaped bedroom + front room.
// A suspended ceiling is hung below the open hip roof, with a raised tray over
// the living area, a circular dome over the bed, and a shadow-gap LED edge light
// running around every wall.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as TX from './textures.js';

// ---------------------------------------------------------------------------
// Plan (metres; 1 ft = 0.3048 m). Origin = centre of the 23' × 23' house.
//
//            x = -S                    x = 0                     x = +S
//   z = -S   +-------------------------------------------------------+  rear
//            | TV wall  LIVING (tray ceiling)  |   reading nook      |
//            |              HALL 23' × 14'                           |  ← side door
//   z = ZP   +-----------------------+---------+                     |
//            |  FRONT ROOM 11' × 9'  |      DINING 11' × 9'          |
//            |  (entrance lounge)    |      (L extension, dome)      |
//   z = +S   +-----------------------+-------------------------------+  front
// ---------------------------------------------------------------------------
const FT = 0.3048;
const S = (23 * FT) / 2;            // 3.505 – half the house width/depth
const ZP = -S + 14 * FT;            // 0.762 – hall / front-strip line
const TI = 0.15;                    // internal wall thickness
const TE = 0.2;                     // external block wall thickness
const XF = -TI;                     // front-room side wall, room-side face

const WH = 3.05;                    // wall-plate height (10')
const BAND_BOTTOM = 2.85;           // finished suspended ceiling (9'-4")
const BAND_TOP = 2.95;
const LIP_TOP = 3.02;
const RAISED = 3.25;                // raised tray / dome field (into the roof void)
const GAP = 0.06;                   // shadow gap at walls (edge light)
const VENT0 = 2.42, VENT1 = 2.74;   // breeze-block vent band above openings

// Living tray (rectangular) over the left part of the hall
const LIV = { x0: -S, x1: 0.6, z0: -S, z1: ZP };
const TRAY_IN = 0.6, TRAY_DRUM = 0.38;
const tray = {
  ox0: LIV.x0 + TRAY_IN, ox1: LIV.x1 - TRAY_IN, oz0: LIV.z0 + TRAY_IN, oz1: LIV.z1 - TRAY_IN,
  dx0: LIV.x0 + TRAY_DRUM, dx1: LIV.x1 - TRAY_DRUM, dz0: LIV.z0 + TRAY_DRUM, dz1: LIV.z1 - TRAY_DRUM,
};
const LC = new THREE.Vector3((tray.ox0 + tray.ox1) / 2, 0, (tray.oz0 + tray.oz1) / 2);
// Bedroom dome (circular) centred in the L extension
const DC = new THREE.Vector3(S / 2, 0, (ZP + S) / 2);
const DOME_R = 1.0, DOME_DRUM = 1.2;

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
app.appendChild(renderer.domElement);
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#121110');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 120);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.3;
controls.maxDistance = 26;

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const tex = {
  oak: TX.oakFloor(), walnut: TX.walnut(3), walnut2: TX.walnut(8),
  noise: TX.noise(256, 11, 0.8), fine: TX.noise(256, 4, 0.3),
  trav: TX.travertine(), rug: TX.rug(), art: TX.artwork(), tv: TX.tvPicture(), breeze: TX.breezeBlock(),
};
tex.noise.repeat.set(6, 6);
tex.fine.repeat.set(10, 10);
tex.oak.repeat.set(3.6, 3.6);

const M = {
  wall: new THREE.MeshStandardMaterial({ color: '#ebe4d8', roughness: 0.95, bumpMap: tex.fine, bumpScale: 0.15 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.97 }),
  band: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.95 }),
  drum: new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.97, side: THREE.DoubleSide }),
  floor: new THREE.MeshStandardMaterial({ map: tex.oak, roughness: 0.55 }),
  walnut: new THREE.MeshStandardMaterial({ map: tex.walnut, roughness: 0.55 }),
  walnutDS: new THREE.MeshStandardMaterial({ map: tex.walnut, roughness: 0.55, side: THREE.DoubleSide }),
  walnut2: new THREE.MeshStandardMaterial({ map: tex.walnut2, roughness: 0.6 }),
  teak: new THREE.MeshStandardMaterial({ color: '#a8673a', roughness: 0.55 }),
  boucle: new THREE.MeshStandardMaterial({ color: '#e6dccb', roughness: 1, bumpMap: tex.noise, bumpScale: 0.6 }),
  terracotta: new THREE.MeshStandardMaterial({ color: '#b5653e', roughness: 0.95, bumpMap: tex.noise, bumpScale: 0.3 }),
  olive: new THREE.MeshStandardMaterial({ color: '#6b6e4e', roughness: 0.95, bumpMap: tex.noise, bumpScale: 0.3 }),
  linen: new THREE.MeshStandardMaterial({ color: '#d8cdbb', roughness: 1, side: THREE.DoubleSide, bumpMap: tex.fine, bumpScale: 0.3 }),
  rattan: new THREE.MeshStandardMaterial({ color: '#c8a874', roughness: 0.9, bumpMap: tex.noise, bumpScale: 0.8 }),
  trav: new THREE.MeshStandardMaterial({ map: tex.trav, roughness: 0.55 }),
  leather: new THREE.MeshStandardMaterial({ color: '#97582f', roughness: 0.48 }),
  black: new THREE.MeshStandardMaterial({ color: '#1d1c1b', roughness: 0.45, metalness: 0.5 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c09a5b', roughness: 0.3, metalness: 1 }),
  ceramic: new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.35 }),
  stoneware: new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: 0.8 }),
  potTerra: new THREE.MeshStandardMaterial({ color: '#b9714c', roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#76845a', roughness: 0.7, side: THREE.DoubleSide }),
  leafDark: new THREE.MeshStandardMaterial({ color: '#4f6a3e', roughness: 0.6, side: THREE.DoubleSide }),
  bark: new THREE.MeshStandardMaterial({ color: '#6a5a48', roughness: 1 }),
  rug: new THREE.MeshStandardMaterial({ map: tex.rug, roughness: 1, bumpMap: tex.noise, bumpScale: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: '#cfe0e8', roughness: 0.05, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  art: new THREE.MeshStandardMaterial({ map: tex.art, roughness: 0.9 }),
  screen: new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.12, metalness: 0.2, emissive: '#ffffff', emissiveMap: tex.tv, emissiveIntensity: 0 }),
  breeze: new THREE.MeshStandardMaterial({ map: tex.breeze, roughness: 0.95 }),
  skirt: new THREE.MeshStandardMaterial({ color: '#d9d0c2', roughness: 0.8 }),
  channel: new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.9 }),
  ground: new THREE.MeshStandardMaterial({ color: '#7d7a5a', roughness: 1 }),
  mirror: new THREE.MeshStandardMaterial({ color: '#d8dde0', roughness: 0.02, metalness: 1 }),
  book1: new THREE.MeshStandardMaterial({ color: '#2f3b36', roughness: 0.8 }),
  book2: new THREE.MeshStandardMaterial({ color: '#c8b593', roughness: 0.8 }),
  book3: new THREE.MeshStandardMaterial({ color: '#8b3f2a', roughness: 0.8 }),
  sheet: new THREE.MeshStandardMaterial({ color: '#f2eee6', roughness: 0.95, bumpMap: tex.fine, bumpScale: 0.2 }),
  curtain: new THREE.MeshStandardMaterial({ color: '#cbbca3', roughness: 1, side: THREE.DoubleSide, bumpMap: tex.fine, bumpScale: 0.4 }),
  glass2: new THREE.MeshStandardMaterial({ color: '#e8d9c0', roughness: 0.1, transparent: true, opacity: 0.6 }),
  bedOpal: new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.4, emissive: '#ffd6a0', emissiveIntensity: 1 }),
  opal: new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.4, emissive: '#ffd6a0', emissiveIntensity: 1 }),
};
const led = () => new THREE.MeshBasicMaterial({ color: 0xffffff });
const LED = {
  cove: led(), edge: led(), down: led(), pendant: led(), accent: led(), halo: led(),
  lamp: new THREE.MeshStandardMaterial({ color: '#efe4d0', roughness: 1, side: THREE.DoubleSide, emissive: '#ffcf96', emissiveIntensity: 1 }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}
const box = (w, h, d, mat, x, y, z, parent, opts) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent, opts);
const rbox = (w, h, d, r, mat, x, y, z, parent, opts) =>
  mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) - 1e-4), mat, x, y, z, parent, opts);
const NOSHADOW = { cast: false, receive: false };
function group(x = 0, z = 0, rotY = 0, parent = scene) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}
const _m4 = new THREE.Matrix4();
// RectAreaLight shining along `normal`, its width running along `widthDir`.
function rectLight(width, height, pos, normal, widthDir, parent = scene) {
  const l = new THREE.RectAreaLight(0xffffff, 0, width, height);
  const z = normal.clone().normalize().negate();
  const x = widthDir.clone().normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  x.crossVectors(y, z).normalize();
  _m4.makeBasis(x, y, z);
  l.quaternion.setFromRotationMatrix(_m4);
  l.position.copy(pos);
  parent.add(l);
  return l;
}

// ---------------------------------------------------------------------------
// Walls. Each wall is described by its room-side face (centre, inward normal,
// length) and built in a local frame: x along the wall, z into the room.
// Openings get teak frames like the ones already installed on site.
// ---------------------------------------------------------------------------
const walls = {};
const interior = new THREE.Group();
scene.add(interior);

function buildWall({ name, centre, normal, length, thick, openings = [], parent = scene, twoSided = false }) {
  const rotY = Math.atan2(normal.x, normal.z);
  const g = group(centre.x, centre.z, rotY, parent);
  const zc = -thick / 2;
  const ops = [...openings].sort((a, b) => a.u - b.u);
  const solid = (u0, u1, y0, y1, mat = M.wall) => {
    if (u1 - u0 < 1e-3 || y1 - y0 < 1e-3) return;
    box(u1 - u0, y1 - y0, thick, mat, (u0 + u1) / 2, (y0 + y1) / 2, zc, g);
  };
  let u = -length / 2;
  for (const o of ops) {
    const a = o.u - o.w / 2, b = o.u + o.w / 2, oh = o.y1 - o.y0, oy = (o.y0 + o.y1) / 2;
    solid(u, a, 0, WH);
    solid(a, b, 0, o.y0);
    if (o.vent) {
      solid(a, b, o.y1, VENT0);
      box(b - a, VENT1 - VENT0, thick, M.breeze, (a + b) / 2, (VENT0 + VENT1) / 2, zc, g);
      solid(a, b, VENT1, WH);
    } else solid(a, b, o.y1, WH);
    // teak architrave on the room face (both faces for internal walls)
    const cw = 0.07;
    for (const fz of twoSided ? [0.012, -thick - 0.012] : [0.012]) {
      const y0 = o.y0 > 0 ? o.y0 - cw : 0;
      box(cw, o.y1 + cw - y0, 0.025, M.teak, a - cw / 2, (y0 + o.y1 + cw) / 2, fz, g);
      box(cw, o.y1 + cw - y0, 0.025, M.teak, b + cw / 2, (y0 + o.y1 + cw) / 2, fz, g);
      box(b - a, cw, 0.025, M.teak, o.u, o.y1 + cw / 2, fz, g);
      if (o.y0 > 0) box(b - a, cw, 0.025, M.teak, o.u, o.y0 - cw / 2, fz, g);
    }
    // teak jamb lining
    box(0.03, oh, thick, M.teak, a + 0.015, oy, zc, g, NOSHADOW);
    box(0.03, oh, thick, M.teak, b - 0.015, oy, zc, g, NOSHADOW);
    box(b - a, 0.03, thick, M.teak, o.u, o.y1 - 0.015, zc, g, NOSHADOW);
    if (o.kind === 'window') {
      box(0.05, oh, 0.05, M.teak, o.u, oy, zc, g);
      box(b - a, 0.05, 0.05, M.teak, o.u, o.y0 + 0.025, zc, g);
      box(b - a, 0.04, 0.05, M.teak, o.u, o.y1 - 0.35, zc, g);
      mesh(new THREE.PlaneGeometry(b - a, oh), M.glass, o.u, oy, zc, g, NOSHADOW).renderOrder = 2;
      box(b - a + 0.14, 0.03, 0.1, M.trav, o.u, o.y0 - 0.015, 0.04, g);
    } else if (o.kind === 'slider') {
      const half = (b - a) / 2;
      for (const s of [-1, 1]) {
        const cx = o.u + (s * half) / 2, zz = zc + s * 0.03;
        box(0.06, oh, 0.04, M.teak, cx - half / 2 + 0.03, oy, zz, g);
        box(0.06, oh, 0.04, M.teak, cx + half / 2 - 0.03, oy, zz, g);
        box(half, 0.1, 0.04, M.teak, cx, o.y0 + 0.05, zz, g);
        box(half, 0.06, 0.04, M.teak, cx, o.y1 - 0.03, zz, g);
        mesh(new THREE.PlaneGeometry(half - 0.1, oh - 0.14), M.glass, cx, oy, zz, g, NOSHADOW).renderOrder = 2;
      }
    } else if (o.kind === 'door') {
      box(b - a - 0.06, oh - 0.03, 0.045, M.teak, o.u, oy - 0.015, zc + 0.03, g);
      for (const py of [0.6, 1.5]) box(b - a - 0.3, 0.7, 0.01, M.walnut, o.u, py, zc + 0.056, g, NOSHADOW);
      box(0.02, 0.25, 0.04, M.brass, o.u + (b - a) / 2 - 0.12, 1.0, zc + 0.08, g, NOSHADOW);
    }
    u = b;
  }
  solid(u, length / 2, 0, WH);
  // flush skirting
  const sk = (u0, u1) => {
    if (u1 - u0 < 0.01) return;
    box(u1 - u0, 0.08, 0.012, M.skirt, (u0 + u1) / 2, 0.04, 0.006, g, NOSHADOW);
    if (twoSided) box(u1 - u0, 0.08, 0.012, M.skirt, (u0 + u1) / 2, 0.04, -thick - 0.006, g, NOSHADOW);
  };
  let su = -length / 2;
  for (const o of ops) {
    if (o.y0 === 0) {
      sk(su, o.u - o.w / 2 - 0.07);
      su = o.u + o.w / 2 + 0.07;
    }
  }
  sk(su, length / 2);
  if (name) walls[name] = { group: g, normal: normal.clone(), point: centre.clone(), extra: [] };
  return g;
}

const WIN = (u, w = 1.2, vent = true) => ({ u, w, y0: 0.9, y1: 2.15, kind: 'window', vent });
const DOOR = (u, w = 0.95, kind = 'door', vent = false) => ({ u, w, y0: 0, y1: 2.15, kind, vent });

// Rear wall (z = -S, u = x): two windows with breeze-block vents
buildWall({ name: 'back', centre: V(0, 0, -S), normal: V(0, 0, 1), length: 2 * S + 2 * TE, thick: TE, openings: [WIN(LC.x), WIN(2.15)] });
// Right wall (x = +S, u = z): side door into the hall; wardrobe wall in the bedroom
buildWall({ name: 'right', centre: V(S, 0, 0), normal: V(-1, 0, 0), length: 2 * S, thick: TE, openings: [DOOR(-1.1, 0.95, 'door', true)] });
// Front wall (z = +S, u = -x): bedroom window + front-room glazed sliders (main entrance)
buildWall({ name: 'front', centre: V(0, 0, S), normal: V(0, 0, -1), length: 2 * S + 2 * TE, thick: TE,
  openings: [WIN(-1.4, 1.0), { u: 1.85, w: 2.0, y0: 0, y1: 2.15, kind: 'slider', vent: true }] });
// Left wall (x = -S, u = -z): solid TV wall + front-room window
buildWall({ name: 'left', centre: V(-S, 0, 0), normal: V(1, 0, 0), length: 2 * S, thick: TE, openings: [WIN(-(ZP + S) / 2, 1.1)] });
// Internal walls of the front room (two-sided). Rear wall: u = -(x - cx)
{
  const cx = -S / 2;
  buildWall({ centre: V(cx, 0, ZP), normal: V(0, 0, -1), length: S, thick: TI, parent: interior, twoSided: true,
    openings: [DOOR(-(-1.0 - cx), 0.9, 'open'), WIN(-(-2.55 - cx), 1.0, false)] });
  buildWall({ centre: V(0, 0, (ZP + TI + S) / 2), normal: V(1, 0, 0), length: S - ZP - TI, thick: TI, parent: interior, twoSided: true });
}

// Floor: wood-look porcelain plank over the existing slab
const floor = mesh(new THREE.PlaneGeometry(2 * S, 2 * S), M.floor, 0, 0, 0, scene, { cast: false });
floor.rotation.x = -Math.PI / 2;
const ground = mesh(new THREE.PlaneGeometry(80, 80), M.ground, 0, -0.02, 0, scene, { cast: false });
ground.rotation.x = -Math.PI / 2;
const skyTex = { day: TX.skyView('day'), evening: TX.skyView('evening'), night: TX.skyView('night') };
Object.values(skyTex).forEach((t) => t.repeat.set(3, 1));
const skyMat = new THREE.MeshBasicMaterial({ map: skyTex.evening, side: THREE.BackSide });
const sky = mesh(new THREE.CylinderGeometry(14, 14, 12, 48, 1, true), skyMat, 0, 4.5, 0, scene, NOSHADOW);

// ---------------------------------------------------------------------------
// CEILING
// ---------------------------------------------------------------------------
const ceiling = new THREE.Group();
scene.add(ceiling);
const lights = { cove: [], edge: [], down: [], accent: [], pendant: [] };

// Zone outlines (x, z) at the room faces; both counter-clockwise in (x, z)
const L_POLY = [[-S, -S], [S, -S], [S, S], [0, S], [0, ZP], [-S, ZP]];
const F_POLY = [[-S, ZP + TI], [XF, ZP + TI], [XF, S], [-S, S]];

// Offset a CCW rectilinear polygon inwards by d
function inset(poly, d) {
  const n = poly.length;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
    const nx = -dz / len, nz = dx / len;
    return { p: [p[0] + nx * d, p[1] + nz * d], d: [dx, dz] };
  });
  return lines.map((l, i) => {
    const m = lines[(i - 1 + n) % n];
    const [x1, z1] = m.p, [dx1, dz1] = m.d, [x2, z2] = l.p, [dx2, dz2] = l.d;
    const t = ((x2 - x1) * dz2 - (z2 - z1) * dx2) / (dx1 * dz2 - dz1 * dx2);
    return [x1 + dx1 * t, z1 + dz1 * t];
  });
}
const toShapePts = (poly) => poly.map(([x, z]) => new THREE.Vector2(x, -z));

function bandSlab(poly, holes) {
  const shape = new THREE.Shape(toShapePts(inset(poly, GAP)));
  shape.holes.push(...holes);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: BAND_TOP - BAND_BOTTOM, bevelEnabled: false, curveSegments: 96 });
  geo.rotateX(-Math.PI / 2);
  return mesh(geo, M.band, 0, BAND_BOTTOM, 0, ceiling, { cast: false, receive: true });
}

// Edge light: LED profile in the 60 mm shadow gap + a grazing wash on each wall
function edgeLight(poly) {
  const mid = inset(poly, GAP / 2);
  const n = mid.length;
  for (let i = 0; i < n; i++) {
    const a = mid[i], b = mid[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dir = V(b[0] - a[0], 0, b[1] - a[1]).normalize();
    const toWall = V(dir.z, 0, -dir.x);
    const c = V((a[0] + b[0]) / 2, BAND_TOP - 0.006, (a[1] + b[1]) / 2);
    const rot = -Math.atan2(dir.z, dir.x);
    box(len, 0.006, 0.022, LED.edge, c.x, c.y, c.z, ceiling, NOSHADOW).rotation.y = rot;
    box(len + GAP, 0.004, GAP, M.channel, c.x, BAND_TOP + 0.001, c.z, ceiling, NOSHADOW).rotation.y = rot;
    const p = c.clone().addScaledVector(toWall, -0.32);
    p.y = BAND_BOTTOM - 0.01;
    lights.edge.push(rectLight(len - 0.1, 0.05, p, toWall.clone().add(V(0, -0.5, 0)), dir, ceiling));
  }
}

const trayHole = new THREE.Path(toShapePts([[tray.ox0, tray.oz0], [tray.ox0, tray.oz1], [tray.ox1, tray.oz1], [tray.ox1, tray.oz0]]));
const domeHole = new THREE.Path();
domeHole.absarc(DC.x, -DC.z, DOME_R, 0, Math.PI * 2, true);
bandSlab(L_POLY, [trayHole, domeHole]);
bandSlab(F_POLY, []);
edgeLight(L_POLY);
edgeLight(F_POLY);

// --- Living tray: lip, cove trough, drum walls, raised field ---
{
  const t = tray, lt = 0.015, lh = LIP_TOP - BAND_TOP, ly = BAND_TOP + lh / 2;
  const w = t.ox1 - t.ox0, d = t.oz1 - t.oz0, mx = (t.ox0 + t.ox1) / 2, mz = (t.oz0 + t.oz1) / 2;
  box(w + lt * 2, lh, lt, M.band, mx, ly, t.oz0 - lt / 2, ceiling, NOSHADOW);
  box(w + lt * 2, lh, lt, M.band, mx, ly, t.oz1 + lt / 2, ceiling, NOSHADOW);
  box(lt, lh, d, M.band, t.ox0 - lt / 2, ly, mz, ceiling, NOSHADOW);
  box(lt, lh, d, M.band, t.ox1 + lt / 2, ly, mz, ceiling, NOSHADOW);
  const dh = RAISED - BAND_TOP, dy = BAND_TOP + dh / 2;
  const dw = t.dx1 - t.dx0, dd = t.dz1 - t.dz0, dmx = (t.dx0 + t.dx1) / 2, dmz = (t.dz0 + t.dz1) / 2;
  box(dw, dh, 0.02, M.drum, dmx, dy, t.dz0, ceiling, NOSHADOW);
  box(dw, dh, 0.02, M.drum, dmx, dy, t.dz1, ceiling, NOSHADOW);
  box(0.02, dh, dd, M.drum, t.dx0, dy, dmz, ceiling, NOSHADOW);
  box(0.02, dh, dd, M.drum, t.dx1, dy, dmz, ceiling, NOSHADOW);
  mesh(new THREE.PlaneGeometry(dw, dd), M.ceiling, dmx, RAISED, dmz, ceiling, { cast: false }).rotation.x = Math.PI / 2;
  const y = BAND_TOP + 0.008, o = 0.04;
  const strips = [
    { len: dw - 0.1, pos: V(dmx, y, t.dz0 + o), w: V(1, 0, 0), n: V(0, 1, 0.9) },
    { len: dw - 0.1, pos: V(dmx, y, t.dz1 - o), w: V(1, 0, 0), n: V(0, 1, -0.9) },
    { len: dd - 0.1, pos: V(t.dx0 + o, y, dmz), w: V(0, 0, 1), n: V(0.9, 1, 0) },
    { len: dd - 0.1, pos: V(t.dx1 - o, y, dmz), w: V(0, 0, 1), n: V(-0.9, 1, 0) },
  ];
  for (const st of strips) {
    const dims = st.w.x ? [st.len, 0.012, 0.02] : [0.02, 0.012, st.len];
    box(...dims, LED.cove, st.pos.x, st.pos.y, st.pos.z, ceiling, NOSHADOW);
    lights.cove.push(rectLight(st.len, 0.12, st.pos.clone().add(V(0, 0.02, 0)), st.n, st.w, ceiling));
  }
}

// --- Bedroom dome: circular cove, drum and raised disc ---
{
  mesh(new THREE.CylinderGeometry(DOME_R + 0.008, DOME_R + 0.008, LIP_TOP - BAND_TOP, 96, 1, true), M.drum, DC.x, (LIP_TOP + BAND_TOP) / 2, DC.z, ceiling, NOSHADOW);
  mesh(new THREE.CylinderGeometry(DOME_DRUM, DOME_DRUM, RAISED - BAND_TOP, 96, 1, true), M.drum, DC.x, (RAISED + BAND_TOP) / 2, DC.z, ceiling, NOSHADOW);
  mesh(new THREE.CircleGeometry(DOME_DRUM, 96), M.ceiling, DC.x, RAISED, DC.z, ceiling, { cast: false }).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(DOME_DRUM - 0.04, 0.008, 6, 160), LED.cove, DC.x, BAND_TOP + 0.01, DC.z, ceiling, NOSHADOW).rotation.x = Math.PI / 2;
  const N = 8, rr = DOME_DRUM - 0.05, seg = 2 * rr * Math.sin(Math.PI / N);
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    const p = V(DC.x + Math.cos(a) * rr, BAND_TOP + 0.03, DC.z + Math.sin(a) * rr);
    const l = rectLight(seg, 0.12, p, V(-Math.cos(a) * 0.9, 1, -Math.sin(a) * 0.9), V(-Math.sin(a), 0, Math.cos(a)), ceiling);
    l.userData.factor = 0.75;
    lights.cove.push(l);
  }
}

// --- Trimless downlights (warm). Entries with a target carry a real spotlight. ---
{
  const y = BAND_BOTTOM - 0.002;
  const ringGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.006, 32);
  const lensGeo = new THREE.CircleGeometry(0.028, 32);
  const spots = [
    [-S + 0.3, LC.z - 0.95, V(-S, 0.6, LC.z - 0.95), 'graze'],
    [-S + 0.3, LC.z + 0.95, V(-S, 0.6, LC.z + 0.95), 'graze'],
    [0.3, -S + 0.3], [0.3, ZP - 0.3],
    [1.6, -2.3, V(2.2, 0.74, -2.2)], [2.9, -2.3],
    [1.6, -0.3], [2.9, -0.3, V(2.9, 0, -0.3)],
    [0.35, DC.z, V(0, 1.7, DC.z), 'art'], [2.2, ZP + 0.3], [S - 0.3, S - 0.3, V(2.85, 0.8, S - 0.25)],
    [-2.6, ZP + 0.85, V(-2.6, 0, ZP + 0.85)], [-1.0, ZP + 0.85], [-2.6, S - 0.55], [-1.0, S - 0.55, V(-1.0, 0, S - 0.55)],
  ];
  for (const [x, z, target, kind] of spots) {
    mesh(ringGeo, M.black, x, y, z, ceiling, NOSHADOW);
    mesh(lensGeo, LED.down, x, y - 0.004, z, ceiling, NOSHADOW).rotation.x = Math.PI / 2;
    if (!target) continue;
    const s = new THREE.SpotLight(0xffffff, 0, 10, THREE.MathUtils.degToRad(kind === 'graze' ? 22 : 30), 0.65, 2);
    s.position.set(x, y - 0.01, z);
    s.target.position.copy(target);
    s.userData.kind = kind || 'general';
    ceiling.add(s, s.target);
    lights.down.push(s);
  }
}

// --- Living: twin brass ring pendant ---
{
  for (const { r, y } of [{ r: 0.55, y: 2.38 }, { r: 0.36, y: 2.24 }]) {
    mesh(new THREE.TorusGeometry(r, 0.018, 16, 128), M.brass, LC.x, y, LC.z, ceiling, { cast: false }).rotation.x = Math.PI / 2;
    const diff = mesh(new THREE.TorusGeometry(r, 0.01, 8, 128), LED.pendant, LC.x, y - 0.012, LC.z, ceiling, NOSHADOW);
    diff.rotation.x = Math.PI / 2;
    diff.scale.z = 0.5;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + (r < 0.5 ? 0.5 : 0), len = RAISED - y;
      mesh(new THREE.CylinderGeometry(0.0015, 0.0015, len, 4), M.black, LC.x + Math.cos(a) * r, y + len / 2, LC.z + Math.sin(a) * r, ceiling, NOSHADOW);
    }
  }
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 32), M.brass, LC.x, RAISED - 0.008, LC.z, ceiling, NOSHADOW);
  const pl = new THREE.PointLight(0xffffff, 0, 8, 2);
  pl.position.set(LC.x, 2.15, LC.z);
  pl.userData.k = 3.0;
  ceiling.add(pl);
  lights.pendant.push(pl);
}
// --- Hall dining: cluster of three opal globes hung from the ceiling ---
{
  const C = V(2.2, 0, -2.2);
  for (const [dx, y, dz, r] of [[0, 1.6, 0, 0.15], [0.24, 1.76, 0.1, 0.11], [-0.2, 1.84, -0.12, 0.1]]) {
    mesh(new THREE.SphereGeometry(r, 32, 20), M.opal, C.x + dx, y, C.z + dz, ceiling, NOSHADOW);
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 16), M.brass, C.x + dx, y + r + 0.01, C.z + dz, ceiling, NOSHADOW);
    const len = BAND_BOTTOM - y - r;
    mesh(new THREE.CylinderGeometry(0.002, 0.002, len, 4), M.black, C.x + dx, y + r + len / 2, C.z + dz, ceiling, NOSHADOW);
  }
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 32), M.brass, C.x, BAND_BOTTOM - 0.008, C.z, ceiling, NOSHADOW);
  const pl = new THREE.PointLight(0xffffff, 0, 7, 2);
  pl.position.set(C.x, 1.45, C.z);
  pl.userData.k = 2.2;
  ceiling.add(pl);
  lights.pendant.push(pl);
}

// ---------------------------------------------------------------------------
// TV feature wall (left wall of the hall): fluted walnut, console, LEDs
// ---------------------------------------------------------------------------
{
  const g = group(-S, LC.z, Math.PI / 2);
  walls.left.extra.push(g);
  const panelW = 2.6, panelH = BAND_TOP, r = 0.019;
  box(panelW, panelH, 0.012, M.walnut2, 0, panelH / 2, 0.006, g);
  const count = Math.floor(panelW / (2 * r));
  const flutes = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, panelH, 14, 1, true, -Math.PI / 2, Math.PI), M.walnut, count);
  flutes.castShadow = flutes.receiveShadow = true;
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    d.position.set(-panelW / 2 + r + i * 2 * r, panelH / 2, 0.012);
    d.updateMatrix();
    flutes.setMatrixAt(i, d.matrix);
  }
  g.add(flutes);
  for (const sx of [-1, 1]) {
    box(0.012, panelH - 0.1, 0.012, LED.accent, sx * (panelW / 2 + 0.012), panelH / 2, 0.01, g, NOSHADOW);
    lights.accent.push(rectLight(0.03, panelH - 0.1, V(sx * (panelW / 2 + 0.03), panelH / 2, 0.03), V(sx, 0, 0.6), V(0, 0, -sx), g));
  }
  const cz = 0.034 + 0.2;
  box(2.2, 0.36, 0.4, M.walnut, 0, 0.42, cz, g);
  for (let i = 1; i < 4; i++) box(0.004, 0.32, 0.002, M.black, -1.1 + i * 0.55, 0.42, cz + 0.201, g, { cast: false });
  box(2.0, 0.006, 0.02, LED.accent, 0, 0.235, cz + 0.1, g, NOSHADOW);
  lights.accent.push(rectLight(2.0, 0.06, V(0, 0.232, cz + 0.08), V(0, -1, 0.15), V(1, 0, 0), g));
  box(1.46, 0.84, 0.03, M.black, 0, 1.38, 0.05, g);
  mesh(new THREE.PlaneGeometry(1.43, 0.81), M.screen, 0, 1.38, 0.066, g, { cast: false });
  lights.tv = rectLight(1.43, 0.81, V(0, 1.38, 0.07), V(0, 0, 1), V(1, 0, 0), g);
  const vaseGeo = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.1, 0.06], [0.09, 0.16], [0.04, 0.26], [0.035, 0.3], [0.045, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  mesh(vaseGeo, M.ceramic, -0.8, 0.6, cz, g);
  mesh(vaseGeo, M.stoneware, -0.62, 0.6, cz + 0.05, g).scale.set(0.7, 0.6, 0.7);
  const r1 = TX.rng(42);
  for (let i = 0; i < 7; i++) {
    const len = 0.4 + r1() * 0.35;
    const b = mesh(new THREE.CylinderGeometry(0.002, 0.004, len, 4), M.bark, -0.8, 0.88 + len / 2, cz, g, { cast: false });
    b.rotation.set((r1() - 0.5) * 0.7, 0, (r1() - 0.5) * 0.8);
    b.position.x -= (Math.sin(b.rotation.z) * len) / 2;
    b.position.z += (Math.sin(b.rotation.x) * len) / 2;
  }
  box(0.3, 0.035, 0.22, M.book2, 0.75, 0.618, cz, g);
  box(0.28, 0.03, 0.2, M.book1, 0.75, 0.65, cz, g);
  mesh(new THREE.SphereGeometry(0.06, 32, 16), M.trav, 0.75, 0.725, cz, g);
}

// ---------------------------------------------------------------------------
// Furniture builders
// ---------------------------------------------------------------------------
function sofa(x, z, rotY) {
  const g = group(x, z, rotY);
  const L = 2.7, Dp = 1.0, seatH = 0.42, chaiseLen = 1.6, chaiseW = 0.95;
  const x0 = -L / 2, back = Dp / 2;
  box(L - 0.1, 0.08, Dp - 0.1, M.black, 0, 0.04, 0, g);
  box(chaiseW - 0.1, 0.08, chaiseLen - Dp, M.black, x0 + chaiseW / 2, 0.04, -Dp / 2 - (chaiseLen - Dp) / 2 + 0.05, g);
  rbox(L, 0.2, Dp, 0.04, M.boucle, 0, 0.18, 0, g);
  rbox(chaiseW, 0.2, chaiseLen, 0.04, M.boucle, x0 + chaiseW / 2, 0.18, back - chaiseLen / 2, g);
  const cushW = (L - chaiseW - 0.22) / 2;
  for (let i = 0; i < 2; i++) rbox(cushW - 0.01, 0.16, Dp - 0.25, 0.07, M.boucle, x0 + chaiseW + cushW / 2 + i * cushW, seatH - 0.04, -0.1, g);
  rbox(chaiseW - 0.01, 0.16, chaiseLen - 0.25, 0.07, M.boucle, x0 + chaiseW / 2, seatH - 0.04, back - 0.25 - (chaiseLen - 0.25) / 2, g);
  rbox(L, 0.42, 0.24, 0.08, M.boucle, 0, 0.49, back - 0.12, g);
  rbox(0.22, 0.32, Dp, 0.08, M.boucle, L / 2 - 0.11, 0.42, 0, g);
  for (let i = 0; i < 3; i++) rbox(0.8, 0.4, 0.18, 0.09, M.boucle, x0 + 0.47 + i * 0.83, 0.66, back - 0.3, g).rotation.x = -0.14;
  rbox(0.48, 0.46, 0.14, 0.07, M.terracotta, x0 + 0.5, 0.67, back - 0.44, g).rotation.set(-0.25, 0.25, 0.08);
  rbox(0.42, 0.42, 0.13, 0.07, M.olive, x0 + 0.95, 0.64, back - 0.45, g).rotation.set(-0.22, 0.1, -0.06);
  rbox(0.44, 0.3, 0.12, 0.06, M.linen, L / 2 - 0.5, 0.6, back - 0.45, g).rotation.set(-0.3, -0.25, 0);
  const blanket = new THREE.MeshStandardMaterial({ color: '#a4583a', roughness: 1, bumpMap: tex.noise, bumpScale: 0.5 });
  rbox(0.75, 0.025, 0.5, 0.012, blanket, x0 + chaiseW / 2, seatH + 0.05, -chaiseLen + back + 0.4, g);
  rbox(0.75, 0.22, 0.025, 0.012, blanket, x0 + chaiseW / 2, seatH - 0.06, -chaiseLen + back + 0.145, g).rotation.x = 0.1;
  return g;
}

function loungeChair(x, z, rotY, seatMat = M.leather) {
  const g = group(x, z, rotY);
  for (const sx of [-0.36, 0.36]) {
    rbox(0.04, 0.04, 0.8, 0.015, M.walnut, sx, 0.02, 0, g);
    rbox(0.04, 0.42, 0.04, 0.015, M.walnut, sx, 0.21, 0.36, g).rotation.x = -0.1;
    rbox(0.04, 0.75, 0.04, 0.015, M.walnut, sx, 0.4, -0.3, g).rotation.x = 0.35;
    rbox(0.04, 0.04, 0.6, 0.015, M.walnut, sx, 0.52, 0.02, g);
  }
  rbox(0.68, 0.12, 0.6, 0.05, seatMat, 0, 0.36, 0.05, g).rotation.x = 0.06;
  rbox(0.68, 0.62, 0.12, 0.05, seatMat, 0, 0.66, -0.3, g).rotation.x = 0.32;
  rbox(0.56, 0.16, 0.08, 0.04, M.linen, 0, 0.83, -0.32, g).rotation.x = 0.32;
  return g;
}

// Faces local +z
function diningChair(x, z, rotY) {
  const g = group(x, z, rotY);
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    rbox(0.035, 0.46, 0.035, 0.01, M.walnut, lx, 0.23, lz, g).rotation.set(lz * 0.25, 0, -lx * 0.25);
  }
  rbox(0.48, 0.05, 0.46, 0.02, M.walnut, 0, 0.46, 0, g);
  rbox(0.44, 0.04, 0.42, 0.02, M.rattan, 0, 0.495, 0.01, g);
  mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56), M.walnutDS, 0, 0.8, 0.12, g);
  for (const sx of [-0.19, 0.19]) rbox(0.03, 0.32, 0.03, 0.01, M.walnut, sx, 0.63, -0.18, g);
  return g;
}

function oliveTree(x, z, seed = 17) {
  const g = group(x, z);
  const potGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.55, 96, 4);
  const p = potGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + 0.025 * Math.cos(Math.atan2(p.getZ(i), p.getX(i)) * 24);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  potGeo.computeVertexNormals();
  mesh(potGeo, M.potTerra, 0, 0.275, 0, g);
  mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32), M.stoneware, 0, 0.53, 0, g);
  const r = TX.rng(seed);
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.5, 0), V(0.03, 0.9, 0.02), V(-0.04, 1.3, 0), V(0.02, 1.7, -0.03)]), 20, 0.03, 8), M.bark, 0, 0, 0, g);
  const centres = [V(0.05, 1.75, 0), V(-0.22, 1.55, 0.1), V(0.25, 1.5, -0.1), V(0, 2.0, 0.05), V(-0.1, 1.85, -0.2), V(0.18, 1.9, 0.18)];
  const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), M.leaf, 900);
  leaves.castShadow = true;
  const d = new THREE.Object3D();
  for (let i = 0; i < 900; i++) {
    const c = centres[i % centres.length];
    d.position.set(c.x + (r() - 0.5) * 0.45, c.y + (r() - 0.5) * 0.35, c.z + (r() - 0.5) * 0.45);
    d.rotation.set(r() * 3, r() * 3, r() * 3);
    d.scale.set(0.045, 0.01, 0.012);
    d.updateMatrix();
    leaves.setMatrixAt(i, d.matrix);
  }
  g.add(leaves);
  for (const c of centres.slice(1)) mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(0, c.y - 0.3, 0), c), 2, 0.012, 6), M.bark, 0, 0, 0, g);
}

function snakePlant(x, z, seed = 23, scale = 1) {
  const g = group(x, z);
  g.scale.setScalar(scale);
  mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.45, 48), M.stoneware, 0, 0.225, 0, g);
  const r = TX.rng(seed);
  for (let i = 0; i < 16; i++) {
    const h = 0.5 + r() * 0.6;
    const blade = new THREE.PlaneGeometry(0.07, h, 1, 6);
    const p = blade.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const t = (p.getY(k) + h / 2) / h;
      p.setX(k, p.getX(k) * (1 - t * 0.85));
      p.setZ(k, t * t * 0.08);
    }
    blade.computeVertexNormals();
    mesh(blade, i % 3 ? M.leafDark : M.leaf, (r() - 0.5) * 0.2, 0.45 + h / 2, (r() - 0.5) * 0.2, g).rotation.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3);
  }
}

const lampLights = [];
function floorLamp(x, z) {
  mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.025, 48), M.black, x, 0.012, z);
  mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 12), M.brass, x, 0.76, z);
  mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.32, 48, 1, true), LED.lamp, x, 1.55, z, scene, { cast: false });
  const l = new THREE.PointLight(0xffc98a, 0, 6, 2);
  l.position.set(x, 1.5, z);
  scene.add(l);
  lampLights.push(l);
}

// ---------------------------------------------------------------------------
// Living area (hall, left)
// ---------------------------------------------------------------------------
mesh(new THREE.BoxGeometry(2.4, 0.012, 3.2), M.rug, LC.x - 0.15, 0.006, LC.z, scene, { cast: false });
sofa(LC.x + 1.55, LC.z, Math.PI / 2);
{
  const cx = LC.x - 0.2, cz = LC.z;
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 64), M.trav, cx, 0.35, cz);
  mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.32, 64), M.trav, cx, 0.16, cz);
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 64), M.walnut, cx + 0.55, 0.27, cz - 0.7);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.255, 16), M.black, cx + 0.55, 0.128, cz - 0.7);
  box(0.3, 0.04, 0.22, M.book3, cx + 0.15, 0.4, cz + 0.12).rotation.y = 0.3;
  box(0.26, 0.03, 0.2, M.book2, cx + 0.15, 0.435, cz + 0.12).rotation.y = 0.15;
  mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.stoneware, cx - 0.15, 0.49, cz - 0.1).scale.y = 0.6;
  mesh(new THREE.SphereGeometry(0.035, 16, 12), M.terracotta, cx - 0.17, 0.43, cz - 0.1);
}
mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.025, 48), M.trav, LC.x + 1.6, 0.55, LC.z - 1.62);
mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 12), M.black, LC.x + 1.6, 0.27, LC.z - 1.62);
mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.01, 32), M.black, LC.x + 1.6, 0.005, LC.z - 1.62);
oliveTree(-S + 0.35, -S + 0.35);
// low walnut bench under the rear window
box(1.4, 0.42, 0.38, M.walnut, LC.x, 0.21, -S + 0.19);
mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.ceramic, LC.x - 0.4, 0.42, -S + 0.2);
box(0.3, 0.06, 0.22, M.book1, LC.x + 0.35, 0.45, -S + 0.2);

// Compact dining for four (hall, right-rear corner by the window)
const HD = V(2.2, 0, -2.2);
{
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 96), M.walnut, HD.x, 0.74, HD.z);
  mesh(new THREE.CylinderGeometry(0.14, 0.26, 0.7, 48), M.trav, HD.x, 0.35, HD.z);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    diningChair(HD.x + Math.cos(a) * 0.74, HD.z + Math.sin(a) * 0.74, Math.atan2(-Math.cos(a), -Math.sin(a)));
  }
  const vase = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.09, 0.05], [0.05, 0.16], [0.04, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  mesh(vase, M.stoneware, HD.x, 0.76, HD.z);
  const r1 = TX.rng(77);
  for (let i = 0; i < 5; i++) {
    const len = 0.3 + r1() * 0.2;
    mesh(new THREE.CylinderGeometry(0.002, 0.003, len, 4), M.bark, HD.x, 0.94 + len / 2, HD.z, scene, { cast: false }).rotation.set((r1() - 0.5) * 0.8, 0, (r1() - 0.5) * 0.8);
  }
}
floorLamp(0.72, -3.2);
snakePlant(3.2, -0.25, 23, 0.9);

// ---------------------------------------------------------------------------
// Partition between living (hall) and bedroom (L extension):
// a fixed walnut slat screen + a full-height linen curtain on a ceiling track
// ---------------------------------------------------------------------------
const SCREEN_X1 = 1.5;          // slats from x = 0 to here, curtain from here to the right wall
const curtainState = { k: 1 };   // 1 = closed, 0 = open (animated)
let curtain;
{
  const h = BAND_BOTTOM;
  const n = 15, pitch = SCREEN_X1 / n;
  for (let i = 0; i < n; i++) box(0.045, h - 0.04, 0.07, M.walnut, pitch * (i + 0.5), h / 2, ZP, scene);
  box(SCREEN_X1, 0.04, 0.09, M.walnut, SCREEN_X1 / 2, 0.02, ZP, scene);
  // recessed curtain track in the ceiling band
  box(S - SCREEN_X1, 0.012, 0.035, M.black, (S + SCREEN_X1) / 2, BAND_BOTTOM - 0.006, ZP + 0.06, ceiling, NOSHADOW);
  const w = S - SCREEN_X1 - 0.02, ch = BAND_BOTTOM - 0.04;
  const geo = new THREE.PlaneGeometry(w, ch, 160, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(((p.getX(i) + w / 2) / w) * Math.PI * 2 * 14) * 0.035);
  geo.translate(-w / 2, 0, 0); // pivot on the right edge so it stacks against the wall when open
  geo.computeVertexNormals();
  curtain = mesh(geo, M.curtain, S - 0.01, ch / 2 + 0.015, ZP + 0.06, scene);
}

// ---------------------------------------------------------------------------
// Bedroom (L extension)
// ---------------------------------------------------------------------------
const bedLights = [];
{
  // bed wall: headboard against the solid wall shared with the front room (faces +x)
  const g = group(0, DC.z, Math.PI / 2, interior);
  box(2.6, 1.2, 0.03, M.walnut2, 0, 0.6, 0.015, g);
  box(2.5, 0.008, 0.012, LED.accent, 0, 1.205, 0.02, g, NOSHADOW);
  lights.accent.push(rectLight(2.5, 0.04, V(0.04, 1.21, DC.z), V(-0.3, 1, 0), V(0, 0, 1))); // wall wash above the panel
  rbox(1.8, 0.9, 0.1, 0.04, M.olive, 0, 0.78, 0.08, g);
  for (let i = -3; i <= 3; i++) box(0.006, 0.82, 0.004, M.black, i * 0.25, 0.78, 0.131, g, NOSHADOW); // channel tufting
  // platform bed
  box(1.62, 0.08, 1.95, M.black, 0, 0.04, 1.12, g);
  rbox(1.72, 0.24, 2.05, 0.03, M.walnut, 0, 0.2, 1.15, g);
  rbox(1.6, 0.24, 1.98, 0.08, M.sheet, 0, 0.42, 1.14, g);
  rbox(1.68, 0.07, 1.5, 0.035, M.sheet, 0, 0.56, 1.42, g);
  rbox(1.68, 0.09, 0.22, 0.04, M.sheet, 0, 0.57, 0.66, g);
  const blanket = new THREE.MeshStandardMaterial({ color: '#a4583a', roughness: 1, bumpMap: tex.noise, bumpScale: 0.5 });
  rbox(1.74, 0.03, 0.5, 0.012, blanket, 0, 0.61, 1.85, g);
  rbox(1.74, 0.3, 0.025, 0.012, blanket, 0, 0.46, 2.11, g);
  for (const sx of [-0.4, 0.4]) rbox(0.68, 0.17, 0.42, 0.08, M.sheet, sx, 0.64, 0.38, g).rotation.x = -0.35;
  rbox(0.48, 0.38, 0.13, 0.06, M.terracotta, -0.25, 0.75, 0.6, g).rotation.set(-0.3, 0.1, 0.05);
  rbox(0.44, 0.34, 0.12, 0.06, M.linen, 0.27, 0.73, 0.62, g).rotation.set(-0.3, -0.1, -0.05);
  // floating nightstands + bedside pendants
  for (const sx of [-1.1, 1.1]) {
    box(0.42, 0.18, 0.36, M.walnut, sx, 0.5, 0.21, g);
    box(0.38, 0.004, 0.002, M.black, sx, 0.5, 0.391, g, NOSHADOW);
    box(0.18, 0.04, 0.14, sx < 0 ? M.book1 : M.book2, sx + 0.06, 0.61, 0.2, g);
    mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 20), M.ceramic, sx - 0.1, 0.65, 0.2, g);
    const wz = DC.z - sx, wx = 0.24;
    mesh(new THREE.SphereGeometry(0.09, 32, 20), M.bedOpal, wx, 1.28, wz, ceiling, NOSHADOW);
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12), M.brass, wx, 1.38, wz, ceiling, NOSHADOW);
    mesh(new THREE.CylinderGeometry(0.0015, 0.0015, BAND_BOTTOM - 1.39, 4), M.black, wx, (BAND_BOTTOM + 1.39) / 2, wz, ceiling, NOSHADOW);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16), M.brass, wx, BAND_BOTTOM - 0.005, wz, ceiling, NOSHADOW);
    const l = new THREE.PointLight(0xffc98a, 0, 4, 2);
    l.position.set(wx + 0.05, 1.2, wz);
    l.userData.k = 0.6;
    ceiling.add(l);
    lampLights.push(l);
  }
  // art above the headboard
  box(1.06, 0.62, 0.03, M.black, 0, 1.78, 0.015, g);
  mesh(new THREE.PlaneGeometry(1.0, 0.56), M.art, 0, 1.78, 0.032, g, { cast: false });
  // rug
  mesh(new THREE.BoxGeometry(2.6, 0.012, 1.9), M.rug, 1.55, 0.006, DC.z, scene, { cast: false });
}

// Full-height built-in wardrobe on the right wall
{
  const len = 1.8, dep = 0.6, top = BAND_BOTTOM - 0.002;
  const g = group(S, 1.85, -Math.PI / 2, interior);
  box(len - 0.04, 0.08, dep - 0.06, M.black, 0, 0.04, dep / 2 - 0.03, g);
  box(len, top - 0.08, dep, M.walnut, 0, (top + 0.08) / 2, dep / 2, g);
  for (let i = 1; i < 4; i++) box(0.006, top - 0.12, 0.004, M.black, -len / 2 + i * (len / 4), (top + 0.08) / 2, dep + 0.001, g, NOSHADOW);
  box(len - 0.02, 0.006, 0.004, M.black, 0, 2.2, dep + 0.001, g, NOSHADOW);
  for (const hx of [-0.47, -0.43, 0.43, 0.47]) box(0.012, 0.5, 0.025, M.brass, hx, 1.1, dep + 0.012, g);
}

// Dressing table with backlit arched mirror (front wall, by the wardrobe)
{
  const g = group(2.85, S, Math.PI, interior);
  box(1.0, 0.04, 0.45, M.walnut, 0, 0.76, 0.225, g);
  box(1.0, 0.14, 0.42, M.walnut, 0, 0.67, 0.21, g);
  box(0.5, 0.004, 0.002, M.black, 0, 0.67, 0.421, g, NOSHADOW);
  for (const sx of [-0.47, 0.47]) box(0.03, 0.6, 0.03, M.brass, sx, 0.3, 0.4, g);
  const arch = (w, h) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h - w / 2);
    s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    return new THREE.ShapeGeometry(s, 48);
  };
  mesh(arch(0.66, 1.06), LED.halo, 0, 1.0, 0.012, g, NOSHADOW);
  mesh(arch(0.6, 1.0), M.mirror, 0, 1.03, 0.03, g, NOSHADOW);
  box(0.58, 0.02, 0.025, M.walnut, 0, 1.0, 0.02, g); // shelf lip
  lights.accent.push(rectLight(0.5, 0.05, V(2.85, 0.98, S - 0.03), V(0, -0.4, -1), V(1, 0, 0)));
  // stool + styling
  mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.44, 40), M.boucle, 0, 0.22, 0.72, g);
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 32), M.brass, 0.25, 0.786, 0.2, g);
  for (const [bx, bh, m] of [[0.2, 0.12, M.glass2], [0.29, 0.09, M.ceramic], [0.32, 0.14, M.brass]]) mesh(new THREE.CylinderGeometry(0.028, 0.028, bh, 20), m, bx, 0.79 + bh / 2, 0.2, g);
  mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.16, 24), M.stoneware, -0.35, 0.86, 0.22, g);
  const r1 = TX.rng(9);
  for (let i = 0; i < 4; i++) {
    const len = 0.25 + r1() * 0.2;
    mesh(new THREE.CylinderGeometry(0.002, 0.003, len, 4), M.bark, -0.35, 0.94 + len / 2, 0.22, g, { cast: false }).rotation.set((r1() - 0.5) * 0.6, 0, (r1() - 0.5) * 0.6);
  }
}

// ---------------------------------------------------------------------------
// Front room: entrance lounge
// ---------------------------------------------------------------------------
{
  const cx = -2.45, cz = 2.15;
  mesh(new THREE.BoxGeometry(1.8, 0.012, 1.8), M.rug, cx - 0.1, 0.006, cz - 0.1, scene, { cast: false });
  loungeChair(cx - 0.65, cz, Math.PI / 2, M.boucle);
  loungeChair(cx, cz - 0.7, 0, M.boucle);
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 48), M.walnut, cx, 0.42, cz);
  mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.4, 32), M.trav, cx, 0.2, cz);
  mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 24), M.ceramic, cx + 0.05, 0.5, cz);
  // shoe cabinet + round mirror on the side wall
  const g = group(XF, cz + 0.2, -Math.PI / 2, interior);
  box(1.2, 0.8, 0.35, M.walnut, 0, 0.5, 0.175, g);
  mesh(new THREE.CircleGeometry(0.42, 64), M.mirror, 0, 1.65, 0.02, g, NOSHADOW);
  mesh(new THREE.TorusGeometry(0.43, 0.015, 12, 96), M.brass, 0, 1.65, 0.02, g, NOSHADOW);
  mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.25, 24), M.ceramic, 0.4, 1.02, 0.17, g);
  oliveTree(-S + 0.35, S - 0.4, 51);
}

// ---------------------------------------------------------------------------
// Sun / ambient
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight('#dfe8f2', '#8a7560', 0);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 0);
sun.position.set(7, 6, -9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 40 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

// ---------------------------------------------------------------------------
// Post-processing (bloom makes the LED lines glow)
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Lighting state & scenes
// ---------------------------------------------------------------------------
const state = { scene: 'evening', curtain: true, cove: true, edge: true, down: true, pendant: true, accent: true, lamp: true, temp: 3000, bright: 1, color: null };
const SCENES = {
  day: { hemi: 1.1, sun: 4.5, env: 0.35, exposure: 0.72, cove: 0.35, down: 0, pendant: 0, lamp: 0, accent: 0.3, edge: 0.35, sky: 'day', tv: 0, bloom: 0.25,
    toggles: { cove: true, edge: true, down: false, pendant: false, accent: true, lamp: false } },
  evening: { hemi: 0.22, sun: 0, env: 0.1, exposure: 1.0, cove: 1, down: 1, pendant: 1, lamp: 1, accent: 1, edge: 1, sky: 'evening', tv: 0, bloom: 0.55,
    toggles: { cove: true, edge: true, down: true, pendant: true, accent: true, lamp: true } },
  cinema: { hemi: 0.01, sun: 0, env: 0.015, exposure: 1.05, cove: 0.45, down: 0.15, pendant: 0, lamp: 0, accent: 0.8, edge: 0.6, sky: 'night', tv: 1, bloom: 0.7,
    toggles: { cove: true, edge: true, down: false, pendant: false, accent: true, lamp: false } },
};

function kelvin(k) {
  const t = k / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = (v) => Math.min(255, Math.max(0, v)) / 255;
  return new THREE.Color().setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
}

let envIntensity = -1;
function applyEnvIntensity() {
  scene.traverse((o) => {
    if (o.isMesh && o.material && 'envMapIntensity' in o.material) {
      o.material.envMapIntensity = o.material === M.brass || o.material === M.mirror ? envIntensity * 6 + 0.25 : envIntensity;
    }
  });
}

function applyLighting() {
  const s = SCENES[state.scene];
  const ledCol = state.color ? state.color.clone() : kelvin(state.temp);
  const warm = kelvin(2700);
  const b = state.bright;
  const day = state.scene === 'day';

  hemi.intensity = s.hemi;
  sun.intensity = s.sun;
  skyMat.map = skyTex[s.sky];
  skyMat.needsUpdate = true;
  M.ground.color.set(day ? '#8a8a5e' : '#24241e');
  scene.background.set(day ? '#cfd9e2' : '#121110');
  renderer.toneMappingExposure = s.exposure;
  bloom.strength = s.bloom;
  if (envIntensity !== s.env) {
    envIntensity = s.env;
    applyEnvIntensity();
  }

  const coveK = state.cove ? s.cove * b : 0;
  lights.cove.forEach((l) => {
    l.color.copy(ledCol);
    l.intensity = 5.5 * coveK * (l.userData.factor ?? 1);
  });
  LED.cove.color.copy(ledCol).multiplyScalar(state.cove ? 1.5 + 4 * coveK : 0.15);

  const edgeK = state.edge ? s.edge * b : 0;
  lights.edge.forEach((l) => {
    l.color.copy(ledCol);
    l.intensity = 7 * edgeK;
  });
  LED.edge.color.copy(ledCol).multiplyScalar(state.edge ? 2 + 10 * edgeK : 0.12);

  const downK = state.down ? Math.max(s.down, day ? 0.4 : 0) : 0;
  lights.down.forEach((l) => {
    l.color.copy(warm);
    l.intensity = { graze: 12, art: 14, general: 8 }[l.userData.kind] * downK;
  });
  LED.down.color.copy(warm).multiplyScalar(state.down ? 1 + 6 * downK : 0.1);

  const pendK = state.pendant ? Math.max(s.pendant, day ? 0.5 : 0) : 0;
  lights.pendant.forEach((l) => {
    l.color.copy(warm);
    l.intensity = l.userData.k * pendK;
  });
  LED.pendant.color.copy(warm).multiplyScalar(state.pendant ? 1 + 5 * pendK : 0.2);
  M.opal.emissiveIntensity = state.pendant ? 0.1 + 1.2 * pendK : 0;

  const accK = state.accent ? s.accent : 0;
  lights.accent.forEach((l) => {
    l.color.copy(ledCol);
    l.intensity = 6 * accK;
  });
  LED.accent.color.copy(ledCol).multiplyScalar(state.accent ? 1 + 6 * accK : 0.1);
  LED.halo.color.copy(ledCol).multiplyScalar(state.accent ? 0.6 + 1.6 * accK : 0.1);

  const lampK = state.lamp ? Math.max(s.lamp, day ? 0.5 : 0) : 0;
  lampLights.forEach((l) => (l.intensity = (l.userData.k ?? 2.2) * lampK));
  M.bedOpal.emissiveIntensity = state.lamp ? 0.05 + 0.45 * lampK : 0;
  LED.lamp.emissiveIntensity = state.lamp ? 0.1 + 0.7 * lampK : 0;

  M.screen.emissiveIntensity = s.tv * 0.9;
  lights.tv.color.set('#ffb07a');
  lights.tv.intensity = s.tv * 1.6;
}

function setScene(name) {
  state.scene = name;
  Object.assign(state, SCENES[name].toggles);
  if (name === 'cinema' && !state.color) state.color = new THREE.Color('#ff9a4d');
  if (name !== 'cinema' && state.colorFromScene) state.color = null;
  state.colorFromScene = name === 'cinema';
  applyLighting();
  syncUI();
}

// ---------------------------------------------------------------------------
// Views & cut-away
// ---------------------------------------------------------------------------
const VIEWS = {
  living: { pos: V(2.9, 1.55, 0.3), target: V(-1.6, 1.5, -1.8) },
  dining: { pos: V(-0.1, 1.6, 0.1), target: V(2.4, 0.9, -2.4) },
  partition: { pos: V(0.2, 1.5, -2.2), target: V(1.8, 1.3, 0.76) },
  bedroom: { pos: V(2.6, 1.6, 1.0), target: V(0.2, 0.9, 2.5) },
  dressing: { pos: V(1.3, 1.45, 1.5), target: V(2.85, 1.15, 3.5) },
  ceiling: { pos: V(1.4, 1.0, 0.2), target: V(-1.6, 3.0, -1.6) },
  dome: { pos: V(2.6, 1.05, 1.0), target: V(1.4, 3.1, 2.3) },
  front: { pos: V(-0.45, 1.55, 3.25), target: V(-2.5, 1.2, 1.2) },
  plan: { pos: V(0, 13.5, 0.6), target: V(0, 0, 0) },
  section: { pos: V(0.3, 2.4, 8.6), target: V(0, 1.5, 0) },
};
let tween = null;
function goTo(name) {
  const v = VIEWS[name];
  tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: v.pos, t1: v.target };
}

const _tmp = new THREE.Vector3();
function updateCutaway() {
  const p = camera.position;
  const above = p.y > WH + 0.3;
  for (const w of Object.values(walls)) {
    const vis = above || _tmp.copy(p).sub(w.point).dot(w.normal) > -0.05;
    w.group.visible = vis;
    w.extra.forEach((e) => (e.visible = vis));
  }
  ceiling.visible = !above;
  sky.visible = Math.abs(p.x) < S && Math.abs(p.z) < S && p.y < WH;
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
function syncUI() {
  document.querySelectorAll('[data-scene]').forEach((b) => b.classList.toggle('active', b.dataset.scene === state.scene));
  document.querySelectorAll('[data-toggle]').forEach((el) => (el.checked = !!state[el.dataset.toggle]));
  $('temp').value = state.temp;
  $('tempVal').textContent = state.color ? 'Custom colour' : `${state.temp} K`;
  $('bright').value = Math.round(state.bright * 100);
  $('brightVal').textContent = `${Math.round(state.bright * 100)} %`;
  document.querySelectorAll('[data-color]').forEach((b) => {
    const c = b.dataset.color;
    b.classList.toggle('active', state.color ? c === '#' + state.color.getHexString(THREE.SRGBColorSpace) : c === `k${state.temp}`);
  });
}
document.querySelectorAll('[data-scene]').forEach((b) => b.addEventListener('click', () => setScene(b.dataset.scene)));
document.querySelectorAll('[data-toggle]').forEach((el) =>
  el.addEventListener('change', () => {
    state[el.dataset.toggle] = el.checked;
    applyLighting();
  }),
);
$('temp').addEventListener('input', (e) => {
  state.temp = +e.target.value;
  state.color = null;
  applyLighting();
  syncUI();
});
$('bright').addEventListener('input', (e) => {
  state.bright = e.target.value / 100;
  applyLighting();
  syncUI();
});
document.querySelectorAll('[data-color]').forEach((b) =>
  b.addEventListener('click', () => {
    const c = b.dataset.color;
    if (c.startsWith('k')) {
      state.temp = +c.slice(1);
      state.color = null;
    } else state.color = new THREE.Color(c);
    state.colorFromScene = false;
    applyLighting();
    syncUI();
  }),
);
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => goTo(b.dataset.view)));
$('panelToggle').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
$('shot').addEventListener('click', () => {
  composer.render();
  const a = document.createElement('a');
  a.download = `tiken-house-${state.scene}.png`;
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Deep links, e.g. ?scene=cinema&view=dome
const params = new URLSearchParams(location.search);
setScene(SCENES[params.get('scene')] ? params.get('scene') : 'evening');
const startView = VIEWS[params.get('view')] || VIEWS.living;
camera.position.copy(startView.pos);
controls.target.copy(startView.target);
controls.update();

// ?still=1 renders a couple of frames and stops (used for automated previews)
const still = params.has('still');
let stillFrames = 2;
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 1.3);
    const e = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - (-2 * tween.t + 2) ** 3 / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (tween.t >= 1) tween = null;
  }
  controls.update();
  updateCutaway();
  curtainState.k += ((state.curtain ? 1 : 0) - curtainState.k) * Math.min(1, dt * 4);
  curtain.scale.x = 0.12 + 0.88 * curtainState.k;
  composer.render();
  if (!still || stillFrames-- > 0) requestAnimationFrame(frame);
}
document.body.classList.add('ready');
frame();
window.__room = { state, setScene, goTo, applyLighting, camera, controls };
