# Resume fixes — treatment

**Film:** 9:16, 1080×1920, ~58.5 s (55.1 s talk + 3.4 s end card) for Instagram Reels.
**Narration:** the footage's own sound (one speaker, five takes joined by `reels/tools/aroll.py`: dead air cut, graded, HLG re-tagged to BT.709).
**Words:** transcript forced-aligned with `reels/tools/align.py` (151 words, all placed) → `<script id="om-cues">` + `assets/voice.words.json`. Captions use the grammar-fixed lines from `../resume-fixes`.
**Language:** talking-head packaging (library: talking-head) + photo B-roll the user supplied (10 images, 941×1672).
**Palette (from the B-roll):** headline blue `#2563eb` (the highlight blocks in every image), tick green `#22c55e`, cross red `#ef4444`, ink `#0f1115`, white glass cards.
**Type:** Inter (bundled, variable) — 800 captions, 850–900 cards.
**Music:** built-in explainer direction, lo-fi variant (warm, unhurried, a tips video, not a launch); ducked under the voice.

## Route and rhythm

Hybrid: one A-roll setup carried by punch-ins on every jump cut (wide ↔ ×1.32), a push-in + whoosh on each new take, and photo cutaways where the words point at something.

| Time | Beat | What moves | Sound |
|---|---|---|---|
| 0–4.4 | Hook | "1,000+ applications" counts up on *thousands*; "0 callbacks" lands on *calling* | count, thud |
| 4.4–7.3 | Claim | **Full** "No callbacks? It's probably your resume." thrown in as a card, slams to full | whoosh, thud |
| 7.3 | Fix 1 | FIX 01 chapter card · push-in | impact, whoosh |
| 9.0–13.6 | | **Full** "Use the right words", "Pick out the skill" | whoosh, thud |
| 14.5–18.9 | | chip: the job post asks for "Data analysis" ✓ | pop, ding |
| 18.9–21.8 | Burst | **Full** "Match exact keywords" (weak vs exact, rejected / approved) | whoosh, thud |
| 21.8 | Fix 2 | FIX 02 · **full** "Add numbers" | impact |
| 24.6–28.7 | | **Split** "Show impact, not just tasks" — talk slides under the seam | slide, paper, whip |
| 30.1–33.7 | Peak | **Full** "Numbers make recruiters stop scrolling" | whoosh, thud |
| 33.7 | Fix 3 | FIX 03 · **split** "Skip the fancy template" → "Use 1 column" | impact, slide, paper |
| 46.1 | Recap | RECAP card · **split** "Fix these 3 things" | impact, paper |
| 51.0–55.1 | CTA | comment bar types "RESUME" | pop, type |
| 55.1–58.5 | End | Comment **RESUME** on the blue block, "Follow for more resume tips"; signature last 1.2 s | riser, impact, chime |

Captions: word by word on the voice; the key phrase lands on a blue block (one unbreakable unit). Line at 1370 px on the talk, 1520 on full photos, on the seam (1150) in split screens.

## Stills to check
hook 2.2 s · hero 20.5 s (keyword match) · densest 41.5 s (split + caption) · end 56.5 s

## Grade (v8, from the user's reference still)
Teal-and-orange: the ungraded cut (aroll.py --no-grade) is re-tagged BT.709, then neutrals/whites pushed to teal and
darkened, skin (reds/yellows) pushed warm, warm midtones, soft S-curve with lifted blacks, vignette. Command in the
build log; big background words are drawn after the grade (tools/depthtext.py) so their gold stays pure.
