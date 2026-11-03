#!/usr/bin/env python3
"""Turn a set of voice clips into one voice-over track plus per-line timing.

    python3 reels/tools/voiceover.py OUT_DIR clip1.m4a clip2.m4a ...

Clips are used in the order given (one clip = one line = one scene). Each clip
is trimmed to its speech, with a short lead-in before the first word (room for
the incoming transition) and a short tail after the last word. Writes:

    OUT_DIR/voice.wav      48 kHz mono, loudness-normalised
    OUT_DIR/timing.json    [{"clip", "start", "dur", "speech": [s, e]}, ...]
                           start = where the scene starts in the reel (s)
                           speech = first/last word, relative to the scene

Needs only ffmpeg (no Python packages).
"""
import array
import json
import math
import os
import subprocess
import sys

SR = 16000          # analysis rate
HOP = 0.02          # 20 ms frames
LEAD = 0.30         # silence kept before the first word (transition lands here)
TAIL = 0.25         # silence kept after the last word
MIN_RUN = 0.08      # ignore clicks/blips shorter than this


def pcm(path, rate):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(rate), '-'],
                         check=True, capture_output=True).stdout
    a = array.array('h'); a.frombytes(raw)
    return a


def speech_span(path):
    x = pcm(path, SR)
    hop = int(SR * HOP)
    db = []
    for i in range(0, max(1, len(x) - hop + 1), hop):
        seg = x[i:i + hop]
        rms = math.sqrt(sum(v * v for v in seg) / max(1, len(seg))) / 32768
        db.append(20 * math.log10(rms + 1e-6))
    peak = max(db)
    thr = max(-45.0, peak - 30)            # relative to this clip's loudest frame
    voiced = [d > thr for d in db]
    runs, i = [], 0
    while i < len(voiced):
        if voiced[i]:
            j = i
            while j < len(voiced) and voiced[j]:
                j += 1
            if (j - i) * HOP >= MIN_RUN:
                runs.append((i * HOP, j * HOP))
            i = j
        else:
            i += 1
    dur = len(x) / SR
    if not runs:
        return 0.0, dur, dur
    return runs[0][0], min(dur, runs[-1][1]), dur


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out, clips = sys.argv[1], sys.argv[2:]
    os.makedirs(out, exist_ok=True)
    timing, parts, t = [], [], 0.0
    for k, c in enumerate(clips):
        s, e, dur = speech_span(c)
        a = max(0.0, s - 0.06)                     # keep the start of the first consonant
        b = min(dur, e + 0.12)
        piece = os.path.join(out, f'part{k:02d}.wav')
        pre = max(0.0, LEAD - (s - a))
        # trim, then pad: lead-in silence + speech + tail silence
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', c, '-af',
                        f'atrim={a:.3f}:{b:.3f},asetpts=N/SR/TB,adelay={int(pre * 1000)},apad=pad_dur={TAIL:.3f},'
                        'afade=t=in:d=0.02,aresample=48000',
                        '-ac', '1', '-ar', '48000', piece], check=True)
        seg_dur = pre + (b - a) + TAIL
        timing.append({'clip': os.path.basename(c), 'start': round(t, 3), 'dur': round(seg_dur, 3),
                       'speech': [round(pre + (s - a), 3), round(pre + (e - a), 3)]})
        parts.append(piece)
        t += seg_dur
    lst = os.path.join(out, 'parts.txt')
    with open(lst, 'w') as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-af', 'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=9',
                    '-ar', '48000', '-ac', '1', os.path.join(out, 'voice.wav')], check=True)
    for p in parts:
        os.remove(p)
    os.remove(lst)
    with open(os.path.join(out, 'timing.json'), 'w') as f:
        json.dump(timing, f, indent=1)
    for tm in timing:
        print(f"{tm['clip']:<40} scene {tm['start']:6.2f}s  dur {tm['dur']:.2f}s  speech {tm['speech'][0]:.2f}–{tm['speech'][1]:.2f}s")
    print(f'total voice-over: {t:.2f}s')


if __name__ == '__main__':
    main()
