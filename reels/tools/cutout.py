#!/usr/bin/env python3
"""Cut the speaker out of a talking-head video and put them on black with a slowly drifting dot grid.

    python reels/tools/cutout.py IN.mp4 OUT.mp4 --model selfie_segmentation.tflite [--test 3,20,41]

Needs `pip install mediapipe numpy` and MediaPipe's selfie-segmentation model file
(mediapipe/modules/selfie_segmentation/selfie_segmentation.tflite inside the 0.10.x wheels on PyPI).
Runs offline. The matte is smoothed over time (no edge flicker), feathered, and the sound is copied.
--test writes PNG stills at those seconds instead of a video.
"""
import argparse
import json
import subprocess

import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python import vision

BG = np.array([7, 8, 11], np.float32)          # near-black, a touch blue
DOT = np.array([52, 58, 74], np.float32)       # dot colour
SPACING, RADIUS, DRIFT = 42, 2.6, (14.0, 22.0)  # px between dots, dot radius, drift px/s (x, y)


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
                          '-show_entries', 'format=duration', '-of', 'json', path], check=True, capture_output=True, text=True).stdout
    j = json.loads(out)
    s = j['streams'][0]
    n, d = s['r_frame_rate'].split('/')
    return s['width'], s['height'], float(n) / float(d), float(j['format']['duration'])


def dot_tile():
    """One period of the dot grid, soft-edged, as a 0..1 coverage map."""
    y, x = np.mgrid[0:SPACING, 0:SPACING].astype(np.float32)
    d = np.hypot(x - SPACING / 2, y - SPACING / 2)
    return np.clip(RADIUS + 0.75 - d, 0, 1)


def background(w, h, t, tile, vignette):
    ox, oy = int(DRIFT[0] * t) % SPACING, int(DRIFT[1] * t) % SPACING
    reps = (h // SPACING + 2, w // SPACING + 2)
    cov = np.tile(tile, reps)[oy:oy + h, ox:ox + w]
    img = BG + (DOT - BG) * cov[..., None]
    return img * vignette[..., None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--model', required=True)
    ap.add_argument('--test', default='')
    ap.add_argument('--smooth', type=float, default=0.55, help='temporal smoothing of the matte, 0 = none')
    o = ap.parse_args()

    w, h, fps, dur = probe(o.src)
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=o.model), running_mode=vision.RunningMode.VIDEO, output_confidence_masks=True))
    tile = dot_tile()
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    vignette = np.clip(1.15 - 0.55 * np.hypot((xx - w / 2) / (w / 2), (yy - h * 0.42) / (h / 1.6)), 0.45, 1.0)

    tests = [float(x) for x in o.test.split(',') if x]
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', o.src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = None
    if not tests:
        enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(fps), '-i', '-',
                                '-i', o.src, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '15',
                                '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
                                '-c:a', 'copy', '-shortest', o.dst], stdin=subprocess.PIPE)
    prev, i, size = None, 0, w * h * 3
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        t = i / fps
        frame = np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        want = not tests or any(abs(t - x) < 0.5 / fps for x in tests)
        res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(frame)), int(t * 1000))
        m = np.squeeze(res.confidence_masks[-1].numpy_view()).astype(np.float32)
        if m.shape != (h, w):
            m = np.array(mp.Image(image_format=mp.ImageFormat.VEC32F1, data=m).numpy_view())
        prev = m if prev is None else o.smooth * prev + (1 - o.smooth) * m
        if want:
            a = np.clip((prev - 0.48) / 0.3, 0, 1)
            a = a * a * (3 - 2 * a)                                   # smoothstep: firm inside, soft edge
            out = frame.astype(np.float32) * a[..., None] + background(w, h, t, tile, vignette) * (1 - a[..., None])
            out = np.clip(out, 0, 255).astype(np.uint8)
            if enc:
                enc.stdin.write(out.tobytes())
            else:
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-i', '-',
                                o.dst.replace('.mp4', f'-{t:.2f}.png')], input=out.tobytes(), check=True)
        i += 1
        if tests and t > max(tests) + 0.1:
            break
        if i % 150 == 0:
            print(f'  {t:.1f}/{dur:.1f}s', flush=True)
    dec.stdout.close(); dec.wait()
    if enc:
        enc.stdin.close(); enc.wait()
    print('done', o.dst)


if __name__ == '__main__':
    main()
