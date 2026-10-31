// Tiken Interior – "Warm Minimal" living room
// Floating gypsum ceiling with a perimeter LED cove, a shadow-gap edge light
// along every wall, recessed downlights and a ring pendant.
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
// Room dimensions (metres)
// ---------------------------------------------------------------------------
const W = 6.0;            // x: -3 … 3
const D = 5.0;            // z: -2.5 … 2.5
const H = 3.0;            // structural slab height
const HX = W / 2, HZ = D / 2;

// Ceiling design
const BAND_BOTTOM = 2.70; // underside of the dropped perimeter band (finished ceiling)
const BAND_TOP = 2.80;    // top of the band / LED cove shelf
const LIP_TOP = 2.87;     // upstand that hides the cove LED tape
const BAND_W = 0.70;      // width of the band measured from the wall
const GAP = 0.06;         // shadow gap between band and wall (edge light lives here)
const IX = HX - BAND_W, IZ = HZ - BAND_W; // inner (raised) opening half-sizes

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
renderer.toneMappingExposure = 1.0;
app.appendChild(renderer.domElement);

RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#141210');

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(2.55, 1.5, 2.3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.4, 1.45, -0.9);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.4;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.92;
controls.update();

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const tex = {
  oak: TX.oakFloor(),
  walnut: TX.walnut(3),
  walnut2: TX.walnut(8),
  noise: TX.noise(256, 11, 0.8),
  fine: TX.noise(256, 4, 0.3),
  trav: TX.travertine(),
  rug: TX.rug(),
  art: TX.artwork(),
  tv: TX.tvPicture(),
};
tex.noise.repeat.set(6, 6);
tex.fine.repeat.set(10, 10);

const M = {
  wall: new THREE.MeshStandardMaterial({ color: '#ebe4d8', roughness: 0.95, bumpMap: tex.fine, bumpScale: 0.15 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.97 }),
  band: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.95 }),
  floor: new THREE.MeshStandardMaterial({ map: tex.oak, roughness: 0.62 }),
  walnut: new THREE.MeshStandardMaterial({ map: tex.walnut, roughness: 0.55, color: '#ffffff' }),
  walnut2: new THREE.MeshStandardMaterial({ map: tex.walnut2, roughness: 0.6 }),
  boucle: new THREE.MeshStandardMaterial({ color: '#e6dccb', roughness: 1, bumpMap: tex.noise, bumpScale: 0.6 }),
  terracotta: new THREE.MeshStandardMaterial({ color: '#b5653e', roughness: 0.95, bumpMap: tex.noise, bumpScale: 0.3 }),
  olive: new THREE.MeshStandardMaterial({ color: '#6b6e4e', roughness: 0.95, bumpMap: tex.noise, bumpScale: 0.3 }),
  linen: new THREE.MeshStandardMaterial({ color: '#d8cdbb', roughness: 1, side: THREE.DoubleSide, bumpMap: tex.fine, bumpScale: 0.3 }),
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
  glass: new THREE.MeshStandardMaterial({ color: '#cfe0e8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12 }),
  art: new THREE.MeshStandardMaterial({ map: tex.art, roughness: 0.9 }),
  screen: new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.12, metalness: 0.2, emissive: '#ffffff', emissiveMap: tex.tv, emissiveIntensity: 0 }),
  trim: new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.5, metalness: 0.3 }),
  book1: new THREE.MeshStandardMaterial({ color: '#2f3b36', roughness: 0.8 }),
  book2: new THREE.MeshStandardMaterial({ color: '#c8b593', roughness: 0.8 }),
  book3: new THREE.MeshStandardMaterial({ color: '#8b3f2a', roughness: 0.8 }),
};

// LED "tape" materials – self-illuminated, pushed above 1.0 so bloom picks them up.
function ledMaterial() {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) });
}
const LED = {
  cove: ledMaterial(),
  edge: ledMaterial(),
  down: ledMaterial(),
  pendant: ledMaterial(),
  accent: ledMaterial(),
  lamp: new THREE.MeshStandardMaterial({ color: '#efe4d0', roughness: 1, side: THREE.DoubleSide, emissive: '#ffcf96', emissiveIntensity: 1 }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

const _m4 = new THREE.Matrix4();
// RectAreaLight aimed along `normal`, with its width running along `widthDir`.
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
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------
// Shell: floor, walls (each wall is a group so it can be cut away)
// ---------------------------------------------------------------------------
const floor = mesh(new THREE.PlaneGeometry(W, D), M.floor, 0, 0, 0, scene, { cast: false });
floor.rotation.x = -Math.PI / 2;

const T = 0.12; // wall thickness
const walls = {
  back: { group: new THREE.Group(), normal: V(0, 0, 1), point: V(0, 0, -HZ) },
  front: { group: new THREE.Group(), normal: V(0, 0, -1), point: V(0, 0, HZ) },
  left: { group: new THREE.Group(), normal: V(1, 0, 0), point: V(-HX, 0, 0) },
  right: { group: new THREE.Group(), normal: V(-1, 0, 0), point: V(HX, 0, 0) },
};
Object.values(walls).forEach((w) => scene.add(w.group));

// back / front / right walls are solid
box(W + 2 * T, H, T, M.wall, 0, H / 2, -HZ - T / 2, walls.back.group);
box(W + 2 * T, H, T, M.wall, 0, H / 2, HZ + T / 2, walls.front.group);
box(T, H, D, M.wall, HX + T / 2, H / 2, 0, walls.right.group);

// left wall with a large window opening
const WIN = { z0: -1.3, z1: 1.3, y0: 0.35, y1: 2.55 };
{
  const g = walls.left.group, x = -HX - T / 2;
  box(T, H, HZ + WIN.z0, M.wall, x, H / 2, (-HZ + WIN.z0) / 2, g);
  box(T, H, HZ - WIN.z1, M.wall, x, H / 2, (HZ + WIN.z1) / 2, g);
  box(T, WIN.y0, WIN.z1 - WIN.z0, M.wall, x, WIN.y0 / 2, 0, g);
  box(T, H - WIN.y1, WIN.z1 - WIN.z0, M.wall, x, (H + WIN.y1) / 2, 0, g);
  // slim black frame + mullions
  const fw = 0.035;
  const fx = -HX - 0.04;
  box(0.05, fw, WIN.z1 - WIN.z0, M.black, fx, WIN.y0 + fw / 2, 0, g);
  box(0.05, fw, WIN.z1 - WIN.z0, M.black, fx, WIN.y1 - fw / 2, 0, g);
  box(0.05, WIN.y1 - WIN.y0, fw, M.black, fx, (WIN.y0 + WIN.y1) / 2, WIN.z0 + fw / 2, g);
  box(0.05, WIN.y1 - WIN.y0, fw, M.black, fx, (WIN.y0 + WIN.y1) / 2, WIN.z1 - fw / 2, g);
  box(0.05, WIN.y1 - WIN.y0, fw * 0.8, M.black, fx, (WIN.y0 + WIN.y1) / 2, 0, g);
  box(0.05, fw * 0.8, WIN.z1 - WIN.z0, M.black, fx, 0.95, 0, g);
  const glass = mesh(new THREE.PlaneGeometry(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0), M.glass, fx, (WIN.y0 + WIN.y1) / 2, 0, g, { cast: false, receive: false });
  glass.rotation.y = Math.PI / 2;
  // travertine sill
  box(0.22, 0.03, WIN.z1 - WIN.z0 + 0.1, M.trav, -HX + 0.05, WIN.y0 - 0.015, 0, g);
}
// Outside view
const skyTex = { day: TX.skyView('day'), evening: TX.skyView('evening'), night: TX.skyView('night') };
const skyMat = new THREE.MeshBasicMaterial({ map: skyTex.evening });
const sky = mesh(new THREE.PlaneGeometry(12, 7), skyMat, -6.0, 1.6, 0, scene, { cast: false, receive: false });
sky.rotation.y = Math.PI / 2;

// Flush skirting (shadow-line skirting, 80 mm)
const skirtMat = new THREE.MeshStandardMaterial({ color: '#d9d0c2', roughness: 0.8 });
box(W, 0.08, 0.012, skirtMat, 0, 0.04, -HZ + 0.006, walls.back.group);
box(W, 0.08, 0.012, skirtMat, 0, 0.04, HZ - 0.006, walls.front.group);
box(0.012, 0.08, D, skirtMat, HX - 0.006, 0.04, 0, walls.right.group);
box(0.012, 0.08, D, skirtMat, -HX + 0.006, 0.04, 0, walls.left.group);

// ---------------------------------------------------------------------------
// CEILING – floating perimeter band, LED cove and shadow-gap edge light
// ---------------------------------------------------------------------------
const ceiling = new THREE.Group();
scene.add(ceiling);

// structural slab (painted) – visible through the central raised field
const slab = mesh(new THREE.PlaneGeometry(W, D), M.ceiling, 0, H, 0, ceiling, { cast: false });
slab.rotation.x = Math.PI / 2;

// dropped band (gypsum board on metal furring) – a frame around the room
{
  const t = BAND_TOP - BAND_BOTTOM, yc = (BAND_TOP + BAND_BOTTOM) / 2;
  const ox = HX - GAP, oz = HZ - GAP;
  const dz = oz - IZ, dx = ox - IX;
  box(2 * ox, t, dz, M.band, 0, yc, -(IZ + dz / 2), ceiling, { cast: false });
  box(2 * ox, t, dz, M.band, 0, yc, IZ + dz / 2, ceiling, { cast: false });
  box(dx, t, 2 * IZ, M.band, -(IX + dx / 2), yc, 0, ceiling, { cast: false });
  box(dx, t, 2 * IZ, M.band, IX + dx / 2, yc, 0, ceiling, { cast: false });

  // cove upstand (hides the LED tape from below)
  const lt = 0.015, lh = LIP_TOP - BAND_TOP, ly = BAND_TOP + lh / 2;
  box(2 * IX + lt, lh, lt, M.band, 0, ly, -IZ - lt / 2, ceiling, { cast: false });
  box(2 * IX + lt, lh, lt, M.band, 0, ly, IZ + lt / 2, ceiling, { cast: false });
  box(lt, lh, 2 * IZ, M.band, -IX - lt / 2, ly, 0, ceiling, { cast: false });
  box(lt, lh, 2 * IZ, M.band, IX + lt / 2, ly, 0, ceiling, { cast: false });

  // shadow-gap channel top (dark recess above the gap)
  const chMat = new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.9 });
  const cy = BAND_TOP - 0.002;
  box(W, 0.004, GAP, chMat, 0, cy, -HZ + GAP / 2, ceiling, { cast: false });
  box(W, 0.004, GAP, chMat, 0, cy, HZ - GAP / 2, ceiling, { cast: false });
  box(GAP, 0.004, D, chMat, -HX + GAP / 2, cy, 0, ceiling, { cast: false });
  box(GAP, 0.004, D, chMat, HX - GAP / 2, cy, 0, ceiling, { cast: false });
}

const lights = { cove: [], edge: [], down: [], accent: [] };

// Cove LED tape on top of the band, set back 60 mm behind the upstand,
// with an upward-facing area light per side to wash the raised ceiling.
{
  const s = 0.06, y = BAND_TOP + 0.008;
  const strips = [
    { len: 2 * IX, pos: V(0, y, -IZ - s), w: V(1, 0, 0) },
    { len: 2 * IX, pos: V(0, y, IZ + s), w: V(1, 0, 0) },
    { len: 2 * IZ, pos: V(-IX - s, y, 0), w: V(0, 0, 1) },
    { len: 2 * IZ, pos: V(IX + s, y, 0), w: V(0, 0, 1) },
  ];
  for (const st of strips) {
    const along = st.w.x ? [st.len, 0.012, 0.02] : [0.02, 0.012, st.len];
    box(...along, LED.cove, st.pos.x, st.pos.y, st.pos.z, ceiling, { cast: false, receive: false });
    const l = rectLight(st.len, 0.1, st.pos.clone().add(V(0, 0.01, 0)), V(0, 1, 0), st.w, ceiling);
    lights.cove.push(l);
    // a second, inward-tilted light gives the soft gradient towards the centre
    const inward = V(-Math.sign(st.pos.x) * (st.w.z ? 1 : 0), 0.9, -Math.sign(st.pos.z) * (st.w.x ? 1 : 0));
    const l2 = rectLight(st.len, 0.1, st.pos.clone().add(V(0, 0.02, 0)), inward, st.w, ceiling);
    l2.userData.factor = 0.6;
    lights.cove.push(l2);
  }
}

// Edge light: LED profile in the shadow gap, washing down every wall.
{
  const y = BAND_TOP - 0.006, g = GAP / 2;
  const strips = [
    { len: W, pos: V(0, y, -HZ + g), w: V(1, 0, 0), n: V(0, 0, -1) },
    { len: W, pos: V(0, y, HZ - g), w: V(1, 0, 0), n: V(0, 0, 1) },
    { len: D, pos: V(-HX + g, y, 0), w: V(0, 0, 1), n: V(-1, 0, 0) },
    { len: D, pos: V(HX - g, y, 0), w: V(0, 0, 1), n: V(1, 0, 0) },
  ];
  for (const st of strips) {
    const dims = st.w.x ? [st.len, 0.006, 0.022] : [0.022, 0.006, st.len];
    box(...dims, LED.edge, st.pos.x, st.pos.y, st.pos.z, ceiling, { cast: false, receive: false });
    // grazing wash: placed inside the room, aimed back at the wall and down
    const p = st.pos.clone().addScaledVector(st.n, -0.32);
    p.y = BAND_BOTTOM - 0.01;
    const l = rectLight(st.len - 0.1, 0.05, p, st.n.clone().add(V(0, -0.5, 0)), st.w, ceiling);
    lights.edge.push(l);
  }
}

// Recessed downlights in the band (warm dim, 36° beam)
{
  const y = BAND_BOTTOM - 0.002;
  const spots = [
    // grazing the fluted TV wall
    [-1.1, -HZ + 0.32, 0, -0.06], [1.1, -HZ + 0.32, 0, -0.06],
    // front band
    [-1.6, HZ - 0.35, 0, 0], [1.6, HZ - 0.35, 0, 0],
    // window side & art wall
    [-HX + 0.35, -1.0, 0, 0], [-HX + 0.35, 1.0, 0, 0],
    [HX - 0.35, -0.25, 0.25, 0], [HX - 0.35, 1.4, 0, 0],
  ];
  const ringGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.006, 32);
  const lensGeo = new THREE.CircleGeometry(0.028, 32);
  spots.forEach(([x, z, tx, tz], i) => {
    mesh(ringGeo, M.black, x, y, z, ceiling, { cast: false, receive: false });
    const lens = mesh(lensGeo, LED.down, x, y - 0.004, z, ceiling, { cast: false, receive: false });
    lens.rotation.x = Math.PI / 2;
    const s = new THREE.SpotLight(0xffffff, 0, 9, THREE.MathUtils.degToRad(i < 2 ? 22 : 30), 0.65, 2);
    s.position.set(x, y - 0.01, z);
    s.target.position.set(x + tx * 3, 0, z + tz * 3);
    // wall washers for the art
    if (i === 6) s.target.position.set(HX, 1.2, -0.25);
    scene.add(s, s.target);
    lights.down.push(s);
  });
}

// Ring pendant over the coffee table – two brass halos with downward LED diffusers.
const pendant = new THREE.Group();
scene.add(pendant);
{
  const rings = [
    { r: 0.55, y: 2.32 },
    { r: 0.36, y: 2.18 },
  ];
  for (const { r, y } of rings) {
    const halo = mesh(new THREE.TorusGeometry(r, 0.018, 16, 128), M.brass, 0, y, 0, pendant, { cast: false });
    halo.rotation.x = Math.PI / 2;
    const diff = mesh(new THREE.TorusGeometry(r, 0.01, 8, 128), LED.pendant, 0, y - 0.012, 0, pendant, { cast: false, receive: false });
    diff.rotation.x = Math.PI / 2;
    diff.scale.z = 0.5;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + (r < 0.5 ? 0.5 : 0);
      const len = H - y;
      mesh(new THREE.CylinderGeometry(0.0015, 0.0015, len, 4), M.black, Math.cos(a) * r, y + len / 2, Math.sin(a) * r, pendant, { cast: false });
    }
  }
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 32), M.brass, 0, H - 0.008, 0, pendant, { cast: false });
}
const pendantLight = new THREE.PointLight(0xffffff, 0, 8, 2);
pendantLight.position.set(0, 2.1, 0);
scene.add(pendantLight);

// ---------------------------------------------------------------------------
// TV feature wall – fluted walnut, floating console, accent LEDs
// ---------------------------------------------------------------------------
const tvWall = walls.back.group;
{
  const panelW = 2.8, panelH = BAND_TOP, r = 0.019, zBack = -HZ;
  box(panelW, panelH, 0.012, M.walnut2, 0, panelH / 2, zBack + 0.006, tvWall);
  const count = Math.floor(panelW / (2 * r));
  const fluteGeo = new THREE.CylinderGeometry(r, r, panelH, 14, 1, true, -Math.PI / 2, Math.PI);
  const flutes = new THREE.InstancedMesh(fluteGeo, M.walnut, count);
  flutes.castShadow = flutes.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(-panelW / 2 + r + i * 2 * r, panelH / 2, zBack + 0.012);
    dummy.updateMatrix();
    flutes.setMatrixAt(i, dummy.matrix);
  }
  tvWall.add(flutes);

  // vertical LED reveals either side of the panel
  for (const sx of [-1, 1]) {
    box(0.012, panelH - 0.1, 0.012, LED.accent, sx * (panelW / 2 + 0.012), panelH / 2, zBack + 0.01, tvWall, { cast: false, receive: false });
    const l = rectLight(0.03, panelH - 0.1, V(sx * (panelW / 2 + 0.03), panelH / 2, zBack + 0.03), V(sx, 0, 0.6), V(0, 0, -sx), tvWall);
    // keep the width axis horizontal; rectLight requires width ⟂ normal
    lights.accent.push(l);
  }

  // floating walnut media console
  const cz = zBack + 0.034 + 0.2;
  box(2.2, 0.36, 0.4, M.walnut, 0, 0.42, cz, tvWall);
  for (let i = 1; i < 4; i++) box(0.004, 0.32, 0.002, M.black, -1.1 + i * 0.55, 0.42, cz + 0.201, tvWall, { cast: false });
  box(2.0, 0.006, 0.02, LED.accent, 0, 0.235, cz + 0.1, tvWall, { cast: false, receive: false });
  lights.accent.push(rectLight(2.0, 0.06, V(0, 0.232, cz + 0.08), V(0, -1, 0.15), V(1, 0, 0), tvWall));

  // 65" TV, wall-mounted
  box(1.46, 0.84, 0.03, M.black, 0, 1.36, zBack + 0.05, tvWall);
  const screen = mesh(new THREE.PlaneGeometry(1.43, 0.81), M.screen, 0, 1.36, zBack + 0.066, tvWall, { cast: false });
  screen.name = 'screen';
  lights.tv = rectLight(1.43, 0.81, V(0, 1.36, zBack + 0.07), V(0, 0, 1), V(1, 0, 0), tvWall);

  // styling on the console
  const vaseGeo = new THREE.LatheGeometry(
    [V(0, 0), V(0.07, 0), V(0.1, 0.06), V(0.09, 0.16), V(0.04, 0.26), V(0.035, 0.3), V(0.045, 0.32)].map((v) => new THREE.Vector2(v.x, v.y)),
    40,
  );
  mesh(vaseGeo, M.ceramic, -0.8, 0.6, cz, tvWall);
  mesh(vaseGeo, M.stoneware, -0.62, 0.6, cz + 0.05, tvWall).scale.set(0.7, 0.6, 0.7);
  // dried branches
  const r1 = TX.rng(42);
  for (let i = 0; i < 7; i++) {
    const len = 0.4 + r1() * 0.35;
    const b = mesh(new THREE.CylinderGeometry(0.002, 0.004, len, 4), M.bark, -0.8, 0.88 + len / 2, cz, tvWall, { cast: false });
    b.rotation.set((r1() - 0.5) * 0.7, 0, (r1() - 0.5) * 0.8);
    b.position.x += Math.sin(b.rotation.z) * -len / 2;
    b.position.z += Math.sin(b.rotation.x) * len / 2;
  }
  box(0.3, 0.035, 0.22, M.book2, 0.75, 0.618, cz, tvWall);
  box(0.28, 0.03, 0.2, M.book1, 0.75, 0.65, cz, tvWall);
  mesh(new THREE.SphereGeometry(0.06, 32, 16), M.trav, 0.75, 0.725, cz, tvWall);
}

// ---------------------------------------------------------------------------
// Rug, sofa, coffee tables
// ---------------------------------------------------------------------------
const rugMesh = mesh(new THREE.BoxGeometry(3.2, 0.012, 2.4), M.rug, 0, 0.006, 0.25, scene, { cast: false });

// L-shaped bouclé sofa (chaise on the left), facing the TV wall
const sofa = new THREE.Group();
sofa.position.set(0.05, 0, 1.15);
scene.add(sofa);
{
  const L = 2.9, Dp = 1.0, seatH = 0.42, chaiseLen = 1.6, chaiseW = 0.95;
  const x0 = -L / 2, back = Dp / 2;
  // recessed plinth
  box(L - 0.1, 0.08, Dp - 0.1, M.black, 0, 0.04, 0, sofa);
  box(chaiseW - 0.1, 0.08, chaiseLen - Dp, M.black, x0 + chaiseW / 2, 0.04, -Dp / 2 - (chaiseLen - Dp) / 2 + 0.05, sofa);
  // base
  rbox(L, 0.2, Dp, 0.04, M.boucle, 0, 0.18, 0, sofa);
  rbox(chaiseW, 0.2, chaiseLen, 0.04, M.boucle, x0 + chaiseW / 2, 0.18, back - chaiseLen / 2, sofa);
  // seat cushions
  const cushW = (L - chaiseW - 0.22) / 2;
  for (let i = 0; i < 2; i++) {
    rbox(cushW - 0.01, 0.16, Dp - 0.25, 0.07, M.boucle, x0 + chaiseW + cushW / 2 + i * cushW, seatH - 0.04, -0.1, sofa);
  }
  rbox(chaiseW - 0.01, 0.16, chaiseLen - 0.25, 0.07, M.boucle, x0 + chaiseW / 2, seatH - 0.04, back - 0.25 - (chaiseLen - 0.25) / 2, sofa);
  // backrest & arm
  rbox(L, 0.42, 0.24, 0.08, M.boucle, 0, 0.49, back - 0.12, sofa);
  rbox(0.22, 0.32, Dp, 0.08, M.boucle, L / 2 - 0.11, 0.42, 0, sofa);
  // back cushions
  for (let i = 0; i < 3; i++) {
    const c = rbox(0.82, 0.4, 0.18, 0.09, M.boucle, x0 + 0.48 + i * 0.86, 0.66, back - 0.3, sofa);
    c.rotation.x = -0.14;
  }
  // throw pillows
  const p1 = rbox(0.48, 0.46, 0.14, 0.07, M.terracotta, x0 + 0.5, 0.67, back - 0.44, sofa);
  p1.rotation.set(-0.25, 0.25, 0.08);
  const p2 = rbox(0.42, 0.42, 0.13, 0.07, M.olive, x0 + 0.95, 0.64, back - 0.45, sofa);
  p2.rotation.set(-0.22, 0.1, -0.06);
  const p3 = rbox(0.44, 0.3, 0.12, 0.06, M.linen, L / 2 - 0.5, 0.6, back - 0.45, sofa);
  p3.rotation.set(-0.3, -0.25, 0);
  // throw blanket draped over chaise end
  const blanketMat = new THREE.MeshStandardMaterial({ color: '#a4583a', roughness: 1, bumpMap: tex.noise, bumpScale: 0.5 });
  rbox(0.75, 0.025, 0.5, 0.012, blanketMat, x0 + chaiseW / 2, seatH + 0.05, -chaiseLen + back + 0.4, sofa);
  rbox(0.75, 0.22, 0.025, 0.012, blanketMat, x0 + chaiseW / 2, seatH - 0.06, -chaiseLen + back + 0.145, sofa).rotation.x = 0.1;
}

// Coffee tables: travertine drum + nested walnut disc
{
  const tableTop = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 64), M.trav, 0.15, 0.35, 0.05);
  mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.32, 64), M.trav, 0.15, 0.16, 0.05);
  mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 64), M.walnut, -0.55, 0.27, 0.45);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.255, 16), M.black, -0.55, 0.128, 0.45);
  mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 32), M.black, -0.55, 0.006, 0.45);
  // styling
  box(0.3, 0.04, 0.22, M.book3, 0.3, 0.4, -0.05).rotation.y = 0.3;
  box(0.26, 0.03, 0.2, M.book2, 0.3, 0.435, -0.05).rotation.y = 0.15;
  const bowl = mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.stoneware, -0.05, 0.49, 0.18);
  bowl.material = M.stoneware;
  bowl.scale.y = 0.6;
  mesh(new THREE.SphereGeometry(0.035, 16, 12), M.terracotta, -0.07, 0.43, 0.18);
  mesh(new THREE.SphereGeometry(0.035, 16, 12), M.olive, -0.01, 0.43, 0.2);
  tableTop.name = 'coffee';
}

// ---------------------------------------------------------------------------
// Reading nook by the window: cognac lounge chair, side table, plant
// ---------------------------------------------------------------------------
function loungeChair(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  // walnut sled frame
  for (const sx of [-0.36, 0.36]) {
    rbox(0.04, 0.04, 0.8, 0.015, M.walnut, sx, 0.02, 0, g);
    const front = rbox(0.04, 0.42, 0.04, 0.015, M.walnut, sx, 0.21, 0.36, g);
    front.rotation.x = -0.1;
    const rear = rbox(0.04, 0.75, 0.04, 0.015, M.walnut, sx, 0.4, -0.3, g);
    rear.rotation.x = 0.35;
    rbox(0.04, 0.04, 0.6, 0.015, M.walnut, sx, 0.52, 0.02, g); // arm
  }
  const seat = rbox(0.68, 0.12, 0.6, 0.05, M.leather, 0, 0.36, 0.05, g);
  seat.rotation.x = 0.06;
  const back = rbox(0.68, 0.62, 0.12, 0.05, M.leather, 0, 0.66, -0.3, g);
  back.rotation.x = 0.32;
  rbox(0.56, 0.16, 0.08, 0.04, M.linen, 0, 0.83, -0.32, g).rotation.x = 0.32; // headrest pillow
  return g;
}
loungeChair(-2.05, -0.55, Math.PI / 2 + 0.55);
// ottoman
rbox(0.5, 0.36, 0.45, 0.06, M.leather, -1.5, 0.18, -0.2).rotation.y = 0.5;

// side table + floor lamp between sofa and right wall
{
  mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 48), M.trav, 1.85, 0.55, 1.45);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 12), M.black, 1.85, 0.27, 1.45);
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 32), M.black, 1.85, 0.005, 1.45);
  const cup = mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 24), M.ceramic, 1.8, 0.61, 1.4);
  cup.name = 'cup';
  box(0.2, 0.03, 0.15, M.book1, 1.92, 0.578, 1.5).rotation.y = -0.4;

  // linen drum floor lamp
  mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.025, 48), M.black, -2.5, 0.012, 2.0);
  mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 12), M.brass, -2.5, 0.76, 2.0);
  const shade = mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.32, 48, 1, true), LED.lamp, -2.5, 1.55, 2.0, scene, { cast: false });
  shade.name = 'shade';
}
const lampLight = new THREE.PointLight(0xffc98a, 0, 6, 2);
lampLight.position.set(-2.5, 1.5, 2.0);
scene.add(lampLight);

// Curtains: full-height linen drapes hanging from the shadow-gap track
function curtain(z0, z1, folds) {
  const width = z1 - z0, h = BAND_TOP - 0.03;
  const geo = new THREE.PlaneGeometry(width, h, 80, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + width / 2) / width;
    p.setZ(i, Math.sin(u * Math.PI * 2 * folds) * 0.035);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, M.linen, -HX + 0.11, h / 2 + 0.01, (z0 + z1) / 2, walls.left.group);
  m.rotation.y = Math.PI / 2;
  return m;
}
curtain(-2.1, -1.3, 6);
curtain(1.3, 2.1, 6);

// Olive tree in a fluted terracotta pot (back-left corner)
function oliveTree(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const potGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.55, 96, 4);
  const p = potGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const k = 1 + 0.025 * Math.cos(a * 24);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  potGeo.computeVertexNormals();
  mesh(potGeo, M.potTerra, 0, 0.275, 0, g);
  mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32), M.stoneware, 0, 0.53, 0, g);
  const r = TX.rng(17);
  const trunkPts = [V(0, 0.5, 0), V(0.03, 0.9, 0.02), V(-0.04, 1.3, 0.0), V(0.02, 1.7, -0.03)];
  const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunkPts), 20, 0.03, 8);
  mesh(trunk, M.bark, 0, 0, 0, g);
  const centres = [V(0.05, 1.75, 0), V(-0.22, 1.55, 0.1), V(0.25, 1.5, -0.1), V(0, 2.0, 0.05), V(-0.1, 1.85, -0.2), V(0.18, 1.9, 0.18)];
  const leafGeo = new THREE.SphereGeometry(1, 6, 4);
  const n = 900;
  const leaves = new THREE.InstancedMesh(leafGeo, M.leaf, n);
  leaves.castShadow = true;
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const c = centres[i % centres.length];
    d.position.set(c.x + (r() - 0.5) * 0.45, c.y + (r() - 0.5) * 0.35, c.z + (r() - 0.5) * 0.45);
    d.rotation.set(r() * 3, r() * 3, r() * 3);
    d.scale.set(0.045, 0.01, 0.012);
    d.updateMatrix();
    leaves.setMatrixAt(i, d.matrix);
  }
  g.add(leaves);
  for (const c of centres.slice(1)) {
    const b = new THREE.TubeGeometry(new THREE.LineCurve3(V(0, c.y - 0.3, 0), c), 2, 0.012, 6);
    mesh(b, M.bark, 0, 0, 0, g);
  }
}
oliveTree(-2.5, -2.0);

// Snake plants in a stoneware planter (back-right corner)
function snakePlant(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.45, 48), M.stoneware, 0, 0.225, 0, g);
  const r = TX.rng(23);
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
    const m = mesh(blade, i % 3 ? M.leafDark : M.leaf, (r() - 0.5) * 0.2, 0.45 + h / 2, (r() - 0.5) * 0.2, g);
    m.rotation.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3);
  }
}
snakePlant(2.55, -2.05);

// ---------------------------------------------------------------------------
// Art wall (right): low walnut credenza + framed artwork
// ---------------------------------------------------------------------------
{
  const g = walls.right.group;
  const cx = HX - 0.23;
  box(0.45, 0.55, 1.9, M.walnut, cx, 0.4, -0.25, g);
  for (const zz of [-1.0, 0.5]) box(0.03, 0.12, 0.03, M.black, cx, 0.06, zz, g);
  // frame + canvas
  box(0.04, 1.06, 1.46, M.black, HX - 0.02, 1.62, -0.25, g);
  const art = mesh(new THREE.PlaneGeometry(1.4, 1.0), M.art, HX - 0.041, 1.62, -0.25, g, { cast: false });
  art.rotation.y = -Math.PI / 2;
  // credenza styling
  const lamp = new THREE.LatheGeometry([0, 0.08, 0.1, 0.06, 0.05].map((r, i) => new THREE.Vector2(r, i * 0.06)), 32);
  mesh(lamp, M.ceramic, cx, 0.675, -0.95, g);
  mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.linen, cx, 0.94, -0.95, g);
  box(0.25, 0.05, 0.3, M.book3, cx, 0.7, 0.35, g);
  mesh(new THREE.TorusKnotGeometry(0.06, 0.018, 100, 12), M.brass, cx, 0.8, 0.35, g);
}

// ---------------------------------------------------------------------------
// Sun / sky / ambient
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight('#dfe8f2', '#8a7560', 0);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 0);
sun.position.set(-9, 6.5, 2.5);
sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const windowLight = rectLight(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0, V(-HX + 0.02, (WIN.y0 + WIN.y1) / 2, 0), V(1, 0, 0), V(0, 0, 1));

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
const state = {
  scene: 'evening',
  cove: true,
  edge: true,
  down: true,
  pendant: true,
  accent: true,
  lamp: true,
  temp: 3000,
  bright: 1,
  color: null, // custom RGB overrides colour temperature for the cove/edge LEDs
};

const SCENES = {
  day: { hemi: 1.1, sun: 4.5, win: 3.0, env: 0.35, exposure: 0.72, cove: 0.35, down: 0, pendant: 0, lamp: 0, accent: 0.3, edge: 0.35, sky: 'day', tv: 0, bloom: 0.25,
    toggles: { cove: true, edge: true, down: false, pendant: false, accent: true, lamp: false } },
  evening: { hemi: 0.05, sun: 0, win: 0.35, env: 0.06, exposure: 1.0, cove: 1, down: 1, pendant: 1, lamp: 1, accent: 1, edge: 1, sky: 'evening', tv: 0, bloom: 0.55,
    toggles: { cove: true, edge: true, down: true, pendant: true, accent: true, lamp: true } },
  cinema: { hemi: 0.01, sun: 0, win: 0.05, env: 0.015, exposure: 1.05, cove: 0.45, down: 0.15, pendant: 0, lamp: 0, accent: 0.8, edge: 0.6, sky: 'night', tv: 1, bloom: 0.7,
    toggles: { cove: true, edge: true, down: false, pendant: false, accent: true, lamp: false } },
};

// Kelvin → linear RGB (Tanner Helland approximation)
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

let envIntensity = 0.06;
function applyEnvIntensity() {
  scene.traverse((o) => {
    if (o.isMesh && o.material && 'envMapIntensity' in o.material) {
      o.material.envMapIntensity = o.material === M.brass ? envIntensity * 6 + 0.2 : envIntensity;
    }
  });
}

function applyLighting() {
  const s = SCENES[state.scene];
  const ledCol = state.color ? state.color.clone() : kelvin(state.temp);
  const warm = kelvin(2700);
  const b = state.bright;

  hemi.intensity = s.hemi;
  sun.intensity = s.sun;
  windowLight.intensity = s.win;
  windowLight.color.set(state.scene === 'day' ? '#e6f0ff' : state.scene === 'evening' ? '#ffb38a' : '#6f7fb8');
  skyMat.map = skyTex[s.sky];
  skyMat.color.setScalar(state.scene === 'day' ? 1.15 : 1);
  skyMat.needsUpdate = true;
  scene.background.set(state.scene === 'day' ? '#cfd9e2' : '#121110');
  renderer.toneMappingExposure = s.exposure;
  bloom.strength = s.bloom;
  if (envIntensity !== s.env) {
    envIntensity = s.env;
    applyEnvIntensity();
  }

  // Ceiling cove – the hero of the design
  const coveK = state.cove ? s.cove * b : 0;
  lights.cove.forEach((l) => {
    l.color.copy(ledCol);
    l.intensity = 5.5 * coveK * (l.userData.factor ?? 1);
  });
  LED.cove.color.copy(ledCol).multiplyScalar(state.cove ? 1.5 + 4 * coveK : 0.15);

  // Edge light in the shadow gap
  const edgeK = state.edge ? s.edge * b : 0;
  lights.edge.forEach((l) => {
    l.color.copy(ledCol);
    l.intensity = 7 * edgeK;
  });
  LED.edge.color.copy(ledCol).multiplyScalar(state.edge ? 2 + 10 * edgeK : 0.12);

  // Downlights stay warm white for good colour rendering at task level
  const downK = state.down ? Math.max(s.down, state.scene === 'day' ? 0.4 : 0) : 0;
  lights.down.forEach((l, i) => {
    l.color.copy(warm);
    l.intensity = (i === 6 ? 14 : i < 2 ? 12 : 7) * downK;
  });
  LED.down.color.copy(warm).multiplyScalar(state.down ? 1 + 6 * downK : 0.1);

  const pendK = state.pendant ? Math.max(s.pendant, state.scene === 'day' ? 0.5 : 0) : 0;
  pendantLight.color.copy(warm);
  pendantLight.intensity = 3.2 * pendK;
  LED.pendant.color.copy(warm).multiplyScalar(state.pendant ? 1 + 5 * pendK : 0.2);

  const accK = state.accent ? s.accent : 0;
  lights.accent.forEach((l) => {
    l.color.copy(ledCol);
    l.intensity = 6 * accK;
  });
  LED.accent.color.copy(ledCol).multiplyScalar(state.accent ? 1 + 6 * accK : 0.1);

  const lampK = state.lamp ? Math.max(s.lamp, state.scene === 'day' ? 0.5 : 0) : 0;
  lampLight.intensity = 2.2 * lampK;
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
// Camera views
// ---------------------------------------------------------------------------
const VIEWS = {
  living: { pos: V(2.55, 1.5, 2.3), target: V(-0.4, 1.45, -0.9) },
  ceiling: { pos: V(1.2, 0.9, 1.6), target: V(-1.0, 2.8, -1.0) },
  tvwall: { pos: V(0.0, 1.25, 2.3), target: V(0, 1.35, -2.4) },
  nook: { pos: V(1.2, 1.35, 0.2), target: V(-2.4, 1.1, -0.7) },
  section: { pos: V(0.3, 1.85, 6.6), target: V(0, 1.45, 0) },
};
let tween = null;
function goTo(name) {
  const v = VIEWS[name];
  tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: v.pos, t1: v.target };
}

// Cut away walls that stand between the camera and the room
function updateCutaway() {
  for (const w of Object.values(walls)) {
    const d = camera.position.clone().sub(w.point).dot(w.normal);
    w.group.visible = d > -0.05;
  }
  ceiling.visible = camera.position.y < H + 0.05;
  const p = camera.position;
  sky.visible = Math.abs(p.x) < HX && Math.abs(p.z) < HZ && p.y < H; // only seen through the window
  pendant.visible = ceiling.visible;
}

// ---------------------------------------------------------------------------
// UI wiring
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
    const active = state.color ? c === '#' + state.color.getHexString(THREE.SRGBColorSpace) : c === `k${state.temp}`;
    b.classList.toggle('active', active);
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
    } else {
      state.color = new THREE.Color(c);
    }
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
  a.download = `tiken-living-room-${state.scene}.png`;
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// URL params let you deep-link a scene/view, e.g. ?scene=cinema&view=ceiling
const params = new URLSearchParams(location.search);
applyEnvIntensity();
setScene(SCENES[params.get('scene')] ? params.get('scene') : 'evening');
if (VIEWS[params.get('view')]) {
  camera.position.copy(VIEWS[params.get('view')].pos);
  controls.target.copy(VIEWS[params.get('view')].target);
  controls.update();
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
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
  composer.render();
  if (!still || stillFrames-- > 0) requestAnimationFrame(frame);
}
// ?still=1 renders a couple of frames and stops (used for automated previews)
const still = params.has('still');
let stillFrames = 2;
document.body.classList.add('ready');
frame();
window.__room = { state, setScene, goTo, applyLighting, camera, controls };
