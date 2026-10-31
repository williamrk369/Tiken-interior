// Procedural textures – everything is painted on canvas so the project has
// no external image dependencies and works offline.
import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Small deterministic RNG so the room looks identical on every load.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function toTexture(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function grainStrokes(ctx, x, y, w, h, r, { color = 'rgba(60,35,20,', count = 40, vertical = false } = {}) {
  for (let i = 0; i < count; i++) {
    ctx.strokeStyle = color + (0.04 + r() * 0.1) + ')';
    ctx.lineWidth = 0.6 + r() * 1.6;
    ctx.beginPath();
    const off = r() * (vertical ? w : h);
    const amp = 1 + r() * 4;
    const freq = 0.004 + r() * 0.01;
    const phase = r() * 10;
    const len = vertical ? h : w;
    for (let s = 0; s <= len; s += 8) {
      const d = Math.sin(s * freq + phase) * amp + Math.sin(s * freq * 3.1) * amp * 0.3;
      if (vertical) ctx.lineTo(x + off + d, y + s);
      else ctx.lineTo(x + s, y + off + d);
    }
    ctx.stroke();
  }
}

// Wide-plank European oak, matt oiled.
export function oakFloor() {
  const [c, ctx] = canvas(2048);
  const r = rng(7);
  const rows = 10;
  const ph = c.height / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 900;
    while (x < c.width) {
      const len = 700 + r() * 700;
      const l = 62 + r() * 8;
      const hue = 32 + r() * 6;
      ctx.fillStyle = `hsl(${hue}, ${34 + r() * 8}%, ${l}%)`;
      ctx.fillRect(x, i * ph, len, ph);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, i * ph, len, ph);
      ctx.clip();
      grainStrokes(ctx, x, i * ph, len, ph, r, { color: 'rgba(120,80,45,', count: 26 });
      // occasional knot
      if (r() > 0.75) {
        const kx = x + r() * len, ky = i * ph + r() * ph;
        const g = ctx.createRadialGradient(kx, ky, 1, kx, ky, 14);
        g.addColorStop(0, 'rgba(90,55,30,0.45)');
        g.addColorStop(1, 'rgba(90,55,30,0)');
        ctx.fillStyle = g;
        ctx.fillRect(kx - 20, ky - 20, 40, 40);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(70,45,25,0.35)';
      ctx.fillRect(x, i * ph, 2, ph); // butt joint
      x += len;
    }
    ctx.fillStyle = 'rgba(70,45,25,0.4)';
    ctx.fillRect(0, i * ph, c.width, 2); // long joint
  }
  // 10 planks of 0.2 m → texture covers 2 m
  return toTexture(c, { repeat: [3, 2.5] });
}

// Walnut grain (vertical) for joinery and fluted panel.
export function walnut(seed = 3) {
  const [c, ctx] = canvas(512, 1024);
  const r = rng(seed);
  ctx.fillStyle = '#6a4630';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(${40 + r() * 40},${25 + r() * 20},${15 + r() * 10},${0.08 + r() * 0.12})`;
    ctx.fillRect(r() * c.width, 0, 10 + r() * 60, c.height);
  }
  grainStrokes(ctx, 0, 0, c.width, c.height, r, { color: 'rgba(30,15,8,', count: 120, vertical: true });
  return toTexture(c);
}

// Fine random noise – used as bump for bouclé fabric, plaster and wool.
export function noise(size = 256, seed = 11, contrast = 1) {
  const [c, ctx] = canvas(size);
  const r = rng(seed);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (r() - 0.5) * 255 * contrast;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // bouclé loops
  for (let i = 0; i < size * 1.5; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + r() * 0.25})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(r() * size, r() * size, 1 + r() * 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  return toTexture(c, { srgb: false });
}

// Honed travertine with soft horizontal veining.
export function travertine() {
  const [c, ctx] = canvas(1024);
  const r = rng(21);
  ctx.fillStyle = '#d9cab1';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(${150 + r() * 60},${125 + r() * 50},${95 + r() * 40},${0.05 + r() * 0.12})`;
    const y = r() * c.height;
    ctx.fillRect(0, y, c.width, 2 + r() * 14);
  }
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(160,135,105,${0.1 + r() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(r() * c.width, r() * c.height, 1 + r() * 6, 0.5 + r() * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c);
}

// Hand-tufted wool rug – oatmeal with a tone-on-tone border.
export function rug() {
  const [c, ctx] = canvas(1024, 768);
  const r = rng(5);
  ctx.fillStyle = '#d8ccb8';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 25000; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? '255,250,240' : '150,130,105'},${0.05 + r() * 0.08})`;
    ctx.fillRect(r() * c.width, r() * c.height, 2, 2);
  }
  ctx.strokeStyle = 'rgba(140,110,80,0.55)';
  ctx.lineWidth = 10;
  ctx.strokeRect(50, 50, c.width - 100, c.height - 100);
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 80, c.width - 160, c.height - 160);
  // organic arcs in the field
  ctx.strokeStyle = 'rgba(185,110,70,0.35)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(c.width * (0.25 + i * 0.17), c.height * 0.62, 90 + i * 30, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  return toTexture(c);
}

// Abstract "arches" artwork in the project palette.
export function artwork() {
  const [c, ctx] = canvas(840, 600);
  ctx.fillStyle = '#e9dfcf';
  ctx.fillRect(0, 0, c.width, c.height);
  const arch = (x, w, h, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, c.height);
    ctx.lineTo(x, c.height - h + w / 2);
    ctx.arc(x + w / 2, c.height - h + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, c.height);
    ctx.fill();
  };
  arch(110, 260, 420, '#b5653e');
  arch(300, 230, 330, '#6b6e4e');
  arch(500, 220, 470, '#c9a77c');
  ctx.fillStyle = '#2c2a26';
  ctx.beginPath();
  ctx.arc(640, 150, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c2a26';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 520);
  ctx.bezierCurveTo(300, 420, 520, 600, 780, 470);
  ctx.stroke();
  return toTexture(c);
}

// TV picture shown in cinema mode.
export function tvPicture() {
  const [c, ctx] = canvas(1024, 576);
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, '#1b2a4a');
  g.addColorStop(0.55, '#d77b4a');
  g.addColorStop(0.7, '#f2b36b');
  g.addColorStop(1, '#2a1c1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffd9a0';
  ctx.beginPath();
  ctx.arc(620, 360, 50, 0, Math.PI * 2);
  ctx.fill();
  const ridge = (base, amp, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, c.height);
    for (let x = 0; x <= c.width; x += 16) ctx.lineTo(x, base + Math.sin(x * 0.01) * amp + Math.sin(x * 0.033) * amp * 0.4);
    ctx.lineTo(c.width, c.height);
    ctx.fill();
  };
  ridge(390, 30, '#5a2f2c');
  ridge(440, 22, '#3a2024');
  ridge(500, 14, '#1d1216');
  return toTexture(c);
}

// View outside the window for each lighting scene.
export function skyView(mode) {
  const [c, ctx] = canvas(1024, 768);
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  if (mode === 'day') {
    g.addColorStop(0, '#8fb8de');
    g.addColorStop(0.7, '#dbe9f3');
    g.addColorStop(1, '#eef3ee');
  } else if (mode === 'evening') {
    g.addColorStop(0, '#2b3a63');
    g.addColorStop(0.55, '#b9768a');
    g.addColorStop(0.8, '#f0a36f');
    g.addColorStop(1, '#f7c88f');
  } else {
    g.addColorStop(0, '#05070f');
    g.addColorStop(0.8, '#141a33');
    g.addColorStop(1, '#1f2440');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const r = rng(99);
  if (mode === 'night') {
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.8})`;
      ctx.fillRect(r() * c.width, r() * c.height * 0.6, 1.5, 1.5);
    }
  }
  // distant tree line
  const tree = mode === 'day' ? '#5f7a55' : mode === 'evening' ? '#3b3040' : '#07080d';
  ctx.fillStyle = tree;
  ctx.beginPath();
  ctx.moveTo(0, c.height);
  for (let x = 0; x <= c.width; x += 6) {
    ctx.lineTo(x, c.height * 0.72 - Math.abs(Math.sin(x * 0.05)) * 40 - r() * 18 - Math.sin(x * 0.006) * 30);
  }
  ctx.lineTo(c.width, c.height);
  ctx.fill();
  return toTexture(c);
}
