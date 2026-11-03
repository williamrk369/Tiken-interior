#!/usr/bin/env node
/* Render a Reel Studio project to an Instagram-ready MP4, frame by frame.
 *
 *   node reels/tools/render.js --project reel.json --out reel.mp4 [--voice voice.wav] [--fps 30]
 *                              [--aroll aroll.mp4] [--sfx 0.8] [--voice-gain 1]
 *
 * Unlike "Record video" in the browser (real time), this renders every frame
 * exactly, renders the sound effects + music bed offline, mixes them under the
 * voice-over (ducked while the voice speaks) and encodes H.264 + AAC with
 * ffmpeg. Needs Node, ffmpeg and Playwright's Chromium.
 *
 * --aroll: a talking-head video (e.g. from tools/aroll.py). Its frames are
 * fed in one by one for scenes with bg "aroll", and its sound is used as the
 * voice unless --voice is given. B-roll uploads are not available here.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k.startsWith('--')) args[k.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
}
if (!args.project || !args.out) {
  console.error('usage: node render.js --project reel.json --out reel.mp4 [--voice voice.wav] [--fps 30]');
  process.exit(1);
}
const fps = +(args.fps || 30);
const project = JSON.parse(fs.readFileSync(args.project, 'utf8'));
const page = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message));
  await tab.goto(page, { waitUntil: 'load' });
  await tab.evaluate(async () => {
    if (!document.fonts) return;
    await Promise.all(['600 40px Inter', '800 40px Inter', 'italic 500 40px "Playfair Display"', '40px Anton'].map((f) => document.fonts.load(f).catch(() => {})));
    await document.fonts.ready;
  });
  const duration = await tab.evaluate((p) => {
    const r = window.__reel;
    r.pause();
    r.load(p);
    r.relayout();
    return r.duration;
  }, project);
  console.log(`reel: ${duration.toFixed(2)} s, ${Math.ceil(duration * fps)} frames at ${fps} fps`);

  // 1. sound effects + music bed, rendered offline in the page
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
  let arollFrames = 0;
  if (args.aroll) {
    fs.mkdirSync(path.join(tmp, 'a'));
    await new Promise((res, rej) => spawn('ffmpeg', ['-v', 'error', '-i', args.aroll, '-vf', `fps=${fps},scale=1080:1920`, '-q:v', '3', path.join(tmp, 'a', '%05d.jpg')], { stdio: 'inherit' })
      .on('close', (c) => (c ? rej(new Error('frame extraction failed')) : res())));
    arollFrames = fs.readdirSync(path.join(tmp, 'a')).length;
    if (!args.voice) args.voice = args.aroll;
    console.log(`a-roll: ${arollFrames} frames`);
  }
  const sfxWav = path.join(tmp, 'sfx.wav');
  const b64 = await tab.evaluate(async () => {
    const buf = await window.__reel.renderAudio(48000);
    let s = ''; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  });
  fs.writeFileSync(sfxWav, Buffer.from(b64, 'base64'));

  // 2. frames → ffmpeg, mixed with the audio
  const sfxGain = +(args.sfx ?? 0.8);
  const inputs = ['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', sfxWav];
  let filter, map;
  if (args.voice) {
    inputs.push('-i', args.voice);
    // duck the effects/music under the voice, then mix
    filter = `[2:a]aformat=channel_layouts=stereo,volume=${+(args['voice-gain'] || 1)},asplit=2[v][vk];` +
             `[1:a]volume=${sfxGain}[fx];[fx][vk]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=250[duck];` +
             `[v][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]`;
  } else {
    filter = `[1:a]volume=${sfxGain},alimiter=limit=0.95[a]`;
  }
  map = ['-filter_complex', filter, '-map', '0:v', '-map', '[a]'];
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', ...inputs, ...map,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', duration.toFixed(3), '-movflags', '+faststart', args.out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error('ffmpeg exited ' + c)) : res())));

  const frames = Math.ceil(duration * fps);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    let frame = null;
    if (arollFrames) {
      const off = (project.aroll && project.aroll.offset) || 0;
      const k = Math.min(arollFrames, Math.max(1, Math.round((i / fps + off) * fps) + 1));
      frame = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(tmp, 'a', String(k).padStart(5, '0') + '.jpg')).toString('base64');
    }
    const url = await tab.evaluate(async ([t, f]) => {
      const r = window.__reel;
      if (f) { const img = new Image(); img.src = f; await img.decode(); r.arollFrame = img; }
      r.renderAt(t);
      return document.getElementById('reel').toDataURL('image/jpeg', 0.93);
    }, [i / fps, frame]);
    if (!ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r  frame ${i}/${frames}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nwrote ${args.out}`);
  if (errors.length) console.log('page errors:', errors);
})().catch((e) => { console.error(e); process.exit(1); });
