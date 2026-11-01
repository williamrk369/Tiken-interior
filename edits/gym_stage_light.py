"""Gym 'stage lighting' edit, built on the colour-graded base.
- Dims and softens the whole background so the athlete is the focus
- Adds an LED strip along the edge of the ceiling opening (with glow + light spill)
- Adds a cool rim light around the athlete's outline and a spotlight on the back
Only light/colour is changed on the athlete; no pixels are moved, so muscle size/shape is identical.
Usage: stage.py original.png graded_base.png subject_mask.png out.jpg
"""
import sys
import numpy as np
import cv2
from PIL import Image

orig_p, base_p, mask_p, out_p = sys.argv[1:5]
base = np.asarray(Image.open(base_p).convert("RGB")).astype(np.float32) / 255.0
mask = np.asarray(Image.open(mask_p).convert("L")).astype(np.float32) / 255.0
H, W, _ = base.shape

rows = np.where(np.asarray(Image.open(orig_p).convert("L")).max(axis=1) > 20)[0]
top, bot = rows.min(), rows.max() + 1
img = base[top:bot].copy()
m = mask[top:bot]
h, w = m.shape
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

def lum(c):
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]

def sstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def blur(a, s):
    return cv2.GaussianBlur(a, (0, 0), s)

# ---------------------------------------------------------------- masks
m = np.clip((m - 0.05) / 0.9, 0, 1)
m_choke = cv2.erode(m, np.ones((5, 5), np.uint8))   # pull edge in ~2px so no bright background fringe
m_soft = blur(m_choke, 1.0)                # anti-aliased composite edge
m3 = m_soft[..., None]

# ---------------------------------------------------------------- background
# Fill the athlete with surrounding background before blurring so no skin colour bleeds out.
bg8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
hole = (cv2.dilate((m > 0.1).astype(np.uint8), np.ones((15, 15), np.uint8)) * 255)
small = cv2.resize(bg8, (w // 3, h // 3), interpolation=cv2.INTER_AREA)
hole_s = cv2.resize(hole, (w // 3, h // 3), interpolation=cv2.INTER_NEAREST)
filled_s = cv2.inpaint(small, hole_s, 9, cv2.INPAINT_TELEA)
filled = cv2.resize(filled_s, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
hm = (hole > 0)[..., None]
bg = np.where(hm, filled, img)
bg = blur(bg, 3.0)                          # gentle depth-of-field

L = lum(bg)[..., None]
bg = L + (bg - L) * 0.55                    # heavy desaturation
bg = bg * np.array([0.92, 0.97, 1.05])      # cool, steel-blue tint
# Dim: dark everywhere, a soft pool of light behind / under the athlete.
cx, cy = w * 0.50, h * 0.36
d_back = np.sqrt(((xx - cx) / (w * 0.42)) ** 2 + ((yy - cy) / (h * 0.30)) ** 2)
d_floor = np.sqrt(((xx - w * 0.52) / (w * 0.38)) ** 2 + ((yy - h * 0.94) / (h * 0.06)) ** 2)
pool = 0.30 + 0.22 * (1 - sstep(0.0, 1.3, d_back)) + 0.14 * (1 - sstep(0.0, 1.2, d_floor))
edge = np.sqrt(((xx - w / 2) / (w * 0.62)) ** 2 + ((yy - h * 0.45) / (h * 0.62)) ** 2)
pool *= 1 - 0.55 * sstep(0.55, 1.2, edge)    # heavy vignette
bg = bg * pool[..., None]
bg = np.interp(bg, [0, 0.1, 0.4, 1], [0.012, 0.05, 0.30, 0.85])  # crush shadows

# ---------------------------------------------------------------- athlete
subj = img.copy()
d_s = np.sqrt(((xx - w * 0.50) / (w * 0.45)) ** 2 + ((yy - h * 0.30) / (h * 0.28)) ** 2)
spot = 1.00 + 0.16 * (1 - sstep(0.0, 1.1, d_s))   # brightest on the back/shoulders
legs = sstep(h * 0.42, h * 0.95, yy)
subj = subj * (spot * (1 - 0.25 * legs))[..., None]
# Midtone contrast pop on the body (tone only).
subj = np.interp(subj, [0, 0.15, 0.5, 0.85, 1], [0.0, 0.10, 0.50, 0.88, 0.98])
Ls = lum(subj)[..., None]
subj = Ls + (subj - Ls) * 0.90

# ---------------------------------------------------------------- rim light
binm = (m_choke > 0.5).astype(np.uint8)
dist = cv2.distanceTransform(binm, cv2.DIST_L2, 5)
sm = blur(m_choke, 5)
gy, gx = np.gradient(sm)
gn = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
nx, ny = -gx / gn, -gy / gn                     # outward normal
# Light comes from above and both sides (like an LED ring overhead).
direc = np.clip(1.10 * np.clip(-ny, 0, 1) ** 0.8 + 0.55 * np.abs(nx) * (ny < 0.35), 0, 1.2)
direc = blur(direc, 4)
upper = 1 - 0.92 * sstep(h * 0.30, h * 0.55, yy)  # strongest on head/arms/back, fades down the legs
rim_in = (np.exp(-dist / 2.2) * 0.95 + np.exp(-dist / 9.0) * 0.25) * binm
rim = blur(rim_in, 1.0) * direc * upper
rim_col = np.array([0.80, 0.93, 1.00])          # icy LED white
rim3 = np.clip(rim, 0, 1.2)[..., None]
subj = 1 - (1 - subj) * (1 - np.clip(rim3 * 0.80 * rim_col, 0, 0.95))   # screen blend

# ---------------------------------------------------------------- composite
out = bg * (1 - m3) + subj * m3

# Light wrap / bloom just outside the silhouette.
glow_src = blur(rim, 1.5)
wrap = (blur(glow_src, 4) * 0.30 + blur(glow_src, 14) * 0.12)[..., None] * (1 - m3)
out = 1 - (1 - out) * (1 - np.clip(wrap * rim_col * 0.9, 0, 0.8))

# ---------------------------------------------------------------- LED strip on ceiling opening
# Edge of the opening (measured): left edge x = 190 + 0.208*(Y-235), bottom lip y ~ 491 - 0.006*(X-450)
def Y(yfull):
    return yfull - top
pts_left = [(190 + 0.208 * (yf - 235), Y(yf)) for yf in (top, 491)]
corner = (190 + 0.208 * (491 - 235), Y(491))
pts_bottom = [corner, (w - 1, Y(491 - 0.006 * (w - 1 - 450)))]

core = np.zeros((h, w), np.float32)
poly = np.array([pts_left[0], corner, pts_bottom[1]], np.float32)
off = np.array([[6, 0], [6, -6], [0, -6]], np.float32)   # tuck strip just inside the lip
poly_in = (poly + off).round().astype(np.int32).reshape(-1, 1, 2)
cv2.polylines(core, [poly_in * 4], False, 1.0, thickness=6, lineType=cv2.LINE_AA, shift=2)
core = blur(core, 0.8)

led_col = np.array([0.72, 0.90, 1.00])
glow = (blur(core, 3) * 2.2 + blur(core, 10) * 1.8 + blur(core, 28) * 1.5 + blur(core, 70) * 1.2 + blur(core, 160) * 0.9)
glow3 = glow[..., None] * led_col
# Light spill: ceiling below the lip and inside the opening catch the light.
lip_y = Y(491)
below = (yy > lip_y) * np.exp(-np.clip(yy - lip_y, 0, None) / 90.0) * (xx > corner[0] - 40)
above = (yy < lip_y) * np.exp(-np.clip(lip_y - yy, 0, None) / 45.0) * (xx > corner[0])
spill = blur((below * 0.55 + above * 0.40).astype(np.float32), 6)[..., None] * led_col
out = 1 - (1 - out) * (1 - np.clip(glow3 * 0.80 + spill * (1 - m3), 0, 0.97))
out = np.maximum(out, np.clip(core[..., None] * 1.05, 0, 1) * np.array([0.93, 0.98, 1.0]))  # hot white core

# A faint cool overhead wash on the athlete's head/shoulders from the strip.
wash = (1 - sstep(h * 0.12, h * 0.40, yy)) * m_soft * 0.10
out = 1 - (1 - out) * (1 - wash[..., None] * led_col)

# ---------------------------------------------------------------- finish
out = np.clip(out, 0, 1)
rng = np.random.default_rng(11)
out = np.clip(out + rng.normal(0, 0.008, (h, w, 1)).astype(np.float32) * (1 - lum(out)[..., None]), 0, 1)

final = base.copy()
final[top:bot] = out
final[:top] = 0
final[bot:] = 0
Image.fromarray((final * 255 + 0.5).astype(np.uint8)).save(out_p, quality=95)
print("saved", out_p, final.shape)
