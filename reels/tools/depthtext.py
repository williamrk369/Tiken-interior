#!/usr/bin/env python3
"""Big serif words BEHIND the speaker: drawn into the footage, then the speaker is put back on top.

    python reels/tools/depthtext.py IN.mp4 OUT.mp4 --model selfie_segmentation.tflite --words words.json --font Playfair-700i.woff

words.json: [{"in": 1.2, "out": 2.2, "y": 720, "lines": [{"t": "car", "c": "white"}, {"t": "accident", "c": "gold", "at": 1.5}]}, …]
  in / out   seconds the word is up (fades in 0.35 s with a scale-down and blur, out 0.25 s)
  lines      one or two lines; "c" is gold or white; "at" delays a line (it lands on its own word)
  y          vertical centre of the block (px, default 720 = around the head, so the head covers part of it)
Needs mediapipe + numpy + Pillow and MediaPipe's selfie_segmentation.tflite (see cutout.py). Sound is copied.
"""
import argparse
import json
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python import vision

GOLD_TOP, GOLD_BOT, WHITE = (255, 231, 128), (242, 170, 28), (246, 242, 234)


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
                          '-of', 'json', path], check=True, capture_output=True, text=True).stdout
    s = json.loads(out)['streams'][0]
    n, d = s['r_frame_rate'].split('/')
    return s['width'], s['height'], float(n) / float(d)


def line_image(text, colour, font_path, size):
    """One word as RGBA: gold gets a vertical gradient and a warm glow, white a soft shadow."""
    font = ImageFont.truetype(font_path, size)
    l, t, r, b = font.getbbox(text)
    pad = int(size * 0.25)
    w, h = r - l + 2 * pad, b - t + 2 * pad
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).text((pad - l, pad - t), text, font=font, fill=255)
    if colour == 'gold':
        g = np.linspace(0, 1, h)[:, None]
        rgb = np.stack([np.full((h, w), GOLD_TOP[i] + (GOLD_BOT[i] - GOLD_TOP[i]) * g[:, 0:1]) for i in range(3)], -1).astype(np.uint8)
        glow_rgb = (245, 165, 36)
    else:
        rgb = np.zeros((h, w, 3), np.uint8) + np.array(WHITE, np.uint8)
        glow_rgb = (0, 0, 0)
    fill = Image.fromarray(rgb, 'RGB').convert('RGBA'); fill.putalpha(mask)
    glow = Image.new('RGBA', (w, h), glow_rgb + (0,))
    glow.putalpha(mask.filter(ImageFilter.GaussianBlur(size * 0.07)).point(lambda v: int(v * (0.45 if colour == 'gold' else 0.5))))
    return Image.alpha_composite(glow, fill)


def block(spec, font_path, W):
    """Pre-render each line; size so the widest line fits the frame; stagger two lines like a title."""
    n = len(spec['lines'])
    base = 330 if n == 1 else 270
    imgs = []
    for ln in spec['lines']:
        size = base
        while True:
            im = line_image(ln['t'], ln.get('c', 'gold'), font_path, size)
            if im.width - size * 0.5 <= W * 0.95 or size < 120:
                break
            size = int(size * 0.92)
        imgs.append((im, ln.get('at', spec['in'])))
    return imgs


def ease_out(k):
    return 1 - (1 - k) ** 3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--model', required=True); ap.add_argument('--words', required=True); ap.add_argument('--font', required=True)
    ap.add_argument('--test', default='')
    o = ap.parse_args()
    W, H, fps = probe(o.src)
    specs = json.load(open(o.words))
    blocks = [block(s, o.font, W) for s in specs]
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=o.model), running_mode=vision.RunningMode.VIDEO, output_confidence_masks=True))
    tests = [float(x) for x in o.test.split(',') if x]
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', o.src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = None if tests else subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
        '-i', o.src, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '15', '-pix_fmt', 'yuv420p',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'copy', '-shortest', o.dst], stdin=subprocess.PIPE)
    prev, i, size = None, 0, W * H * 3
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        t = i / fps
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        live = [(s, b) for s, b in zip(specs, blocks) if s['in'] - 0.02 <= t < s['out']]
        out = frame
        if live:
            res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(frame)), int(t * 1000))
            m = np.squeeze(res.confidence_masks[-1].numpy_view()).astype(np.float32)
            prev = m if prev is None else 0.55 * prev + 0.45 * m
            a = np.clip((prev - 0.48) / 0.3, 0, 1); a = a * a * (3 - 2 * a)
            layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            for s, b in live:
                cy = s.get('y', 720)
                total = sum(im.height * 0.72 for im, _ in b)
                y = cy - total / 2
                for k, (im, at) in enumerate(b):
                    kin = min(1, max(0, (t - at) / 0.35)); kout = min(1, max(0, (s['out'] - t) / 0.25))
                    alpha = ease_out(kin) * kout
                    if alpha <= 0.01:
                        y += im.height * 0.72; continue
                    sc = 1.12 - 0.12 * ease_out(kin)
                    li = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.LANCZOS)
                    if kin < 1:
                        li = li.filter(ImageFilter.GaussianBlur(10 * (1 - ease_out(kin))))
                    if alpha < 1:
                        li.putalpha(li.getchannel('A').point(lambda v, f=alpha: int(v * f)))
                    shift = (-1 if k == 0 else 1) * (W * 0.1 if len(b) > 1 else 0)
                    x = int(W / 2 - li.width / 2 + shift)
                    yy = int(y - (li.height - im.height) / 2)
                    layer.alpha_composite(li, (max(0, x), max(0, yy)), (max(0, -x), max(0, -yy)))
                    y += im.height * 0.72
            lay = np.asarray(layer, np.float32)
            la = lay[..., 3:4] / 255.0
            behind = frame.astype(np.float32) * (1 - la) + lay[..., :3] * la
            out = (behind * (1 - a[..., None]) + frame.astype(np.float32) * a[..., None]).clip(0, 255).astype(np.uint8)
        else:
            prev = None
        if enc:
            enc.stdin.write(np.ascontiguousarray(out).tobytes())
        elif any(abs(t - x) < 0.5 / fps for x in tests):
            Image.fromarray(out).save(o.dst.replace('.mp4', f'-{t:.2f}.png'))
        i += 1
        if tests and t > max(tests) + 0.1:
            break
    dec.stdout.close(); dec.wait()
    if enc:
        enc.stdin.close(); enc.wait()
    print('done', o.dst)


if __name__ == '__main__':
    main()
