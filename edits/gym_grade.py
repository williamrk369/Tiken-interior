"""Gym-aesthetic light & colour grade. Tone/colour operations only:
no resizing, warping, liquify or any geometric change, so body shape is untouched."""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGB")
full = np.asarray(img).astype(np.float32) / 255.0
H, W, _ = full.shape

# Grade only the photo area, leave the black letterbox bars as they are.
rows = np.where(full.max(axis=(1, 2)) > 20 / 255)[0]
top, bot = rows.min(), rows.max() + 1
x = full[top:bot].copy()
h, w, _ = x.shape


def lum(c):
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def smoothstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# Skin mask (warm hues) so we can protect / enhance skin separately.
r, g, b = x[..., 0], x[..., 1], x[..., 2]
mx, mn = x.max(-1), x.min(-1)
sat = (mx - mn) / (mx + 1e-6)
skin = ((r > g) & (g > b) & (r - b > 0.06) & (sat > 0.15) & (sat < 0.75)).astype(np.float32)
skin = np.asarray(Image.fromarray((skin * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))) / 255.0
skin = skin[..., None]

# 1) Exposure / tone curve: pull highlights down, crush shadows a touch (moody gym look).
L = lum(x)[..., None]
x = x * 0.97
curve_in = np.array([0.0, 0.10, 0.30, 0.55, 0.80, 1.0])
curve_out = np.array([0.02, 0.06, 0.24, 0.55, 0.82, 0.95])  # matte black, S-curve, soft roll-off
x = np.interp(x, curve_in, curve_out)

# 2) Clarity / micro-contrast: boosts muscle definition through light & shadow only.
def local_contrast(arr, radius, amount, mask=None):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))
    blur = np.asarray(im.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255.0
    detail = arr - blur
    L = lum(arr)[..., None]
    mid = 1 - np.abs(L - 0.5) * 2  # strongest in midtones, avoids clipping
    amt = amount * (0.4 + 0.6 * mid)
    if mask is not None:
        amt = amt * mask
    return arr + detail * amt

x = local_contrast(x, 25, 0.55)                       # overall clarity
x = local_contrast(x, 8, 0.45, 0.35 + 0.65 * skin)    # extra structure on the back/arms

# 3) Split tone: teal-cool shadows, warm golden highlights.
L = lum(x)[..., None]
sh = (1 - smoothstep(0.0, 0.45, L))
hi = smoothstep(0.45, 1.0, L)
x = x + sh * np.array([-0.025, 0.010, 0.035]) * 1.0
x = x + hi * np.array([0.035, 0.012, -0.030])

# 4) Background colour control: mute the loud lime-green and blue, keep skin rich.
mx, mn = x.max(-1, keepdims=True), x.min(-1, keepdims=True)
L = lum(x)[..., None]
r, g, b = x[..., 0:1], x[..., 1:2], x[..., 2:3]
green = np.clip((g - np.maximum(r, b)) * 4, 0, 1)
yellow = np.clip((np.minimum(r, g) - b) * 2.5, 0, 1) * (1 - skin)
blue = np.clip((b - np.maximum(r, g)) * 3, 0, 1)
bg_desat = 1 - (0.60 * green + 0.40 * blue + 0.45 * yellow)
s = bg_desat * (0.85 * (1 - skin) + 1.05 * skin)  # mute background, keep skin rich
x = L + (x - L) * s
# Shift the lime walls toward olive/teal, darken them slightly.
x = x - green * np.array([0.02, 0.05, -0.01])
x = x * (1 - 0.10 * yellow)
# Pull down bright non-skin highlights (white ceiling/lights) so the body is the brightest thing.
L = lum(x)[..., None]
x = x * (1 - 0.18 * smoothstep(0.55, 0.95, L) * (1 - skin))
# Warm, bronzed skin tone.
x = x + skin * np.array([0.025, 0.006, -0.02])

# 5) Spotlight lighting: radial light on the subject + vignette to draw the eye.
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
cx, cy = w * 0.50, h * 0.38           # centred on the back
d = np.sqrt(((xx - cx) / (w * 0.75)) ** 2 + ((yy - cy) / (h * 0.62)) ** 2)
spot = 1 + 0.07 * (1 - smoothstep(0.0, 0.7, d))
vig = 1 - 0.50 * smoothstep(0.45, 1.25, d)
x = x * (spot * vig)[..., None]

# 6) Final: slight black lift (matte), gentle highlight protection, fine grain.
x = np.clip(x, 0, 1)
x = 0.015 + x * 0.975
rng = np.random.default_rng(7)
grain = rng.normal(0, 0.010, (h, w, 1)).astype(np.float32)
x = np.clip(x + grain * (1 - smoothstep(0.7, 1.0, lum(x)[..., None])), 0, 1)

out = full.copy()
out[top:bot] = x
Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst, quality=95)
assert Image.open(dst).size == img.size
print("saved", dst, img.size)
