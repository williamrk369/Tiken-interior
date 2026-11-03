/* Reel Studio – engine.
 *
 * Renders a 1080×1920 (9:16) Instagram reel on a <canvas> in one editing style:
 *   1. one A-roll setup, with ~1.2× punch-ins on key words in place of cuts
 *   2. captions word by word, one font family, only the key word restyled
 *   3. a visual change every 1.5–3 s (B-roll, a card or an infographic)
 *   4. zoom-through / blur / slide / morph transitions, each with a whoosh
 *   5. everything slowly scales or drifts (2–5 %) over a living background
 *   6. a keyword-comment CTA and an animated handle end card
 *
 * A reel is plain data (a "project"): see presets.js and README.md.
 * No build step, no dependencies. Exposes window.ReelStudio.
 */
(function (global) {
  'use strict';

  const W = 1080, H = 1920;
  const FONTS = {
    sans: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    serif: '"Playfair Display", Georgia, "Times New Roman", serif',
    cond: '"Anton", Impact, "Arial Narrow", sans-serif',
  };

  // Five looks, one per reference reel.
  const THEMES = {
    clean: { name: 'Clean green · motion graphics', bg: ['#ffffff', '#f3faf6'], ink: '#0f140f', sub: '#5b665e', accent: '#1f9d55', accentInk: '#ffffff', soft: '#d9f2e3', key: 'serif', bgFx: 'blobs', dark: false },
    saas: { name: 'SaaS gradient · UI animation', bg: ['#d6e6ff', '#ffffff'], ink: '#0e1a33', sub: '#5a6785', accent: '#2f6bff', accentInk: '#ffffff', soft: '#e3edff', key: 'color', bgFx: 'gradient', dark: false },
    bold: { name: 'Bold yellow · A-roll + SFX words', bg: ['#1b1511', '#0c0a08'], ink: '#141414', sub: '#6b6b6b', accent: '#ffd21f', accentLight: '#c99a00', accentInk: '#111111', soft: '#3b3120', key: 'condensed', bgFx: 'none', dark: true },
    dark: { name: 'Dark cinematic · phone frame', bg: ['#0b0c0e', '#171a1f'], ink: '#141414', sub: '#6b6b6b', accent: '#9dff5a', accentLight: '#3f9d12', accentInk: '#0b0b0b', soft: '#1d2a17', key: 'serif', bgFx: 'particles', dark: true },
    doc: { name: 'Documentary · serif story', bg: ['#121110', '#1e1b18'], ink: '#141414', sub: '#6b6b6b', accent: '#f0c27b', accentLight: '#a8741f', accentInk: '#111111', soft: '#2b241c', key: 'serif', bgFx: 'none', dark: true },
  };

  const TRANSITION = { zoom: 0.5, slide: 0.45, blur: 0.5, fade: 0.6, flash: 0.4, morph: 0.6, cut: 0 };

  // ---------------------------------------------------------------- math
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, s, d) => (d <= 0 ? (t >= s ? 1 : 0) : clamp((t - s) / d));
  const easeOut = (k) => 1 - (1 - k) ** 3;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const easeSine = (k) => 0.5 - Math.cos(Math.PI * k) / 2;
  const backOut = (k) => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const hasFilter = (() => { try { return 'filter' in document.createElement('canvas').getContext('2d'); } catch (e) { return false; } })();

  // ---------------------------------------------------------------- 2D helpers
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function roundRectPts(x, y, w, h, r) {
    const pts = [];
    const corner = (cx, cy, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0);
    corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
    pts.push(pts[0]);
    return pts;
  }
  // stroke a polyline up to fraction k of its length; returns the tip and direction
  function strokePartial(ctx, pts, k) {
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let left = total * clamp(k);
    let tip = pts[0], dir = [1, 0];
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const l = seg[i - 1], f = Math.min(1, left / (l || 1));
      tip = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      dir = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
      ctx.lineTo(tip[0], tip[1]);
      left -= l;
    }
    ctx.stroke();
    return { tip, dir };
  }
  function bezierPts(p0, p1, p2, p3, n = 60) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }
  function handEllipse(ctx, cx, cy, rx, ry, k, color, lw = 9, seed = 1) {
    if (k <= 0) return;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const steps = 96, turns = 1.1 * k;
    for (let i = 0; i <= steps; i++) {
      const a = -2.3 + (i / steps) * turns * Math.PI * 2;
      const wob = 1 + 0.04 * Math.sin(a * 3 + seed) + 0.035 * (i / steps);
      const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  function hexPath(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
  }
  function shadow(ctx, blur = 40, y = 14, a = 0.22) { ctx.shadowColor = `rgba(10,20,40,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
  function wrapText(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = w; } else cur = test; }
    if (cur) lines.push(cur);
    return lines;
  }
  function pill(ctx, x, y, text, { fill = null, stroke = null, color = '#fff', size = 40, dot = null } = {}) {
    ctx.save();
    ctx.font = `600 ${size}px ${FONTS.sans}`;
    const tw = ctx.measureText(text).width;
    const ph = size * 1.9, dotW = dot ? size * 0.85 : 0, pw = tw + size * 1.4 + dotW;
    const x0 = x - pw / 2, y0 = y - ph / 2;
    if (fill) { shadow(ctx, 22, 6, 0.18); roundRect(ctx, x0, y0, pw, ph, ph / 2); ctx.fillStyle = fill; ctx.fill(); noShadow(ctx); }
    if (stroke) { roundRect(ctx, x0, y0, pw, ph, ph / 2); ctx.strokeStyle = stroke; ctx.lineWidth = 3.5; ctx.stroke(); }
    let tx = x0 + size * 0.7;
    if (dot) { ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(tx + size * 0.28, y, size * 0.3, 0, Math.PI * 2); ctx.fill(); tx += dotW; }
    ctx.fillStyle = color; ctx.textBaseline = 'middle';
    ctx.fillText(text, tx, y + size * 0.04);
    ctx.restore();
    return pw;
  }
  const pillWidth = (ctx, text, size) => { ctx.font = `600 ${size}px ${FONTS.sans}`; return ctx.measureText(text).width + size * 1.4; };

  // "*key*" markup → [{text, key}]
  function parseWords(text) {
    const out = []; let key = false;
    String(text).split('\n').forEach((ln, li) => {
      ln.trim().split(/\s+/).filter(Boolean).forEach((raw, wi) => {
        let w = raw;
        if (w.startsWith('*')) { key = true; w = w.slice(1); }
        let close = false;
        const m = w.match(/\*([.,!?:;"'”’)]*)$/);
        if (m) { close = true; w = w.slice(0, m.index) + m[1]; }
        out.push({ text: w, key, br: li > 0 && wi === 0 });
        if (close) key = false;
      });
    });
    return out;
  }
  function keyFont(style, size) {
    if (style === 'condensed') return { font: `400 ${size * 1.9}px ${FONTS.cond}`, size: size * 1.9, upper: true };
    if (style === 'color') return { font: `800 ${size * 1.25}px ${FONTS.sans}`, size: size * 1.25 };
    return { font: `italic 500 ${size * 1.7}px ${FONTS.serif}`, size: size * 1.7 };
  }
  // one line of mixed text: plain sans + key words in the theme's key style
  function richLine(ctx, text, x, y, size, color, T, align = 'left', keyScale = 1.3) {
    const kf = (s) => (T.key === 'condensed' ? `400 ${s * 1.1}px ${FONTS.cond}` : T.key === 'color' ? `800 ${s * 0.95}px ${FONTS.sans}` : `italic 500 ${s}px ${FONTS.serif}`);
    const segs = parseWords(text).map((w) => ({
      text: w.key && T.key === 'condensed' ? w.text.toUpperCase() : w.text,
      font: w.key ? kf(size * keyScale) : `600 ${size}px ${FONTS.sans}`,
      key: w.key,
    }));
    ctx.font = `600 ${size}px ${FONTS.sans}`;
    const sp = ctx.measureText(' ').width;
    let total = sp * Math.max(0, segs.length - 1);
    for (const s of segs) { ctx.font = s.font; s.w = ctx.measureText(s.text).width; total += s.w; }
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    ctx.textBaseline = 'alphabetic';
    for (const s of segs) { ctx.font = s.font; ctx.fillStyle = s.key ? T.accent : color; ctx.fillText(s.text, cx, y + size * 0.36); cx += s.w + sp; }
    return total;
  }

  // ---------------------------------------------------------------- placeholders (used until media is uploaded)
  function drawArollPlaceholder(ctx, x, y, w, h, t, T) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#1a1613'); g.addColorStop(0.6, '#0f0d0b'); g.addColorStop(1, '#070605');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // bokeh practicals
    for (let i = 0; i < 14; i++) {
      const bx = x + w * hash(i * 3.1) + Math.sin(t * 0.25 + i) * 10, by = y + h * (0.12 + 0.45 * hash(i * 7.7));
      const r = w * (0.03 + 0.06 * hash(i * 1.9));
      const rg = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      const warm = i % 3 ? '255,190,120' : '255,226,180';
      rg.addColorStop(0, `rgba(${warm},${0.35 + 0.2 * hash(i)})`); rg.addColorStop(1, `rgba(${warm},0)`);
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    }
    // reflective table
    const tg = ctx.createLinearGradient(0, y + h * 0.8, 0, y + h);
    tg.addColorStop(0, 'rgba(60,45,32,.9)'); tg.addColorStop(1, 'rgba(15,11,8,1)');
    ctx.fillStyle = tg; ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
    // speaker silhouette with warm rim light
    const cx = x + w / 2 + Math.sin(t * 0.6) * w * 0.004, hy = y + h * 0.43, hr = w * 0.12;
    ctx.save();
    ctx.fillStyle = '#060504';
    ctx.shadowColor = 'rgba(255,170,100,.35)'; ctx.shadowBlur = w * 0.04;
    ctx.beginPath(); ctx.ellipse(cx, hy, hr * 0.86, hr, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.42, hy + hr * 0.8);
    ctx.lineTo(cx - hr * 0.4, hy + hr * 1.25);
    ctx.bezierCurveTo(cx - w * 0.36, hy + hr * 1.5, cx - w * 0.4, y + h * 0.7, cx - w * 0.42, y + h * 0.82);
    ctx.lineTo(cx + w * 0.42, y + h * 0.82);
    ctx.bezierCurveTo(cx + w * 0.4, y + h * 0.7, cx + w * 0.36, hy + hr * 1.5, cx + hr * 0.4, hy + hr * 1.25);
    ctx.lineTo(cx + hr * 0.42, hy + hr * 0.8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawPhotoPlaceholder(ctx, x, y, w, h, seed) {
    const hue = Math.floor(hash(seed + 1) * 360);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `hsl(${hue},45%,72%)`); g.addColorStop(1, `hsl(${(hue + 40) % 360},40%,45%)`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,245,220,.85)';
    ctx.beginPath(); ctx.arc(x + w * (0.25 + 0.5 * hash(seed + 2)), y + h * 0.32, Math.min(w, h) * 0.09, 0, Math.PI * 2); ctx.fill();
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = `hsla(${(hue + 180) % 360},25%,${22 + j * 12}%,.85)`;
      ctx.beginPath(); ctx.moveTo(x, y + h);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x + (w * i) / 8, y + h * (0.55 + 0.12 * j + 0.12 * Math.sin(i * 1.3 + seed * 2 + j)));
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    }
  }

  // ---------------------------------------------------------------- sound
  class Sfx {
    constructor() { this.ctx = null; this.bus = null; this.enabled = true; }
    ensure() {
      if (this.ctx) return this.ctx;
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.dest = this.ctx.createMediaStreamDestination();
      this.master.connect(this.dest);
      const n = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      return this.ctx;
    }
    // use an OfflineAudioContext (for rendering the sound to a file)
    attach(ctx) {
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      const n = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.bus = ctx.createGain();
      this.bus.connect(this.master);
      return this;
    }
    start() {
      if (!this.ensure()) return false;
      this.stop();
      this.ctx.resume();
      this.bus = this.ctx.createGain();
      this.bus.gain.value = this.enabled ? 1 : 0;
      this.bus.connect(this.master);
      return true;
    }
    stop() {
      if (!this.bus) return;
      const b = this.bus; this.bus = null;
      try { b.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02); } catch (e) { /* ignore */ }
      setTimeout(() => b.disconnect(), 150);
    }
    setEnabled(on) { this.enabled = on; if (this.bus) this.bus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.03); }
    env(g, at, peak, a, d) { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + d); }
    noiseSrc(at, dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(at, Math.random()); s.stop(at + dur + 0.05); return s; }
    whoosh(at, dur = 0.55, up = true) {
      const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(up ? 250 : 2600, at);
      f.frequency.exponentialRampToValueAtTime(up ? 3200 : 300, at + dur * 0.75);
      this.env(g, at, 0.5, dur * 0.55, dur * 0.45);
      this.noiseSrc(at, dur).connect(f).connect(g).connect(this.bus);
    }
    pop(at, pitch = 1) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(900 * pitch, at); o.frequency.exponentialRampToValueAtTime(320 * pitch, at + 0.09);
      this.env(g, at, 0.3, 0.005, 0.12);
      o.connect(g).connect(this.bus); o.start(at); o.stop(at + 0.16);
    }
    tick(at) {
      const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'highpass'; f.frequency.value = 3000;
      this.env(g, at, 0.35, 0.002, 0.03);
      this.noiseSrc(at, 0.05).connect(f).connect(g).connect(this.bus);
    }
    click(at) { this.tick(at); this.pop(at + 0.01, 0.6); }
    riser(at, dur = 1.3) {
      const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(300, at); f.frequency.exponentialRampToValueAtTime(5000, at + dur);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.32, at + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.08);
      this.noiseSrc(at, dur + 0.1).connect(f).connect(g).connect(this.bus);
    }
    chime(at) {
      [523.25, 783.99, 1046.5].forEach((hz, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = hz;
        this.env(g, at + i * 0.07, 0.15, 0.01, 1.4);
        o.connect(g).connect(this.bus); o.start(at + i * 0.07); o.stop(at + i * 0.07 + 1.5);
      });
    }
    // lo-fi beat: kick, snare, hats and bass on top of the pad (bpm ~86)
    beat(at, from, total, bpm = 86) {
      const c = this.ctx, spb = 60 / bpm, roots = [65.41, 55, 43.65, 49];   // C · A · F · G
      const barLen = spb * 4, bars = Math.ceil(total / barLen);
      const hit = (t, fn) => { if (t >= from - 0.001 && t < total) fn(at + (t - from)); };
      for (let b = 0; b < bars; b++) {
        const bar0 = b * barLen, root = roots[Math.floor((b / bars) * 4) % 4];
        for (let q = 0; q < 8; q++) {
          const t = bar0 + q * spb / 2;
          // hats on every 8th, slightly swung
          hit(t + (q % 2 ? spb * 0.06 : 0), (w) => {
            const f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 7000;
            this.env(g, w, q % 2 ? 0.035 : 0.055, 0.002, 0.05); this.noiseSrc(w, 0.07).connect(f).connect(g).connect(this.bus);
          });
        }
        [0, 2.5].forEach((beatPos) => hit(bar0 + beatPos * spb, (w) => {     // kick
          const o = c.createOscillator(), g = c.createGain();
          o.frequency.setValueAtTime(130, w); o.frequency.exponentialRampToValueAtTime(42, w + 0.12);
          this.env(g, w, 0.55, 0.004, 0.28); o.connect(g).connect(this.bus); o.start(w); o.stop(w + 0.35);
        }));
        [1, 3].forEach((beatPos) => hit(bar0 + beatPos * spb, (w) => {       // soft snare
          const f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
          this.env(g, w, 0.2, 0.003, 0.16); this.noiseSrc(w, 0.2).connect(f).connect(g).connect(this.bus);
        }));
        [0, 1.5, 2.5].forEach((beatPos, k) => hit(bar0 + beatPos * spb, (w) => { // bass
          const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
          o.type = 'triangle'; o.frequency.value = k === 1 ? root * 1.5 : root; lp.type = 'lowpass'; lp.frequency.value = 400;
          this.env(g, w, 0.22, 0.01, spb * 0.9); o.connect(lp).connect(g).connect(this.bus); o.start(w); o.stop(w + spb + 0.1);
        }));
      }
    }
    // soft four-chord pad (Cmaj7 · Am7 · Fmaj7 · G6) under the whole reel
    pad(at, from, total) {
      const chords = [[130.81, 196, 246.94, 329.63], [110, 164.81, 196, 261.63], [87.31, 174.61, 220, 329.63], [98, 146.83, 196, 246.94]];
      const len = total / 4, lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(this.bus);
      chords.forEach((ch, i) => {
        const s = i * len, e = s + len;
        if (e <= from) return;
        const t0 = at + Math.max(0, s - from), t1 = at + (e - from);
        ch.forEach((hz, j) => [-4, 4].forEach((det) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = j === 0 ? 'triangle' : 'sine'; o.frequency.value = hz; o.detune.value = det;
          g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.02, t0 + 0.6);
          g.gain.setValueAtTime(0.02, Math.max(t0 + 0.6, t1 - 0.5)); g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.3);
          o.connect(g).connect(lp); o.start(t0); o.stop(t1 + 0.35);
        }));
      });
    }
  }

  // ---------------------------------------------------------------- elements
  // Each element: draw(ctx, el, lt, R, sc) and optional sfx(el) → [[time, kind, arg]]
  const pops = (at, n, gap) => Array.from({ length: n }, (_, i) => [at + i * gap, 'pop', 1 + i * 0.07]);
  const ELEMENTS = {
    // pill tags popping in one after another, filled and outlined
    pills: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, dark = R.isDark(sc), items = el.items || [], size = el.size || 44, gap = el.gap ?? 0.28, at = el.at ?? 0.4;
        const ws = items.map((s) => pillWidth(ctx, s, size)), sp = 22, ph = size * 1.9, maxW = el.maxW || 960;
        const rows = []; let row = [], rw = 0;
        items.forEach((s, i) => { if (row.length && rw + sp + ws[i] > maxW) { rows.push({ row, rw }); row = []; rw = 0; } rw += (row.length ? sp : 0) + ws[i]; row.push(i); });
        if (row.length) rows.push({ row, rw });
        const y0 = (el.y ?? 1250) - ((rows.length - 1) * (ph + sp)) / 2;
        rows.forEach((r, ri) => {
          let x = (el.x ?? W / 2) - r.rw / 2;
          r.row.forEach((i) => {
            const k = prog(lt, at + i * gap, 0.35);
            if (k > 0) {
              ctx.save(); ctx.translate(x + ws[i] / 2, y0 + ri * (ph + sp));
              const s = backOut(k); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 3);
              const filled = el.style === 'filled' || (el.style !== 'outline' && i % 2 === 0);
              pill(ctx, 0, 0, items[i], filled
                ? { size, fill: T.accent, color: T.accentInk }
                : { size, fill: dark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.75)', stroke: dark ? '#fff' : T.accent, color: dark ? '#fff' : T.ink });
              ctx.restore();
            }
            x += ws[i] + sp;
          });
        });
      },
      sfx: (el) => pops(el.at ?? 0.4, (el.items || []).length, el.gap ?? 0.28),
    },

    // ring timer counting (e.g. 10 → 0)
    ring: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, at = el.at ?? 0.3, dur = el.dur ?? 3, x = el.x ?? W / 2, y = el.y ?? 960, r = el.r ?? 160;
        const k0 = prog(lt, at, 0.35); if (k0 <= 0) return;
        const k = prog(lt, at + 0.2, dur), from = el.from ?? 10, to = el.to ?? 0;
        ctx.save(); ctx.translate(x, y); const s = backOut(k0); ctx.scale(s, s); ctx.globalAlpha = clamp(k0 * 3);
        ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
        ctx.strokeStyle = R.isDark(sc) ? 'rgba(255,255,255,.18)' : T.soft;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        const sweep = (from > to ? 1 - k : k) * Math.PI * 2;
        ctx.strokeStyle = T.accent;
        if (sweep > 0.01) { ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweep); ctx.stroke(); }
        ctx.fillStyle = R.isDark(sc) ? '#fff' : T.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `800 ${r * 0.85}px ${FONTS.sans}`;
        ctx.fillText(String(Math.round(lerp(from, to, k))) + (el.suffix || ''), 0, r * 0.04);
        if (el.label) { ctx.font = `600 40px ${FONTS.sans}`; ctx.fillStyle = R.isDark(sc) ? 'rgba(255,255,255,.7)' : T.sub; ctx.fillText(el.label, 0, r + 80); }
        ctx.restore();
      },
      sfx(el) {
        const at = el.at ?? 0.3, dur = el.dur ?? 3, n = Math.min(30, Math.abs((el.from ?? 10) - (el.to ?? 0)));
        return [[at, 'pop', 1], ...Array.from({ length: n }, (_, i) => [at + 0.2 + (dur * (i + 1)) / n, 'tick'])];
      },
    },

    // hexagon icons connected by self-drawing lines
    hexflow: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, items = el.items || [], at = el.at ?? 0.3, gap = el.gap ?? 0.5;
        const x = el.x ?? 230, y0 = el.y ?? 760, step = el.step ?? 250, r = el.r ?? 72, dark = R.isDark(sc);
        items.forEach((label, i) => {
          const y = y0 + i * step, t0 = at + i * gap;
          if (i > 0) {
            const kl = easeOut(prog(lt, t0 - 0.28, 0.3));
            if (kl > 0) { ctx.strokeStyle = T.accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - step + r); ctx.lineTo(x, lerp(y - step + r, y - r, kl)); ctx.stroke(); }
          }
          const k = prog(lt, t0, 0.4); if (k <= 0) return;
          ctx.save(); ctx.translate(x, y); const s = backOut(k); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 3);
          shadow(ctx, 24, 8, 0.2); hexPath(ctx, r); ctx.fillStyle = T.accent; ctx.fill(); noShadow(ctx);
          ctx.strokeStyle = T.accentInk; ctx.fillStyle = T.accentInk; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const icon = i % 3;
          if (icon === 0) { ctx.beginPath(); ctx.arc(0, -12, 13, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, 30, 24, Math.PI, 0); ctx.fill(); }
          else if (icon === 1) { ctx.beginPath(); ctx.moveTo(-26, -18); ctx.lineTo(-6, 2); ctx.lineTo(6, -8); ctx.lineTo(26, 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(10, 18); ctx.lineTo(26, 18); ctx.lineTo(26, 2); ctx.stroke(); }
          else { ctx.beginPath(); ctx.moveTo(-18, -18); ctx.lineTo(18, 18); ctx.moveTo(18, -18); ctx.lineTo(-18, 18); ctx.stroke(); }
          ctx.restore();
          const kt = easeOut(prog(lt, t0 + 0.15, 0.4));
          if (kt > 0) { ctx.save(); ctx.globalAlpha = kt; richLine(ctx, label, x + r + 46 + (1 - kt) * 40, y, el.size || 52, dark ? '#fff' : T.ink, T); ctx.restore(); }
        });
      },
      sfx: (el) => pops(el.at ?? 0.3, (el.items || []).length, el.gap ?? 0.5),
    },

    // glass checklist card that tilts in with perspective, items write on
    checklist: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, items = el.items || [], at = el.at ?? 0.3, gap = el.gap ?? 0.5;
        const k = prog(lt, at, 0.65); if (k <= 0) return;
        const e = easeOut(k), cw = el.w || 860, rowH = 104, ch = (el.title ? 170 : 70) + items.length * rowH + 30;
        const dark = el.dark ?? R.isDark(sc);
        ctx.save(); ctx.translate(el.x ?? W / 2, el.y ?? 980);
        ctx.rotate(lerp(-0.22, -0.035, e));
        ctx.transform(1, 0, lerp(-0.5, -0.05, e), lerp(0.3, 1, e), 0, 0);
        ctx.globalAlpha = clamp(k * 2);
        shadow(ctx, 60, 24, dark ? 0.5 : 0.22);
        roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 44);
        ctx.fillStyle = dark ? 'rgba(38,40,46,.82)' : 'rgba(255,255,255,.93)'; ctx.fill(); noShadow(ctx);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.06)'; ctx.lineWidth = 2; ctx.stroke();
        const ink = dark ? '#fff' : T.ink;
        let y = -ch / 2 + 90;
        if (el.title) { richLine(ctx, el.title, -cw / 2 + 60, y, 50, ink, T); y += 100; } else y += 10;
        items.forEach((it, i) => {
          const ki = prog(lt, at + 0.55 + i * gap, 0.5);
          const bx = -cw / 2 + 60;
          ctx.lineWidth = 5; ctx.strokeStyle = ki > 0 ? T.accent : (dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.2)');
          roundRect(ctx, bx, y - 26, 52, 52, 14); ctx.stroke();
          if (ki > 0) {
            ctx.fillStyle = T.accent; roundRect(ctx, bx, y - 26, 52, 52, 14); ctx.globalAlpha *= 1; ctx.fill();
            ctx.strokeStyle = T.accentInk; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            strokePartial(ctx, [[bx + 13, y + 1], [bx + 23, y + 12], [bx + 40, y - 11]], easeOut(prog(lt, at + 0.55 + i * gap, 0.3)));
            ctx.save();
            ctx.beginPath(); ctx.rect(bx + 80, y - 60, (cw - 160) * easeOut(ki), 120); ctx.clip();
            richLine(ctx, it, bx + 84, y, 44, ink, T, 'left', 1.2);
            ctx.restore();
          }
          y += rowH;
        });
        ctx.restore();
      },
      sfx(el) { const at = el.at ?? 0.3; return [[at, 'whoosh', 0.45], ...(el.items || []).map((_, i) => [at + 0.55 + i * (el.gap ?? 0.5), 'click'])]; },
    },

    // neon line graph drawing up
    graph: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, pts = el.points || [0.08, 0.16, 0.12, 0.3, 0.26, 0.48, 0.44, 0.7, 0.95];
        const x0 = el.x ?? 120, y0 = el.y ?? 1080, w = el.w ?? 840, h = el.h ?? 460, at = el.at ?? 0.3, dur = el.dur ?? 1.8;
        const k0 = prog(lt, at, 0.3); if (k0 <= 0) return;
        const dark = R.isDark(sc);
        ctx.save(); ctx.globalAlpha = k0;
        ctx.strokeStyle = dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'; ctx.lineWidth = 2;
        for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + (h * i) / 4); ctx.lineTo(x0 + w, y0 + (h * i) / 4); ctx.stroke(); }
        const P = pts.map((p, i) => [x0 + (w * i) / (pts.length - 1), y0 + h - h * p]);
        const fine = []; for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < 10; j++) { const f = j / 10, e = easeSine(f); fine.push([lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], e)]); }
        fine.push(P[P.length - 1]);
        const kd = easeOut(prog(lt, at + 0.2, dur));
        // area fill under the drawn part
        const n = Math.max(1, Math.floor(kd * (fine.length - 1)));
        const ag = ctx.createLinearGradient(0, y0, 0, y0 + h); ag.addColorStop(0, T.accent + '55'); ag.addColorStop(1, T.accent + '00');
        ctx.beginPath(); ctx.moveTo(fine[0][0], y0 + h); for (let i = 0; i <= n; i++) ctx.lineTo(fine[i][0], fine[i][1]); ctx.lineTo(fine[n][0], y0 + h); ctx.closePath(); ctx.fillStyle = ag; ctx.fill();
        ctx.strokeStyle = T.accent; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = T.accent; ctx.shadowBlur = 30;
        const { tip } = strokePartial(ctx, fine, kd);
        noShadow(ctx);
        const pulse = 1 + 0.25 * Math.sin(lt * 6);
        ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(tip[0], tip[1], 14, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = T.accent; ctx.lineWidth = 3; ctx.globalAlpha = k0 * 0.5; ctx.beginPath(); ctx.arc(tip[0], tip[1], 28 * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = k0;
        if (el.label) richLine(ctx, el.label, x0, y0 - 60, 46, dark ? '#fff' : T.ink, T);
        ctx.restore();
      },
      sfx: (el) => [[el.at ?? 0.3, 'riser', (el.dur ?? 1.8) * 0.8]],
    },

    // timeline slider with a moving marker (years, ages…)
    timeline: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, at = el.at ?? 0.3, dur = el.dur ?? 2, x0 = el.x ?? 110, y = el.y ?? 1480, w = el.w ?? 860;
        const k0 = prog(lt, at, 0.35); if (k0 <= 0) return;
        const from = el.from ?? 2000, to = el.to ?? 2024, k = ease(prog(lt, at + 0.3, dur));
        const start = el.start ?? from, end = el.end ?? to;
        const dark = R.isDark(sc), ink = dark ? '#fff' : T.ink;
        ctx.save(); ctx.globalAlpha = easeOut(k0); ctx.translate(0, (1 - easeOut(k0)) * 40);
        ctx.lineCap = 'round'; ctx.lineWidth = 10;
        ctx.strokeStyle = dark ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
        const val = lerp(start, end, k), mx = x0 + (w * (val - from)) / (to - from || 1);
        ctx.strokeStyle = T.accent; ctx.beginPath(); ctx.moveTo(x0 + (w * (start - from)) / (to - from || 1), y); ctx.lineTo(mx, y); ctx.stroke();
        const ticks = el.ticks || [from, to];
        ctx.font = `600 34px ${FONTS.sans}`; ctx.fillStyle = dark ? 'rgba(255,255,255,.7)' : T.sub; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (const tk of ticks) { const tx = x0 + (w * (tk - from)) / (to - from || 1); ctx.fillRect(tx - 2, y + 14, 4, 18); ctx.fillText(String(tk), tx, y + 42); }
        ctx.fillStyle = T.accent; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(mx, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const label = (el.prefix || '') + Math.round(val) + (el.suffix || '');
        ctx.font = `700 46px ${FONTS.sans}`; const bw = ctx.measureText(label).width + 50;
        shadow(ctx, 20, 6, 0.25); roundRect(ctx, mx - bw / 2, y - 120, bw, 72, 20); ctx.fillStyle = dark ? '#fff' : T.ink; ctx.fill(); noShadow(ctx);
        ctx.beginPath(); ctx.moveTo(mx - 14, y - 49); ctx.lineTo(mx, y - 34); ctx.lineTo(mx + 14, y - 49); ctx.fill();
        ctx.fillStyle = dark ? '#111' : '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(label, mx, y - 83);
        if (el.label) { ctx.textAlign = 'left'; richLine(ctx, el.label, x0, y - 210, 46, ink, T); }
        ctx.restore();
      },
      sfx: (el) => [[el.at ?? 0.3, 'whoosh', 0.5]],
    },

    // huge condensed word on an animated audio-waveform bar with a red playhead
    waveform: {
      draw(ctx, el, lt, R) {
        const T = R.T, words = el.words || [{ text: 'WHOOSH', at: 0.3 }], y = el.y ?? 1080, bw = el.w ?? 840, bh = el.h ?? 150, big = el.size || 230;
        const kb = prog(lt, words[0].at, 0.35); if (kb <= 0) return;
        let cur = 0; words.forEach((w, i) => { if (lt >= w.at) cur = i; });
        const segEnd = words[cur + 1] ? words[cur + 1].at : words[cur].at + (el.hold ?? 2);
        const frac = prog(lt, words[cur].at, segEnd - words[cur].at);
        ctx.save(); ctx.globalAlpha = clamp(kb * 3);
        const bx = W / 2 - bw / 2;
        shadow(ctx, 30, 10, 0.4); roundRect(ctx, bx, y, bw, bh, 30); ctx.fillStyle = 'rgba(12,12,12,.72)'; ctx.fill(); noShadow(ctx);
        const n = 54, px = bx + 30 + (bw - 60) * frac;
        for (let i = 0; i < n; i++) {
          const x = bx + 30 + ((bw - 60) * (i + 0.5)) / n;
          const amp = 0.18 + 0.82 * Math.abs(Math.sin(i * 0.62 + hash(i + cur * 9) * 6 + lt * (x < px ? 0 : 5)) * Math.sin(i * 0.17 + 1 + cur));
          const hh = (bh - 46) * amp;
          ctx.fillStyle = x < px ? T.accent : 'rgba(255,255,255,.45)';
          roundRect(ctx, x - 4, y + bh / 2 - hh / 2, 8, hh, 4); ctx.fill();
        }
        ctx.fillStyle = '#ff3b30'; ctx.fillRect(px - 3, y - 16, 6, bh + 32);
        ctx.beginPath(); ctx.arc(px, y - 16, 12, 0, Math.PI * 2); ctx.fill();
        // word swap: previous word squashes out letter by letter, new one pops in
        const drawWord = (text, kIn, kOut) => {
          ctx.font = `400 ${big}px ${FONTS.cond}`;
          const letters = text.toUpperCase().split(''), widths = letters.map((l) => ctx.measureText(l).width);
          let x = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
          letters.forEach((l, j) => {
            const ki = prog(kIn, 0.15 + j * 0.035, 0.25), ko = kOut == null ? 0 : prog(kOut, j * 0.03, 0.18);
            const sy = backOut(ki) * (1 - ease(ko)), sx = 1 + 0.4 * ko;
            if (sy > 0.01) {
              ctx.save(); ctx.translate(x + widths[j] / 2, y - 40); ctx.scale(sx, sy);
              ctx.fillStyle = T.accent; ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
              ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(l, 0, 0);
              ctx.restore();
            }
            x += widths[j];
          });
        };
        const since = lt - words[cur].at;
        if (cur > 0 && since < 0.35) drawWord(words[cur - 1].text, 9, since);
        drawWord(words[cur].text, since, null);
        if (el.small) {
          ctx.font = `600 58px ${FONTS.sans}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14;
          ctx.fillText(el.small, W / 2, y - 40 - big * 0.92);
        }
        ctx.restore();
      },
      sfx: (el) => (el.words || []).map((w) => [w.at, 'whoosh', 0.4]),
    },

    // chat mockup: bubbles slide up while the frame slowly zooms out
    chat: {
      draw(ctx, el, lt, R) {
        const T = R.T, msgs = el.messages || [], at = el.at ?? 0.3, gap = el.gap ?? 0.75;
        const k0 = prog(lt, at - 0.3, 0.5); if (k0 <= 0) return;
        const dark = !!el.dark, cw = el.w || 780, ch = el.h || 1060, cx = el.x ?? W / 2, cy = el.y ?? 980;
        ctx.save(); ctx.translate(cx, cy);
        const z = lerp(1.08, 1, easeOut(prog(lt, at, (el.zoomDur ?? 4))));
        ctx.scale(z * backOut(k0) , z * backOut(k0)); ctx.globalAlpha = clamp(k0 * 2);
        shadow(ctx, 70, 26, 0.25); roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 64); ctx.fillStyle = dark ? '#16181d' : '#ffffff'; ctx.fill(); noShadow(ctx);
        ctx.save(); roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 64); ctx.clip();
        // header
        ctx.fillStyle = dark ? '#1f2228' : '#f5f7fb'; ctx.fillRect(-cw / 2, -ch / 2, cw, 150);
        ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(-cw / 2 + 80, -ch / 2 + 78, 38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = T.accentInk; ctx.font = `700 34px ${FONTS.sans}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((el.title || 'AI')[0].toUpperCase(), -cw / 2 + 80, -ch / 2 + 80);
        ctx.textAlign = 'left'; ctx.fillStyle = dark ? '#fff' : T.ink; ctx.font = `700 38px ${FONTS.sans}`;
        ctx.fillText(el.title || 'Assistant', -cw / 2 + 140, -ch / 2 + 66);
        ctx.font = `500 26px ${FONTS.sans}`; ctx.fillStyle = '#22c55e'; ctx.fillText('● online', -cw / 2 + 140, -ch / 2 + 104);
        // bubbles, stacked from the bottom
        ctx.font = `500 36px ${FONTS.sans}`;
        const maxB = cw * 0.66, lay = msgs.map((m, i) => { const lines = wrapText(ctx, m.text, maxB - 60); const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 60; return { m, lines, bw, bh: lines.length * 46 + 40, k: easeOut(prog(lt, at + i * gap, 0.4)) }; });
        let by = ch / 2 - 150;
        for (let i = lay.length - 1; i >= 0; i--) {
          const b = lay[i]; if (b.k <= 0) continue;
          by -= (b.bh + 22) * b.k;
          const me = b.m.me, bx = me ? cw / 2 - 40 - b.bw : -cw / 2 + 40;
          ctx.save(); ctx.globalAlpha = b.k; ctx.translate(0, (1 - b.k) * 40);
          roundRect(ctx, bx, by, b.bw, b.bh, 30);
          ctx.fillStyle = me ? T.accent : (dark ? '#2a2e36' : '#eef1f6'); ctx.fill();
          ctx.fillStyle = me ? T.accentInk : (dark ? '#fff' : T.ink); ctx.textBaseline = 'top';
          b.lines.forEach((l, j) => ctx.fillText(l, bx + 30, by + 22 + j * 46));
          ctx.restore();
        }
        // input bar
        roundRect(ctx, -cw / 2 + 30, ch / 2 - 120, cw - 60, 86, 43); ctx.fillStyle = dark ? '#23262d' : '#f1f3f8'; ctx.fill();
        ctx.fillStyle = dark ? 'rgba(255,255,255,.4)' : '#9aa3b5'; ctx.font = `500 32px ${FONTS.sans}`; ctx.textBaseline = 'middle';
        ctx.fillText(el.placeholder || 'Message…', -cw / 2 + 70, ch / 2 - 76);
        ctx.restore(); ctx.restore();
      },
      sfx: (el) => (el.messages || []).map((_, i) => [(el.at ?? 0.3) + i * (el.gap ?? 0.75), 'pop', i % 2 ? 1.2 : 0.9]),
    },

    // flowchart: cards linked by self-drawing, then animated-dash connectors
    flow: {
      draw(ctx, el, lt, R) {
        const T = R.T, nodes = el.nodes || [], at = el.at ?? 0.3, gap = el.gap ?? 0.5;
        const y0 = el.y ?? 640, step = el.step ?? 250, nw = el.w || 470, nh = 132;
        const pos = nodes.map((_, i) => [W / 2 + (i % 2 ? 1 : -1) * (el.spread ?? 170), y0 + i * step]);
        nodes.forEach((n, i) => {
          if (i === 0) return;
          const k = prog(lt, at + i * gap - 0.3, 0.35); if (k <= 0) return;
          const a = [pos[i - 1][0], pos[i - 1][1] + nh / 2], b = [pos[i][0], pos[i][1] - nh / 2];
          const pts = bezierPts(a, [a[0], a[1] + step * 0.45], [b[0], b[1] - step * 0.45], b, 40);
          ctx.save(); ctx.strokeStyle = T.accent; ctx.lineWidth = 6; ctx.lineCap = 'round';
          if (k >= 1) { ctx.setLineDash([16, 14]); ctx.lineDashOffset = -lt * 60; }
          strokePartial(ctx, pts, easeOut(k));
          ctx.restore();
        });
        nodes.forEach((n, i) => {
          const k = prog(lt, at + i * gap, 0.4); if (k <= 0) return;
          ctx.save(); ctx.translate(pos[i][0], pos[i][1]); const s = backOut(k); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 3);
          shadow(ctx, 40, 14, 0.18); roundRect(ctx, -nw / 2, -nh / 2, nw, nh, 30); ctx.fillStyle = '#fff'; ctx.fill(); noShadow(ctx);
          ctx.fillStyle = i === nodes.length - 1 || i === 0 ? T.accent : T.soft;
          roundRect(ctx, -nw / 2 + 24, -36, 72, 72, 20); ctx.fill();
          ctx.fillStyle = i === nodes.length - 1 || i === 0 ? T.accentInk : T.accent; ctx.font = `800 36px ${FONTS.sans}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), -nw / 2 + 60, 2);
          ctx.textAlign = 'left'; ctx.fillStyle = T.ink; ctx.font = `700 40px ${FONTS.sans}`;
          ctx.fillText(typeof n === 'string' ? n : n.text, -nw / 2 + 118, 2);
          ctx.restore();
        });
      },
      sfx: (el) => pops(el.at ?? 0.3, (el.nodes || []).length, el.gap ?? 0.5),
    },

    // floating photo cards on a tilt – carousel sliding past, or a dropped stack
    cards: {
      draw(ctx, el, lt, R) {
        const items = el.items || [], at = el.at ?? 0.3, gap = el.gap ?? 0.9, mode = el.mode || 'carousel';
        const cw = el.w || 600, chh = el.h || 760, y = el.y ?? 960;
        let pos = -1; items.forEach((_, i) => { pos += ease(prog(lt, at + i * gap, 0.55)); });
        const order = items.map((_, i) => i);
        if (mode === 'carousel') order.sort((a, b) => Math.abs(b - pos) - Math.abs(a - pos));
        for (const i of order) {
          const it = items[i];
          let x, yy, rot, s, alpha;
          if (mode === 'carousel') {
            const d = i - pos; if (Math.abs(d) > 1.6) continue;
            x = W / 2 + d * 640; yy = y + Math.abs(d) * 40; rot = d * -0.1 + (i % 2 ? 0.035 : -0.035); s = 1 - 0.12 * Math.min(1, Math.abs(d)); alpha = 1;
          } else {
            const k = prog(lt, at + i * gap, 0.5); if (k <= 0) continue;
            const e = easeOut(k); x = W / 2 + (i - (items.length - 1) / 2) * 40; yy = lerp(y - 900, y + i * 24, e);
            rot = lerp(i % 2 ? 0.35 : -0.35, (i % 2 ? 1 : -1) * (0.04 + 0.03 * hash(i)), e); s = 1; alpha = clamp(k * 3);
          }
          ctx.save(); ctx.translate(x, yy); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = alpha;
          shadow(ctx, 60, 24, 0.28); ctx.fillStyle = '#fff'; ctx.fillRect(-cw / 2, -chh / 2, cw, chh); noShadow(ctx);
          const pad = 26;
          R.drawMedia(ctx, it.media, -cw / 2 + pad, -chh / 2 + pad, cw - pad * 2, chh - pad * (it.caption ? 5 : 2), { grade: it.grade || el.grade, seed: i + 3 });
          if (it.caption) { ctx.fillStyle = '#222'; ctx.font = `italic 500 40px ${FONTS.serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.caption, 0, chh / 2 - pad * 1.6); }
          ctx.restore();
          if (it.label && (mode !== 'carousel' || Math.abs(i - pos) < 0.35)) {
            const k = mode === 'carousel' ? 1 - Math.abs(i - pos) / 0.35 : easeOut(prog(lt, at + i * gap + 0.4, 0.3));
            ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
            pill(ctx, W / 2, y + chh / 2 + 90, it.label, { fill: R.T.accent, color: R.T.accentInk, size: 46 });
            ctx.restore();
          }
        }
      },
      sfx: (el) => (el.items || []).map((_, i) => [(el.at ?? 0.3) + i * (el.gap ?? 0.9), (el.mode || 'carousel') === 'carousel' ? 'whoosh' : 'pop', 0.4]),
    },

    // single floating photo card
    photo: {
      draw(ctx, el, lt, R) {
        const k = prog(lt, el.at ?? 0.2, 0.5); if (k <= 0) return;
        const e = easeOut(k), w = el.w || 760, h = el.h || 900;
        ctx.save(); ctx.translate(el.x ?? W / 2, (el.y ?? 900) + (1 - e) * 120); ctx.rotate((el.tilt ?? -0.04) * e); ctx.globalAlpha = clamp(k * 2);
        shadow(ctx, 60, 24, 0.3); ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -h / 2, w, h); noShadow(ctx);
        R.drawMedia(ctx, el.media, -w / 2 + 24, -h / 2 + 24, w - 48, h - 48, { grade: el.grade, seed: 11, focusY: el.focusY, t: lt });
        ctx.restore();
      },
      sfx: (el) => [[el.at ?? 0.2, 'whoosh', 0.4]],
    },

    // media inside a circle mask with sparkles
    circleMask: {
      draw(ctx, el, lt, R) {
        const T = R.T, k = prog(lt, el.at ?? 0.2, 0.6); if (k <= 0) return;
        const x = el.x ?? W / 2, y = el.y ?? 800, r = (el.r ?? 330) * backOut(k);
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2); ctx.clip();
        R.drawMedia(ctx, el.media ?? 'aroll', x - r * 1.25, y - r * 1.25, r * 2.5, r * 2.5, { grade: el.grade, seed: 5, t: lt, focusY: el.focusY ?? 0.42 });
        ctx.restore();
        ctx.strokeStyle = T.accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(k)); ctx.stroke();
        for (let i = 0; i < 9; i++) {
          const a = hash(i) * Math.PI * 2, d = (el.r ?? 330) * (1.2 + 0.25 * hash(i + 4)), tw = 0.5 + 0.5 * Math.sin(lt * 3 + i * 1.7);
          star(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, (10 + 16 * hash(i + 8)) * tw * easeOut(k), i % 3 ? '#fff' : T.accent);
        }
      },
      sfx: (el) => [[el.at ?? 0.2, 'whoosh', 0.5]],
    },

    // map-style route with a navigation arrow travelling to a 3D-ish gold trophy
    route: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, at = el.at ?? 0.3, dur = el.dur ?? 2.4, dark = R.isDark(sc);
        const k0 = prog(lt, at, 0.4); if (k0 <= 0) return;
        ctx.save(); ctx.globalAlpha = k0;
        ctx.strokeStyle = dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'; ctx.lineWidth = 3;
        for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(0, 500 + i * 110 + Math.sin(i) * 30); ctx.lineTo(W, 460 + i * 110 + Math.cos(i) * 40); ctx.stroke(); }
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 140 - 40, 420); ctx.lineTo(i * 140 + 60, 1750); ctx.stroke(); }
        const pts = [...bezierPts([150, 1580], [150, 1250], [820, 1350], [700, 1050], 40), ...bezierPts([700, 1050], [580, 760], [330, 900], [540, 700], 40).slice(1)];
        ctx.strokeStyle = dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.12)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.setLineDash([2, 26]); strokePartial(ctx, pts, 1); ctx.setLineDash([]);
        const kp = ease(prog(lt, at + 0.3, dur));
        ctx.strokeStyle = T.accent; ctx.shadowColor = T.accent; ctx.shadowBlur = 24; ctx.lineWidth = 14;
        const { tip, dir } = strokePartial(ctx, pts, kp); noShadow(ctx);
        ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(150, 1580, 18, 0, Math.PI * 2); ctx.fill();
        if (kp < 0.97) {
          ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(Math.atan2(dir[1], dir[0]) + Math.PI / 2);
          ctx.fillStyle = '#fff'; shadow(ctx, 16, 4, 0.4);
          ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(26, 26); ctx.lineTo(0, 12); ctx.lineTo(-26, 26); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        const kt = prog(lt, at + 0.3 + dur * 0.9, 0.5);
        if (kt > 0) {
          ctx.save(); ctx.translate(540, 560); const s = backOut(kt); ctx.scale(s, s); trophy(ctx); ctx.restore();
          ctx.globalAlpha = k0 * clamp(kt * 2);
          ctx.textAlign = 'center'; ctx.fillStyle = dark ? '#fff' : T.ink;
          if (el.number != null) { ctx.font = `800 120px ${FONTS.sans}`; ctx.textBaseline = 'middle'; ctx.fillText(String(Math.round(+el.number * easeOut(kt))), 540, 330); }
          if (el.label) richLine(ctx, el.label, 540, 1720, 58, dark ? '#fff' : T.ink, T, 'center');
        }
        ctx.restore();
      },
      sfx: (el) => [[el.at ?? 0.3, 'riser', (el.dur ?? 2.4)], [(el.at ?? 0.3) + 0.3 + (el.dur ?? 2.4) * 0.9, 'chime']],
    },

    // hand-drawn circle that draws itself around something
    circle: {
      draw(ctx, el, lt, R) {
        handEllipse(ctx, el.x ?? W / 2, el.y ?? 900, el.rx ?? 260, el.ry ?? 180, easeOut(prog(lt, el.at ?? 0.5, el.dur ?? 0.7)), el.color || R.T.accent, el.width || 10, el.seed || 1);
      },
      sfx: (el) => [[el.at ?? 0.5, 'whoosh', 0.6]],
    },

    // corner brackets framing a region
    brackets: {
      draw(ctx, el, lt, R) {
        const k = easeOut(prog(lt, el.at ?? 0.3, 0.45)); if (k <= 0) return;
        const x = el.x ?? W / 2, y = el.y ?? 960, w = el.w ?? 800, h = el.h ?? 500, L = el.len ?? 80, off = (1 - k) * 60;
        ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = el.color || R.T.accent; ctx.lineWidth = 10; ctx.lineCap = 'round';
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const cx = x + sx * (w / 2 + off), cy = y + sy * (h / 2 + off);
          ctx.beginPath(); ctx.moveTo(cx, cy - sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * L, cy); ctx.stroke();
        }
        ctx.restore();
      },
    },

    // arrow-tagged bullet lines
    bullets: {
      draw(ctx, el, lt, R, sc) {
        const T = R.T, items = el.items || [], at = el.at ?? 0.3, gap = el.gap ?? 0.45, x = el.x ?? 130, y0 = el.y ?? 1300, size = el.size || 50, dark = R.isDark(sc);
        items.forEach((it, i) => {
          const k = easeOut(prog(lt, at + i * gap, 0.4)); if (k <= 0) return;
          const y = y0 + i * size * 1.9;
          ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * -60, 0);
          if (dark) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14; }
          ctx.strokeStyle = T.accent; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 46, y); ctx.moveTo(x + 30, y - 16); ctx.lineTo(x + 46, y); ctx.lineTo(x + 30, y + 16); ctx.stroke();
          richLine(ctx, it, x + 76, y, size, dark ? '#fff' : T.ink, T, 'left', 1.25);
          ctx.restore();
        });
      },
      sfx: (el) => (el.items || []).map((_, i) => [(el.at ?? 0.3) + i * (el.gap ?? 0.45), 'tick']),
    },

    // payment page mockup: price, methods, button press → paid
    payment: {
      draw(ctx, el, lt, R) {
        const T = R.T, at = el.at ?? 0.3, k = prog(lt, at, 0.5); if (k <= 0) return;
        const cw = 800, ch = 700, e = backOut(k);
        ctx.save(); ctx.translate(el.x ?? W / 2, el.y ?? 1020); ctx.scale(e, e); ctx.globalAlpha = clamp(k * 3);
        shadow(ctx, 70, 26, 0.22); roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 56); ctx.fillStyle = '#fff'; ctx.fill(); noShadow(ctx);
        const x0 = -cw / 2 + 60; let y = -ch / 2 + 90;
        ctx.fillStyle = T.soft; roundRect(ctx, x0, y - 40, 110, 110, 26); ctx.fill();
        ctx.fillStyle = T.accent; roundRect(ctx, x0 + 30, y - 10, 50, 50, 12); ctx.fill();
        ctx.fillStyle = T.ink; ctx.textBaseline = 'middle'; ctx.font = `700 42px ${FONTS.sans}`; ctx.fillText(el.title || 'Starter kit', x0 + 140, y);
        ctx.font = `500 30px ${FONTS.sans}`; ctx.fillStyle = T.sub; ctx.fillText(el.subtitle || 'Instant download', x0 + 140, y + 46);
        y += 180;
        ctx.font = `800 120px ${FONTS.sans}`; ctx.fillStyle = T.ink; ctx.fillText(el.amount || '$77', x0, y);
        y += 120;
        const methods = el.methods || ['UPI', 'Visa', 'Apple Pay']; let mx = x0;
        methods.forEach((m, i) => {
          ctx.font = `600 34px ${FONTS.sans}`; const mw = ctx.measureText(m).width + 60;
          const kk = backOut(prog(lt, at + 0.4 + i * 0.15, 0.3));
          ctx.save(); ctx.translate(mx + mw / 2, y); ctx.scale(kk, kk);
          roundRect(ctx, -mw / 2, -36, mw, 72, 20); ctx.fillStyle = i === 0 ? T.soft : '#f4f5f8'; ctx.fill();
          if (i === 0) { ctx.strokeStyle = T.accent; ctx.lineWidth = 4; ctx.stroke(); }
          ctx.fillStyle = T.ink; ctx.textAlign = 'center'; ctx.fillText(m, 0, 2); ctx.restore();
          mx += mw + 18;
        });
        y += 140;
        const press = prog(lt, at + 1.5, 0.15), paid = prog(lt, at + 1.7, 0.4);
        const bs = 1 - 0.05 * Math.sin(Math.PI * press);
        ctx.save(); ctx.translate(0, y); ctx.scale(bs, bs);
        roundRect(ctx, -cw / 2 + 60, -50, cw - 120, 100, 50); ctx.fillStyle = paid > 0 ? '#22c55e' : T.accent; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `700 42px ${FONTS.sans}`;
        ctx.fillText(paid > 0 ? 'Paid ✓' : `Pay ${el.amount || '$77'}`, 0, 2);
        ctx.restore(); ctx.restore();
      },
      sfx: (el) => [[el.at ?? 0.3, 'whoosh', 0.4], [(el.at ?? 0.3) + 1.5, 'click'], [(el.at ?? 0.3) + 1.7, 'chime']],
    },

    // fake comment bar CTA: avatar, "Comment KEYWORD", send button
    comment: {
      draw(ctx, el, lt, R) {
        const at = el.at ?? 0.3, k = easeOut(prog(lt, at, 0.5)); if (k <= 0) return;
        R.drawCommentBar(ctx, el.y ?? 1480, k, lt - at, el.keyword || 'LINK', el.text || 'Comment', el.avatar || 'B', el.light ?? !R.isDark(null));
        if (el.sub) { ctx.save(); ctx.globalAlpha = easeOut(prog(lt, at + 0.9, 0.4)); ctx.textAlign = 'center'; ctx.font = `500 38px ${FONTS.sans}`; ctx.fillStyle = el.subColor || '#fff'; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 10; ctx.fillText(el.sub, W / 2, (el.y ?? 1480) + 140); ctx.restore(); }
      },
      sfx: (el) => [[el.at ?? 0.3, 'whoosh', 0.4], [(el.at ?? 0.3) + 1.2, 'pop', 1.3]],
    },

    // a free text line (small labels, numbers…)
    text: {
      draw(ctx, el, lt, R, sc) {
        const k = easeOut(prog(lt, el.at ?? 0.2, 0.35)); if (k <= 0) return;
        ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 24);
        if (R.isDark(sc)) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 14; }
        richLine(ctx, el.text || '', el.x ?? W / 2, el.y ?? 900, el.size || 48, el.color || (R.isDark(sc) ? '#fff' : R.T.ink), R.T, el.align || 'center', el.keyScale || 1.3);
        ctx.restore();
      },
    },
  };
  function star(ctx, x, y, r, color) {
    if (r <= 0.5) return;
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(Math.cos(a - Math.PI / 2) * rr, Math.sin(a - Math.PI / 2) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function trophy(ctx) {
    const g = ctx.createLinearGradient(-120, -150, 120, 150);
    g.addColorStop(0, '#fff2b0'); g.addColorStop(0.35, '#f5c542'); g.addColorStop(0.7, '#c98a1b'); g.addColorStop(1, '#7a4f0c');
    ctx.shadowColor = 'rgba(245,197,66,.55)'; ctx.shadowBlur = 50;
    ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(-120, -70, 50, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(120, -70, 50, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-130, -150); ctx.lineTo(130, -150); ctx.bezierCurveTo(130, 10, 60, 50, 22, 60); ctx.lineTo(22, 110); ctx.lineTo(-22, 110); ctx.lineTo(-22, 60); ctx.bezierCurveTo(-60, 50, -130, 10, -130, -150); ctx.fill();
    roundRect(ctx, -80, 110, 160, 34, 8); ctx.fill(); roundRect(ctx, -110, 140, 220, 50, 12); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-60, -90, 18, 50, 0.2, 0, Math.PI * 2); ctx.fill();
  }

  // ---------------------------------------------------------------- the reel
  class Reel {
    constructor(canvas) {
      this.out = canvas; canvas.width = W; canvas.height = H;
      this.octx = canvas.getContext('2d');
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      this.layer = mk(); this.lctx = this.layer.getContext('2d');
      this.snap = mk(); this.sctx = this.snap.getContext('2d');
      this.comp = mk(); this.cctx = this.comp.getContext('2d');
      this.endBase = mk(); this.ectx = this.endBase.getContext('2d');
      this.t = 0; this.playing = false; this.media = []; this.arollEl = null; this.musicEl = null;
      this.sfx = new Sfx(); this.onTime = null; this.onEnd = null; this.recorder = null;
      this.isDark = (sc) => {
        if (!sc) return this.T.dark;
        if (sc.dark != null) return sc.dark;
        const bg = sc.bg ?? 'theme';
        if (bg === 'aroll' || typeof bg === 'number' || (bg && typeof bg === 'object')) return true;
        if (bg === 'white') return false;
        if (typeof bg === 'string' && bg[0] === '#') { const n = parseInt(bg.slice(1, 7), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 140; }
        return this.T.dark;
      };
      this.drawMedia = this.drawMedia.bind(this);
      this.drawCommentBar = this.drawCommentBar.bind(this);
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (this.P) this.tick(dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // ---------------------------------------------------------- project
    load(project) {
      const P = JSON.parse(JSON.stringify(project));
      this.P = P;
      this.T = Object.assign({}, THEMES[P.theme] || THEMES.clean, P.colors || {});
      const scenes = (P.scenes || []).map((s) => Object.assign({ dur: 3, elements: [] }, s));
      if (P.end !== false) scenes.push({ isEnd: true, dur: (P.end && P.end.dur) || 4.4, end: P.end || {}, elements: [] });
      let acc = 0;
      scenes.forEach((s) => { s.start = acc; acc += s.dur; });
      this.scenes = scenes; this.duration = acc;
      this.relayout();
      this.buildSfx();
      this.invalidate();
      this.t = clamp(this.t, 0, this.duration - 0.001);
      if (this.playing) this.startAudio();
    }
    relayout() {
      if (!this.scenes) return;
      for (const s of this.scenes) if (s.caption) s.layout = this.layoutCaption(s.caption, s);
      this.invalidate();
    }
    invalidate() { this.snapFor = -1; this.endBaseOk = false; }
    setMedia(i, file) {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const el = isVideo ? Object.assign(document.createElement('video'), { src: url, muted: true, loop: true, playsInline: true, preload: 'auto' }) : Object.assign(new Image(), { src: url });
      this.media[i] = { el, isVideo, name: file.name };
      if (isVideo) el.play().catch(() => {});
      this.invalidate();
    }
    setAroll(file) { this.arollEl = this.mediaEl(file, 'arollSrc'); this.invalidate(); }
    setMusic(file) { this.musicEl = this.mediaEl(file, 'musicSrc', 0.35); }
    mediaEl(file, key, vol = 1) {
      const el = Object.assign(document.createElement('video'), { src: URL.createObjectURL(file), playsInline: true, preload: 'auto' });
      if (this.sfx.ensure()) {
        const src = this.sfx.ctx.createMediaElementSource(el), g = this.sfx.ctx.createGain();
        g.gain.value = vol; src.connect(g).connect(this.sfx.master); this[key] = src;
      }
      el.addEventListener('loadeddata', () => { this.syncMedia(true); this.invalidate(); });
      return el;
    }

    // ---------------------------------------------------------- captions
    layoutCaption(cap, sc) {
      cap = Object.assign({}, this.P.captionStyle || {}, cap);
      const ctx = this.octx, T = this.T, size = cap.size || 64, rate = cap.rate ?? 0.26, maxW = cap.maxW || 920;
      const words = parseWords(cap.text || ''); const style = cap.key || T.key;
      const lines = []; let line = { words: [], w: 0 };
      ctx.font = `600 ${size}px ${FONTS.sans}`; const sp = ctx.measureText(' ').width;
      words.forEach((w, i) => {
        if (w.key) { const f = keyFont(style, size); w.font = f.font; w.size = f.size; if (f.upper) w.text = w.text.toUpperCase(); }
        else { w.font = `${cap.weight || 600} ${size}px ${FONTS.sans}`; w.size = size; }
        ctx.font = w.font; w.w = ctx.measureText(w.text).width;
        w.appear = cap.times && cap.times[i] != null ? cap.times[i] : (cap.at ?? 0.2) + i * rate;
      });
      words.forEach((w, i) => {
        // keep a key phrase on one line: measure it from its first word
        let need = w.w;
        if (w.key && (i === 0 || !words[i - 1].key)) for (let j = i + 1; j < words.length && words[j].key; j++) need += sp + words[j].w;
        if (line.words.length && (w.br || line.w + sp + need > maxW)) { lines.push(line); line = { words: [], w: 0 }; }
        w.x = line.words.length ? line.w + sp : 0; line.w = w.x + w.w; line.words.push(w);
      });
      if (line.words.length) lines.push(line);
      for (const l of lines) l.h = Math.max(...l.words.map((w) => (w.key ? w.size * 1.02 : size * 1.32)));
      const keys = words.filter((w) => w.key);
      return { lines, words, total: lines.reduce((a, l) => a + l.h, 0), firstKey: keys.length ? keys[0].appear : null, end: words.length ? words[words.length - 1].appear : 0, y: cap.y ?? (this.isDark(sc) && sc.bg !== undefined && sc.bg !== 'theme' ? 1240 : 900) };
    }
    drawCaption(ctx, sc, lt) {
      const L = sc.layout, cap = sc.caption, T = this.T, dark = this.isDark(sc);
      const overFootage = dark && (sc.bg === 'aroll' || typeof sc.bg === 'number' || (sc.bg && typeof sc.bg === 'object'));
      const ink = cap.color || (dark ? '#fff' : T.ink), fx = cap.fx || 'pop';
      const exit = cap.hold ? 0 : prog(lt, sc.dur - 0.3, 0.28) * (cap.exit === false ? 0 : 1);
      const breathe = 1 + 0.03 * clamp((lt - (cap.at ?? 0)) / sc.dur);
      let y = L.y - L.total / 2;
      ctx.save();
      ctx.translate(W / 2, L.y); ctx.scale(breathe, breathe); ctx.translate(-W / 2, -L.y);
      for (const line of L.lines) {
        const x0 = (W - line.w) / 2, base = y + line.h * 0.8;
        for (const w of line.words) {
          const a = easeOut(prog(lt, w.appear, 0.22)) * (1 - exit);
          if (a <= 0.001) continue;
          const cx = x0 + w.x + w.w / 2;
          if (w.key && fx === 'fall') { this.drawFallingWord(ctx, w, cx, base, lt, T, cap, 1 - exit); continue; }
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(cx, base + (1 - a) * 26 - exit * 30);
          if (w.key) { const s = lerp(1.25, 1, backOut(prog(lt, w.appear, 0.4))); ctx.scale(s, s); }
          if (hasFilter && a < 0.98) ctx.filter = `blur(${((1 - a) * 8).toFixed(1)}px)`;
          if (w.key && fx === 'highlight') { const hk = easeOut(prog(lt, w.appear + 0.2, 0.35)); ctx.fillStyle = T.accent + '55'; ctx.fillRect(-w.w / 2 - 10, -w.size * 0.55, (w.w + 20) * hk, w.size * 0.6); }
          ctx.font = w.font;
          if (overFootage) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3; }
          ctx.fillStyle = w.key ? (cap.keyColor || (dark ? T.accent : T.accentLight || T.accent)) : ink;
          ctx.fillText(w.text, -w.w / 2, 0);
          ctx.restore();
          if (w.key && fx === 'circle') handEllipse(ctx, cx, base - w.size * 0.28, w.w / 2 + 34, w.size * 0.56, easeOut(prog(lt, w.appear + 0.35, 0.65)) * (1 - exit), cap.circleColor || T.accent, 9, 2);
          if (w.key && fx === 'underline') {
            const uk = easeOut(prog(lt, w.appear + 0.3, 0.4)); if (uk > 0) {
              ctx.save(); ctx.strokeStyle = T.accent; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - exit;
              const pts = Array.from({ length: 20 }, (_, i) => [cx - w.w / 2 + (w.w * i) / 19, base + 22 + Math.sin(i * 0.9) * 4]);
              strokePartial(ctx, pts, uk); ctx.restore();
            }
          }
        }
        y += line.h;
      }
      ctx.restore();
    }
    // key word letters fall in, then particles (e.g. "$") scatter
    drawFallingWord(ctx, w, cx, base, lt, T, cap, alpha) {
      ctx.save(); ctx.font = w.font; ctx.fillStyle = cap.keyColor || T.accentLight || T.accent; ctx.globalAlpha = alpha;
      const letters = w.text.split(''); let x = cx - w.w / 2;
      letters.forEach((l, j) => {
        const lw = ctx.measureText(l).width, k = prog(lt, w.appear + j * 0.06, 0.45);
        if (k > 0) {
          const b = k < 0.7 ? (k / 0.7) ** 2 : 1 - Math.sin(((k - 0.7) / 0.3) * Math.PI) * 0.08;
          ctx.save(); ctx.translate(x + lw / 2, base - (1 - b) * 420); ctx.rotate((1 - b) * (j % 2 ? 0.5 : -0.5));
          ctx.fillText(l, -lw / 2, 0); ctx.restore();
        }
        x += lw;
      });
      const t0 = w.appear + letters.length * 0.06 + 0.3, pt = lt - t0;
      if (pt > 0 && pt < 1.4) {
        ctx.font = `700 60px ${FONTS.sans}`; ctx.textAlign = 'center';
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI / 2 + (hash(i) - 0.5) * Math.PI * 1.6, v = 500 + 500 * hash(i + 3);
          const px = cx + Math.cos(a) * v * pt, py = base - w.size * 0.3 + Math.sin(a) * v * pt + 900 * pt * pt;
          ctx.globalAlpha = alpha * (1 - pt / 1.4);
          ctx.save(); ctx.translate(px, py); ctx.rotate(pt * (hash(i + 7) - 0.5) * 6); ctx.fillText(cap.particle || '$', 0, 0); ctx.restore();
        }
      }
      ctx.restore();
    }

    // ---------------------------------------------------------- media
    mediaSource(ref) {
      if (ref === 'aroll') return this.arollFrame || (this.arollEl && this.arollEl.readyState >= 2 ? this.arollEl : null);
      const m = this.media[ref];
      if (!m) return null;
      if (m.isVideo) return m.el.readyState >= 2 ? m.el : null;
      return m.el.complete && m.el.naturalWidth ? m.el : null;
    }
    drawMedia(ctx, ref, x, y, w, h, o = {}) {
      const src = this.mediaSource(ref);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      if (hasFilter && o.grade === 'bw') ctx.filter = 'grayscale(1) contrast(1.12)';
      if (hasFilter && o.grade === 'sepia') ctx.filter = 'sepia(.85) contrast(1.05) brightness(.95)';
      if (src) {
        const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
        const s = Math.max(w / sw, h / sh) * (o.scale || 1), dw = sw * s, dh = sh * s;
        const fx = o.focusX ?? 0.5, fy = o.focusY ?? 0.5;
        ctx.drawImage(src, x + (w - dw) * fx + (o.panX || 0), y + (h - dh) * fy + (o.panY || 0), dw, dh);
      } else if (ref === 'aroll') {
        const s = o.scale || 1, fy = o.focusY ?? 0.45;
        ctx.translate(x + w / 2, y + h * fy); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h * fy));
        drawArollPlaceholder(ctx, x, y, w, h, o.t || this.t, this.T);
      } else {
        const s = o.scale || 1;
        ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
        drawPhotoPlaceholder(ctx, x, y, w, h, (typeof ref === 'number' ? ref : 0) * 3 + (o.seed || 0));
      }
      ctx.restore();
    }

    drawBg(ctx, sc, lt) {
      const T = this.T, bg = sc.bg ?? 'theme', p = clamp(lt / sc.dur);
      const isMedia = bg === 'aroll' || typeof bg === 'number' || (bg && typeof bg === 'object');
      if (isMedia) {
        const ref = bg === 'aroll' ? 'aroll' : typeof bg === 'number' ? bg : bg.media;
        const grade = bg && bg.grade;
        let s = (sc.frame === 'tight' ? 1.35 : 1) * (1 + 0.04 * p);
        const punchAt = sc.punch === true ? (sc.layout && sc.layout.firstKey) : sc.punch;
        if (punchAt != null && punchAt !== false) s *= 1 + (sc.punchAmount ?? 0.2) * ease(prog(lt, punchAt, 0.3));
        ctx.save();
        const dim = sc.dim ? easeOut(prog(lt, sc.dimAt ?? 0.4, 0.5)) * sc.dim : 0;
        if (hasFilter && dim > 0) ctx.filter = `blur(${(dim * 14).toFixed(1)}px) brightness(${1 - dim * 0.45})`;
        this.drawMedia(ctx, ref, 0, 0, W, H, { scale: s, grade, focusY: sc.focusY ?? (sc.frame === 'tight' ? 0.38 : 0.5), panX: ref !== 'aroll' ? lerp(-20, 20, p) : 0, t: this.t, seed: 7 });
        ctx.restore();
        if (!hasFilter && dim > 0) { ctx.fillStyle = `rgba(0,0,0,${dim * 0.45})`; ctx.fillRect(0, 0, W, H); }
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        return;
      }
      if (bg === 'white') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); return; }
      if (typeof bg === 'string' && bg[0] === '#') { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); return; }
      const t = this.t;
      const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
      g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const fx = sc.bgFx || T.bgFx;
      if (fx === 'blobs') {
        ctx.fillStyle = T.soft;
        [[880, 300, 360], [110, 1560, 430], [1000, 1700, 190]].forEach(([x, y, r], i) => {
          ctx.beginPath(); ctx.arc(x + Math.sin(t * 0.3 + i * 2) * 50, y + Math.cos(t * 0.25 + i) * 40, r * (1 + 0.04 * Math.sin(t * 0.5 + i)), 0, Math.PI * 2); ctx.fill();
        });
      } else if (fx === 'gradient') {
        const rx = W * (0.5 + 0.3 * Math.sin(t * 0.2)), ry = H * (0.3 + 0.15 * Math.cos(t * 0.17));
        const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, 900);
        rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      } else if (fx === 'particles') {
        for (let i = 0; i < 46; i++) {
          const x = W * hash(i), y = (H * hash(i + 50) - t * (14 + 30 * hash(i + 9))) % H;
          ctx.globalAlpha = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + i));
          ctx.fillStyle = i % 7 ? '#ffffff' : T.accent;
          ctx.beginPath(); ctx.arc(x, y < 0 ? y + H : y, 2 + 3 * hash(i + 20), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---------------------------------------------------------- scene render
    renderScene(i, lt, ctx) {
      const sc = this.scenes[i];
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.filter = 'none';
      this.drawBg(ctx, sc, lt);
      const p = clamp(lt / sc.dur);
      for (const el of sc.elements) {
        const E = ELEMENTS[el.type]; if (!E) continue;
        // slow constant scale + drift on every element
        const cx = el.x ?? W / 2, cy = el.y ?? H / 2, s = 1 + (el.breathe ?? 0.03) * p;
        ctx.save(); ctx.translate(cx, cy - 12 * p); ctx.scale(s, s); ctx.translate(-cx, -cy);
        E.draw(ctx, el, lt, this, sc);
        ctx.restore();
      }
      if (sc.layout) this.drawCaption(ctx, sc, lt);
      if (sc.flash != null) { const f = 1 - Math.abs(lt - sc.flash) / 0.18; if (f > 0) { ctx.fillStyle = `rgba(255,252,245,${0.9 * f})`; ctx.fillRect(0, 0, W, H); } }
      ctx.restore();
    }
    sceneAt(t) { for (let i = 0; i < this.scenes.length; i++) if (t < this.scenes[i].start + this.scenes[i].dur) return i; return this.scenes.length - 1; }

    zoomBlur(ctx, src, scale, amount, fx = W / 2, fy = H / 2) {
      const n = amount > 0.02 ? 7 : 1;
      ctx.save();
      for (let i = 0; i < n; i++) {
        const s = scale * (1 + amount * (i / Math.max(1, n - 1)));
        ctx.globalAlpha = i === 0 ? 1 : 0.3;
        ctx.setTransform(s, 0, 0, s, fx - fx * s, fy - fy * s);
        ctx.drawImage(src, 0, 0);
      }
      ctx.restore();
    }
    flash(ctx, a) { if (a > 0.001) { ctx.fillStyle = `rgba(255,252,245,${a})`; ctx.fillRect(0, 0, W, H); } }

    // the scene (with any transition) → this.comp
    composeScene(i, lt) {
      const sc = this.scenes[i], next = this.scenes[i + 1], c = this.cctx;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none';
      if (next && !next.isEnd && next.in === 'zoom' && lt > sc.dur - TRANSITION.zoom / 2) {
        this.renderScene(i, lt, this.lctx);
        const k = ease(prog(lt, sc.dur - TRANSITION.zoom / 2, TRANSITION.zoom / 2)), f = next.focus || {};
        c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        this.zoomBlur(c, this.layer, 1 + 1.1 * k, 0.5 * k, f.x ?? W / 2, f.y ?? H / 2);
        this.flash(c, k * 0.3);
        return;
      }
      this.renderScene(i, lt, this.lctx);
      const type = sc.in, dur = TRANSITION[type] || 0;
      if (!type || i === 0 || !dur) { c.drawImage(this.layer, 0, 0); return; }
      if (type === 'zoom') {
        const k = prog(lt, 0, dur / 2);
        if (k >= 1) { c.drawImage(this.layer, 0, 0); return; }
        const e = 1 - ease(k), f = sc.focus || {};
        c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        this.zoomBlur(c, this.layer, 1 + 1.1 * e, 0.5 * e, f.x ?? W / 2, f.y ?? H / 2);
        this.flash(c, e * 0.3);
        return;
      }
      const k = prog(lt, 0, dur);
      if (k >= 1) { c.drawImage(this.layer, 0, 0); return; }
      if (this.snapFor !== i) { const prev = this.scenes[i - 1]; this.renderScene(i - 1, prev.dur - 0.001, this.sctx); this.renderScene(i, lt, this.lctx); this.snapFor = i; }
      const e = ease(k);
      if (type === 'slide') {
        c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        const off = -W * e, blur = Math.sin(Math.PI * k) * 70;
        for (let j = 0; j < 5; j++) { const o = (j / 4 - 0.5) * blur; c.globalAlpha = j === 2 ? 1 : 0.3; c.drawImage(this.snap, off + o, 0); c.drawImage(this.layer, off + W + o, 0); }
        c.globalAlpha = 1;
      } else if (type === 'morph') {
        c.save();
        if (hasFilter) c.filter = `blur(${(e * 24).toFixed(1)}px)`;
        const s1 = 1 + 0.18 * e; c.setTransform(s1, 0, 0, s1, W / 2 - (W / 2) * s1, H / 2 - (H / 2) * s1); c.drawImage(this.snap, 0, 0);
        c.restore(); c.save();
        if (hasFilter) c.filter = `blur(${((1 - e) * 24).toFixed(1)}px)`;
        const s2 = 0.92 + 0.08 * e; c.globalAlpha = e; c.setTransform(s2, 0, 0, s2, W / 2 - (W / 2) * s2, H / 2 - (H / 2) * s2); c.drawImage(this.layer, 0, 0);
        c.restore();
      } else {
        c.save();
        if (hasFilter && type === 'blur') c.filter = `blur(${(Math.sin(Math.PI * k) * 30).toFixed(1)}px)`;
        c.drawImage(this.snap, 0, 0); c.globalAlpha = type === 'flash' ? (k > 0.5 ? 1 : 0) : e; c.drawImage(this.layer, 0, 0);
        c.restore();
        if (type === 'flash') this.flash(c, Math.sin(Math.PI * k));
      }
    }

    // final frame: scene → phone frame (optional) → watermark; end card on top
    composeFinal(t, ctx) {
      const i = this.sceneAt(t), sc = this.scenes[i], lt = t - sc.start;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
      if (sc.isEnd) {
        if (!this.endBaseOk) { this.endBaseOk = true; if (i > 0) this.composeFinal(sc.start - 0.0005, this.ectx); else { this.ectx.fillStyle = '#222'; this.ectx.fillRect(0, 0, W, H); } }
        if (sc.end.over === 'aroll') { this.drawMedia(ctx, 'aroll', 0, 0, W, H, { t, scale: 1.04 }); } else ctx.drawImage(this.endBase, 0, 0);
        this.drawEnd(ctx, lt, sc);
        return;
      }
      this.composeScene(i, lt);
      if (this.P.phone) this.wrapPhone(ctx, t); else ctx.drawImage(this.comp, 0, 0);
      if (this.P.watermark !== false && this.handle()) this.drawWatermark(ctx, sc);
    }

    wrapPhone(ctx, t) {
      const ph = this.P.phone || {}, m = 50, top = 230, bottom = 170, x = m, y = top, w = W - 2 * m, h = H - top - bottom;
      ctx.fillStyle = '#060606'; ctx.fillRect(0, 0, W, H);
      ctx.save(); roundRect(ctx, x, y, w, h, 60); ctx.clip();
      const s = Math.max(w / W, h / H); ctx.drawImage(this.comp, x + (w - W * s) / 2, y + (h - H * s) / 2, W * s, H * s);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 3; roundRect(ctx, x, y, w, h, 60); ctx.stroke();
      // header: avatar, creator name, countdown
      const total = this.scenes.filter((s) => !s.isEnd).reduce((a, s) => a + s.dur, 0);
      ctx.fillStyle = this.T.accent; ctx.beginPath(); ctx.arc(x + 44, 150, 38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.T.accentInk; ctx.font = `800 36px ${FONTS.sans}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const name = ph.name || this.handle().slice(1);
      ctx.fillText(name[0].toUpperCase(), x + 44, 152);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `700 38px ${FONTS.sans}`; ctx.fillText(name, x + 100, 138);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `500 28px ${FONTS.sans}`; ctx.fillText(ph.subtitle || 'Original audio', x + 100, 176);
      const left = Math.max(1, Math.ceil(total - t));
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = `600 40px ${FONTS.sans}`;
      ctx.fillText(`0:${String(left).padStart(2, '0')}`, x + w - 10, 152);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x + 30, y - 22, w - 60, 6);
      ctx.fillStyle = this.T.accent; ctx.fillRect(x + 30, y - 22, (w - 60) * clamp(t / total), 6);
      ctx.textAlign = 'left';
    }
    handle() { const h = String(this.P.handle ?? 'yourhandle').replace(/^@/, '').trim(); return h ? '@' + h : ''; }
    drawWatermark(ctx, sc) {
      const ph = !!this.P.phone, x = ph ? W - 330 : 60, y = ph ? 1830 : 150;
      const light = !ph && sc && !this.isDark(sc);
      ctx.save(); ctx.globalAlpha = light ? 0.6 : 0.78;
      ctx.translate(x, y); ctx.strokeStyle = ctx.fillStyle = light ? this.T.ink : '#fff'; ctx.lineWidth = 3.2;
      if (!light) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; }
      roundRect(ctx, 0, -18, 36, 36, 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(18, 0, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(28, -9, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.font = `600 30px ${FONTS.sans}`; ctx.textBaseline = 'middle'; ctx.fillText(this.handle(), 50, 1);
      ctx.restore();
    }
    drawCommentBar(ctx, y, k, lt, keyword, text, avatar, light) {
      const T = this.T, bw = 920, bh = 136, bx = (W - bw) / 2, by = y - bh / 2 + (1 - k) * 160;
      ctx.save(); ctx.globalAlpha = k;
      shadow(ctx, 40, 14, light ? 0.18 : 0.45);
      ctx.fillStyle = light ? '#ffffff' : '#2b2a29'; roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); noShadow(ctx);
      ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(bx + 72, by + bh / 2, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = T.accentInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 42px ${FONTS.sans}`;
      ctx.fillText(String(avatar)[0].toUpperCase(), bx + 72, by + bh / 2 + 2);
      ctx.textAlign = 'left'; ctx.font = `500 44px ${FONTS.sans}`; ctx.fillStyle = light ? T.sub : 'rgba(255,255,255,.8)';
      const pre = text + ' '; ctx.fillText(pre, bx + 142, by + bh / 2 + 2);
      const pw = ctx.measureText(pre).width, word = `"${String(keyword).toUpperCase()}"`;
      const typed = prog(lt, 0.4, 0.6);
      ctx.font = `800 44px ${FONTS.sans}`; ctx.fillStyle = T.accent;
      ctx.fillText(word.slice(0, Math.ceil(word.length * typed)), bx + 142 + pw, by + bh / 2 + 2);
      if (typed > 0 && typed < 1 && Math.floor(lt * 4) % 2) { ctx.fillRect(bx + 146 + pw + ctx.measureText(word.slice(0, Math.ceil(word.length * typed))).width, by + 40, 4, 56); }
      const sk = prog(lt, 1.2, 0.3);
      if (sk > 0) {
        ctx.translate(bx + bw - 72, by + bh / 2); const s = backOut(sk); ctx.scale(s, s);
        ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = T.accentInk; ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(20, 0); ctx.lineTo(-16, 18); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // end card: fade to dark grey, logo draws itself, @handle types on, comment CTA
    drawEnd(ctx, lt, sc) {
      const E = sc.end, T = this.T;
      if (E.flash) { const f = 1 - lt / 0.35; if (f > 0) this.flash(ctx, f); }
      const fade = easeOut(prog(lt, E.flash ? 0.1 : 0, 0.6));
      ctx.fillStyle = `rgba(38,38,38,${(E.over === 'aroll' ? 0.82 : 0.96) * fade})`; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = 720, br = 1 + 0.03 * clamp(lt / sc.dur);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(br, br);
      const lk = easeOut(prog(lt, 0.35, 0.9));
      if (lk > 0) {
        const g = ctx.createLinearGradient(-120, 120, 120, -120);
        g.addColorStop(0, '#feda75'); g.addColorStop(0.35, '#fa7e1e'); g.addColorStop(0.65, '#d62976'); g.addColorStop(1, '#4f5bd5');
        ctx.strokeStyle = g; ctx.fillStyle = g; ctx.lineWidth = 18; ctx.lineCap = 'round';
        strokePartial(ctx, roundRectPts(-115, -115, 230, 230, 66), lk);
        const ck = easeOut(prog(lt, 0.8, 0.6)); if (ck > 0) { ctx.beginPath(); ctx.arc(0, 0, 55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ck); ctx.stroke(); }
        const dk = prog(lt, 1.25, 0.35); if (dk > 0) { ctx.beginPath(); ctx.arc(64, -64, 13 * backOut(dk), 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
      const hk = prog(lt, 1.35, 0.6);
      if (hk > 0) {
        const h = this.handle() || ' ';
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `700 66px ${FONTS.sans}`;
        ctx.fillText(h.slice(0, Math.ceil(h.length * hk)), cx, 980);
        if (E.tagline) {
          const big = !h.trim();                // no handle: the tagline is the main line
          ctx.globalAlpha = easeOut(prog(lt, big ? 1.35 : 1.8, 0.5));
          ctx.font = `italic 500 ${big ? 76 : 46}px ${FONTS.serif}`; ctx.fillStyle = big ? '#fff' : T.accent;
          ctx.fillText(E.tagline, cx, big ? 990 : 1062);
        }
        ctx.restore();
      }
      if (E.keyword) {
        const k = easeOut(prog(lt, 2.0, 0.55));
        if (k > 0) this.drawCommentBar(ctx, 1340, k, lt - 2.0, E.keyword, E.text || 'Comment', E.avatar || this.handle()[1] || 'Y', false);
        if (E.sub) { ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 2.8, 0.5)); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = `500 40px ${FONTS.sans}`; ctx.fillText(E.sub, W / 2, 1500); ctx.restore(); }
      }
    }

    // ---------------------------------------------------------- sound schedule
    buildSfx() {
      const ev = [];
      this.scenes.forEach((sc, i) => {
        if (sc.isEnd) { ev.push([sc.start - 1.4, 'riser', 1.35], [sc.start + 1.25, 'chime']); if (sc.end.keyword) ev.push([sc.start + 3.2, 'pop', 1.3]); if (sc.end.flash) ev.push([sc.start, 'whoosh', 0.5]); return; }
        if (i > 0 && sc.in && sc.in !== 'cut') ev.push([sc.start - (sc.in === 'zoom' ? 0.3 : 0.05), 'whoosh', sc.in === 'zoom' ? 0.6 : 0.5, sc.in !== 'slide']);
        for (const el of sc.elements) { const E = ELEMENTS[el.type]; if (E && E.sfx && el.sfx !== false) for (const e of E.sfx(el)) ev.push([sc.start + e[0], e[1], e[2], e[3]]); }
        if (sc.layout && sc.caption.fx === 'fall') { const kw = sc.layout.words.find((w) => w.key); if (kw) ev.push([sc.start + kw.appear + kw.text.length * 0.06 + 0.3, 'pop', 1.4]); }
        if (sc.layout && sc.caption.fx === 'circle') { const kw = sc.layout.words.find((w) => w.key); if (kw) ev.push([sc.start + kw.appear + 0.35, 'whoosh', 0.6, true]); }
        if (sc.flash != null) ev.push([sc.start + sc.flash - 0.2, 'whoosh', 0.45, false]);
        for (const e of sc.sfx || []) ev.push([sc.start + e[0], e[1], e[2], e[3]]);
        if (sc.punch && sc.layout && sc.layout.firstKey != null && sc.bg === 'aroll') ev.push([sc.start + sc.layout.firstKey, 'tick']);
      });
      this.sfxEvents = ev.sort((a, b) => a[0] - b[0]);
    }
    startAudio() {
      if (!this.sfx.start()) return;
      const from = this.t, at0 = this.sfx.ctx.currentTime + 0.04 - from;
      this.clock0 = { audio: this.sfx.ctx.currentTime, t: from };
      this.scheduleAudio(this.sfx, from, at0, !!this.musicEl);
    }
    scheduleAudio(sfx, from, at0, hasMusic) {
      const music = this.P.music ?? 'pad';
      if ((music === 'pad' || music === 'lofi') && !hasMusic) sfx.pad(at0 + from, from, this.duration);
      if (music === 'lofi' && !hasMusic) sfx.beat(at0 + from, from, this.duration - 2.5);
      for (const [t, kind, a, b] of this.sfxEvents) {
        if (t < from - 0.01) continue;
        const when = Math.max(0, at0 + t);
        if (kind === 'whoosh') sfx.whoosh(when, a, b !== false);
        else if (kind === 'pop') sfx.pop(when, a);
        else if (kind === 'tick') sfx.tick(when);
        else if (kind === 'click') sfx.click(when);
        else if (kind === 'riser') sfx.riser(when, a);
        else if (kind === 'chime') sfx.chime(when);
      }
    }
    // render the sound effects + music bed offline → 16-bit stereo WAV (ArrayBuffer)
    async renderAudio(sampleRate = 48000) {
      const OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
      const oc = new OAC(2, Math.ceil((this.duration + 0.5) * sampleRate), sampleRate);
      this.scheduleAudio(new Sfx().attach(oc), 0, 0, false);
      const buf = await oc.startRendering();
      const n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)];
      const out = new DataView(new ArrayBuffer(44 + n * 4));
      const str = (o, v) => { for (let i = 0; i < v.length; i++) out.setUint8(o + i, v.charCodeAt(i)); };
      str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true);
      out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sampleRate, true); out.setUint32(28, sampleRate * 4, true);
      out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
      for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < 2; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
      return out.buffer;
    }
    syncMedia(force) {
      const sync = (el, target) => {
        if (!el || el.readyState < 1) return;
        const tgt = clamp(target, 0, (el.duration || 1e9) - 0.05);
        if (this.playing) { if (el.paused) el.play().catch(() => {}); if (force || Math.abs(el.currentTime - tgt) > 0.3) el.currentTime = tgt; }
        else { if (!el.paused) el.pause(); if (force || Math.abs(el.currentTime - tgt) > 0.04) el.currentTime = tgt; }
      };
      sync(this.arollEl, this.t + ((this.P.aroll && this.P.aroll.offset) || 0));
      sync(this.musicEl, this.t);
    }

    // ---------------------------------------------------------- transport
    play() {
      if (this.t >= this.duration - 0.02) this.t = 0;
      this.playing = true; this.invalidate();
      this.startAudio(); this.syncMedia(true);
    }
    pause() { this.playing = false; this.clock0 = null; this.sfx.stop(); this.syncMedia(true); }
    seek(t) { this.t = clamp(t, 0, this.duration - 0.001); this.invalidate(); if (this.playing) this.startAudio(); this.syncMedia(true); }
    tick(dt) {
      if (this.playing) {
        // the audio clock is the master, so picture and sound never drift apart
        const ac = this.sfx.ctx;
        if (ac && ac.state === 'running' && this.clock0) this.t = this.clock0.t + (ac.currentTime - this.clock0.audio);
        else this.t += dt;
        if (this.t >= this.duration) { this.t = this.duration - 0.001; this.pause(); if (this.onEnd) this.onEnd(); }
        else this.syncMedia(false);
      }
      this.composeFinal(this.t, this.octx);
      if (this.onTime) this.onTime(this.t, this.duration);
    }
    renderAt(t) { this.t = clamp(t, 0, this.duration - 0.001); this.invalidate(); this.composeFinal(this.t, this.octx); }

    record(onDone) {
      if (this.recorder) { this.recorder.stop(); return; }
      if (!global.MediaRecorder || !this.out.captureStream) throw new Error('Recording needs MediaRecorder (Chrome, Edge, Firefox or Safari 14.1+).');
      const stream = this.out.captureStream(30);
      if (this.sfx.ensure()) this.sfx.dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      // H.264 + AAC MP4 first (what Instagram wants), then WebM
      const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mime = types.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 12e6 });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        this.recorder = null; this.onEnd = this._prevOnEnd;
        const type = rec.mimeType || mime || 'video/webm';
        onDone && onDone(new Blob(chunks, { type }), type.includes('mp4') ? 'mp4' : 'webm');
      };
      this.recorder = rec;
      this._prevOnEnd = this.onEnd;
      this.onEnd = () => { setTimeout(() => rec.state !== 'inactive' && rec.stop(), 200); if (this._prevOnEnd) this._prevOnEnd(); };
      this.pause(); this.t = 0; this.invalidate();
      rec.start(250);
      this.play();
    }
  }

  // ---------------------------------------------------------------- quick script → project
  // One line = one scene. "*word*" = key word. Add elements after "|":
  //   Focus is *leverage.* | circle
  //   You get *10 seconds* | ring: 10
  //   Earn it and people get | pills: Clearer, Sharper, More intentional
  function buildFromScript(text, o = {}) {
    const lines = String(text).split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
    const cycle = ['zoom', 'slide', 'blur', 'morph'];
    const aroll = !!o.aroll;
    let prevBg = null, ti = 0;
    const scenes = lines.map((ln, i) => {
      const [cap, ...dirs] = ln.split('|').map((s) => s.trim());
      const nWords = cap.split(/\s+/).filter(Boolean).length;
      const sc = { caption: { text: cap, at: 0.2 }, elements: [], bg: aroll ? 'aroll' : 'theme' };
      let t = 0.2 + nWords * 0.26 + 0.2;
      let extra = 0;
      for (const d of dirs) {
        const m = d.match(/^([a-zA-Z]+)\s*:?\s*(.*)$/); if (!m) continue;
        const kind = m[1].toLowerCase(), arg = m[2].trim(), list = arg.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
        if (kind === 'pills') { sc.elements.push({ type: 'pills', items: list, at: t, y: 1250 }); extra = Math.max(extra, list.length * 0.28 + 1); }
        else if (kind === 'bullets') { sc.elements.push({ type: 'bullets', items: list, at: t, y: 1250 }); extra = Math.max(extra, list.length * 0.45 + 1); }
        else if (kind === 'checklist') { sc.elements.push({ type: 'checklist', items: list, at: t, y: 1150 }); extra = Math.max(extra, list.length * 0.5 + 1.3); sc.dim = 1; sc.dimAt = t; }
        else if (kind === 'hexflow') { sc.elements.push({ type: 'hexflow', items: list, at: t, y: 860 }); extra = Math.max(extra, list.length * 0.5 + 1); }
        else if (kind === 'flow') { sc.elements.push({ type: 'flow', nodes: list, at: t, y: 760 }); extra = Math.max(extra, list.length * 0.5 + 1.2); }
        else if (kind === 'ring') { const n = parseInt(arg, 10) || 10; sc.elements.push({ type: 'ring', from: n, to: 0, at: t, dur: Math.min(3, n * 0.3), y: 1120 }); extra = Math.max(extra, Math.min(3, n * 0.3) + 0.8); }
        else if (kind === 'graph') { sc.elements.push({ type: 'graph', at: t, y: 1000, label: arg || undefined }); extra = Math.max(extra, 2.4); }
        else if (kind === 'timeline') { const [a, b] = arg.split('-').map(Number); sc.elements.push({ type: 'timeline', from: a || 2000, to: b || 2025, at: t, ticks: [a || 2000, b || 2025] }); extra = Math.max(extra, 2.6); }
        else if (kind === 'sfx') { sc.elements.push({ type: 'waveform', small: 'use', words: list.map((w, j) => ({ text: w, at: t + j * 1.2 })) }); extra = Math.max(extra, list.length * 1.2 + 0.6); }
        else if (kind === 'broll') { const [n, grade] = arg.split(/\s+/); sc.bg = { media: (parseInt(n, 10) || 1) - 1, grade }; }
        else if (kind === 'cards') { sc.bg = 'white'; sc.elements.push({ type: 'cards', items: list.map((n) => ({ media: (parseInt(n, 10) || 1) - 1 })), at: t }); extra = Math.max(extra, list.length * 0.9 + 0.8); }
        else if (kind === 'comment') { sc.elements.push({ type: 'comment', keyword: arg || 'LINK', at: t, y: 1450 }); extra = Math.max(extra, 2); }
        else if (kind === 'circle' || kind === 'fall' || kind === 'underline' || kind === 'highlight') sc.caption.fx = kind;
        else if (kind === 'tight') sc.frame = 'tight';
      }
      if (sc.elements.length) sc.caption.y = sc.elements.some((e) => e.type === 'waveform') ? 1500 : 480;
      else if (sc.bg === 'aroll' || typeof sc.bg === 'object') sc.caption.y = 1250;
      if (sc.bg === 'aroll') { sc.punch = /\*/.test(cap) || undefined; if (i % 3 === 2) sc.frame = sc.frame || 'tight'; }
      sc.dur = +Math.max(2.2, t + extra + 0.5).toFixed(2);
      // voice-over: the scene lasts as long as its clip, words spread over the speech
      const vt = o.timing && o.timing[i];
      if (vt) {
        sc.dur = +vt.dur.toFixed(2);
        sc.caption.at = +vt.speech[0].toFixed(2);
        sc.caption.rate = +(((vt.speech[1] - vt.speech[0]) * 0.85) / Math.max(1, nWords)).toFixed(3);
        const after = sc.caption.at + nWords * sc.caption.rate;
        for (const e of sc.elements) if (e.at != null) e.at = +Math.min(e.at, after).toFixed(2);
        if (sc.elements.some((e) => e.type === 'waveform')) sc.elements.filter((e) => e.type === 'waveform').forEach((e) => e.words.forEach((w, j) => { w.at = +(sc.caption.at + j * Math.max(0.5, (vt.speech[1] - vt.speech[0]) / e.words.length)).toFixed(2); }));
      }
      const bgKey = typeof sc.bg === 'object' ? 'media' : sc.bg;
      sc.in = i === 0 ? null : (bgKey === 'aroll' && prevBg === 'aroll' ? null : cycle[ti++ % cycle.length]);
      prevBg = bgKey;
      return sc;
    });
    return {
      title: o.title || 'My reel', theme: o.theme || 'clean', handle: o.handle || '@yourhandle', music: 'pad',
      scenes, end: { keyword: o.keyword || 'LINK', text: 'Comment', sub: o.sub || "and I'll send it to you", tagline: o.tagline || '', flash: true },
    };
  }

  global.ReelStudio = { Reel, THEMES, ELEMENTS, TRANSITION, buildFromScript, W, H };
})(window);
