#!/usr/bin/env python3
"""Edit talking-head clips into one tight A-roll + a Reel Studio project.

    python3 reels/tools/aroll.py OUT_DIR clip1.mov clip2.mov ... [--handle @you] [--keyword WORD]
                                 [--theme doc] [--tagline "..."] [--no-grade]

Applies the house editing style to A-roll shot in one setup:
  • dead air removed: pauses longer than 0.4 s are cut (jump cuts)
  • every jump cut becomes a framing change (wide ↔ tight ~1.35× punch-in),
    so it reads as two cameras instead of a cut
  • long takes get an extra punch-in in a micro-pause, so the framing
    changes every ~2–3.5 s
  • clip-to-clip changes use a zoom-through transition with a whoosh
  • a light grade (contrast, warmth, vignette) and levelled audio

Writes OUT_DIR/aroll.mp4 (1080×1920, 30 fps, graded, H.264 + AAC),
OUT_DIR/shots.json (every kept piece) and OUT_DIR/project.json, which
tools/render.js turns into the finished reel:

    node reels/tools/render.js --project OUT_DIR/project.json --aroll OUT_DIR/aroll.mp4 --out reel.mp4

Needs only ffmpeg.
"""
import argparse
import array
import json
import math
import os
import subprocess

HOP = 0.02            # analysis frame (s)
MERGE_GAP = 0.40      # pauses shorter than this stay in
PAD_IN, PAD_OUT = 0.10, 0.16
SPLIT_OVER = 3.6      # takes longer than this get a punch-in inside
FPS = 30
GRADE = ('eq=contrast=1.08:saturation=1.12:gamma=0.97,'
         'colorbalance=rs=0.025:gs=0.005:bs=-0.03:rm=0.02:bm=-0.02,'
         'vignette=angle=PI/5')


def probe_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         check=True, capture_output=True, text=True).stdout
    return float(out.strip())


def envelope(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                         check=True, capture_output=True).stdout
    a = array.array('h'); a.frombytes(raw)
    hop = int(16000 * HOP)
    db = []
    for i in range(0, max(1, len(a) - hop + 1), hop):
        seg = a[i:i + hop]
        rms = math.sqrt(sum(v * v for v in seg) / len(seg)) / 32768
        db.append(20 * math.log10(rms + 1e-6))
    return db


def pct(xs, p):
    s = sorted(xs)
    return s[min(len(s) - 1, int(len(s) * p / 100))]


def speech_segments(db, dur):
    floor, peak = pct(db, 15), pct(db, 99)
    thr = max(floor + 10, peak - 32)
    runs, i = [], 0
    while i < len(db):
        if db[i] > thr:
            j = i
            while j < len(db) and db[j] > thr:
                j += 1
            if (j - i) * HOP >= 0.06:
                runs.append([i * HOP, j * HOP])
            i = j
        else:
            i += 1
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < MERGE_GAP:
            merged[-1][1] = r[1]
            merged[-1][2] += r[1] - r[0]
        else:
            merged.append([r[0], r[1], r[1] - r[0]])
    # a piece with under 0.25 s of actual sound is a click or the phone starting, not speech
    merged = [m[:2] for m in merged if m[2] >= 0.25]
    keep = []
    for s, e in merged:
        a, b = max(0.0, s - PAD_IN), min(dur, e + PAD_OUT)
        if keep and a < keep[-1][1]:
            a = keep[-1][1]
        if b - a > 0.25:
            keep.append([a, b])
    return keep, thr


def split_points(db, a, b):
    """Split a long take at its quietest 0.1 s near the middle, recursively."""
    if b - a <= SPLIT_OVER:
        return []
    lo, hi = a + 1.3, b - 1.3
    mid = (a + b) / 2
    best, best_score = mid, 1e9
    t = lo
    while t <= hi:
        i = int(t / HOP)
        level = max(db[i:i + 5] or [-100])
        score = level + abs(t - mid) * 4          # quiet, and close to the middle
        if score < best_score:
            best, best_score = t + 0.05, score
        t += HOP
    return split_points(db, a, best) + [best] + split_points(db, best, b)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('out')
    ap.add_argument('clips', nargs='+')
    ap.add_argument('--handle', default='')
    ap.add_argument('--keyword', default='')
    ap.add_argument('--theme', default='doc')
    ap.add_argument('--tagline', default='')
    ap.add_argument('--no-grade', action='store_true')
    o = ap.parse_args()
    os.makedirs(o.out, exist_ok=True)

    shots, pieces, t = [], [], 0.0
    for ci, clip in enumerate(o.clips):
        dur = probe_duration(clip)
        db = envelope(clip)
        segs, thr = speech_segments(db, dur)
        print(f'{os.path.basename(clip)}: {dur:.1f}s → {sum(b - a for a, b in segs):.1f}s kept in {len(segs)} pieces')
        for si, (a, b) in enumerate(segs):
            pieces.append((ci, a, b))
            cuts = [a] + split_points(db, a, b) + [b]
            for k in range(len(cuts) - 1):
                shots.append({'clip': ci, 'src': [round(cuts[k], 3), round(cuts[k + 1], 3)], 'start': round(t + cuts[k] - a, 3),
                              'dur': round(cuts[k + 1] - cuts[k], 3), 'newClip': si == 0 and k == 0, 'jump': k == 0})
            t += b - a

    # one continuous, graded A-roll
    inputs, chains, labels = [], [], []
    for ci, clip in enumerate(o.clips):
        inputs += ['-i', clip]
    vf = 'scale=1080:1920:flags=lanczos,setsar=1,fps=%d' % FPS + ('' if o.no_grade else ',' + GRADE)
    for k, (ci, a, b) in enumerate(pieces):
        chains.append(f'[{ci}:v]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS,{vf}[v{k}]')
        chains.append(f'[{ci}:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,'
                      f'afade=t=out:st={max(0, b - a - 0.02):.3f}:d=0.02,aresample=48000[a{k}]')
        labels.append(f'[v{k}][a{k}]')
    chains.append(''.join(labels) + f'concat=n={len(pieces)}:v=1:a=1[vc][ac]')
    chains.append('[ac]highpass=f=70,acompressor=threshold=-22dB:ratio=3:attack=5:release=150,'
                  'loudnorm=I=-15:TP=-1.5:LRA=8[ao]')
    aroll = os.path.join(o.out, 'aroll.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(chains),
                    '-map', '[vc]', '-map', '[ao]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
                    '-g', '15', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', aroll], check=True)

    # project: one scene per shot, framing alternates at every cut
    scenes, tight = [], False
    for i, s in enumerate(shots):
        tight = False if s['newClip'] else not tight
        sc = {'dur': s['dur'], 'bg': 'aroll', 'frame': 'tight' if tight else 'wide', 'focusY': 0.2}
        if not s['newClip']:
            sc['sfx'] = [[-0.06, 'whoosh', 0.22, tight]]   # soft swish on each punch-in / punch-out
        if s['newClip'] and i > 0:
            sc['in'] = 'zoom'
            sc['focus'] = {'x': 540, 'y': 560}
        scenes.append(sc)
    end = {'flash': False, 'tagline': o.tagline or ('' if o.handle else 'Follow for more')}
    if o.keyword:
        end.update({'keyword': o.keyword, 'text': 'Comment'})
    project = {'title': 'A-roll reel', 'theme': o.theme, 'captionStyle': {'weight': 700, 'key': 'color', 'size': 66}, 'handle': o.handle, 'music': 'pad',
               'watermark': bool(o.handle), 'aroll': {'offset': 0}, 'scenes': scenes, 'end': end}
    with open(os.path.join(o.out, 'shots.json'), 'w') as f:
        json.dump(shots, f, indent=1)
    with open(os.path.join(o.out, 'project.json'), 'w') as f:
        json.dump(project, f, indent=1)
    raw = sum(probe_duration(c) for c in o.clips)
    print(f'A-roll: {raw:.1f}s raw → {t:.1f}s, {len(shots)} shots ({sum(1 for s in shots if not s["newClip"])} punch-in cuts)')


if __name__ == '__main__':
    main()
