# Reel Studio

A standalone tool that makes Instagram reels (1080 × 1920, 9:16) in one editing style, taken from a frame-by-frame
breakdown of five reference reels. It is separate from the 3D house viewer in the rest of this repo and shares no code
with it.

**Open `reels/index.html` in Chrome, Edge, Firefox or Safari.** There is no build step and nothing to install. Choose
a style, add your clips and script, press **Play**, then **● Record video** to download the reel.

## The editing style

Every reel the tool makes follows these rules:

1. **One A-roll setup.** Keep the talking head in one shot and punch in about 1.2× on emphasis words instead of
   cutting (`punch: true`, `frame: "tight"`).
2. **Word-by-word captions.** Each word fades up as it's spoken, all in one font family. Only the key word changes
   style: a serif italic, the brand colour, or bigger condensed capitals. Mark it with `*stars*`.
3. **A new visual every 1.5–3 s.** Use B-roll, a card or an infographic.
4. **Almost no hard cuts.** Scenes change with zoom-through (whip-zoom with motion blur), blur, slide (push with
   motion blur), morph or flash transitions, and each one gets a synthesised whoosh.
5. **Nothing sits still.** Footage, captions, cards and tags all scale or drift by 2–5 %, over a moving background
   (drifting blobs, a gradient or particles).
6. **The same ending.** The reel fades to dark grey, an Instagram-style logo draws itself, the @handle types on,
   and a "Comment KEYWORD" bar appears. A small handle stays in the corner for the whole reel.

Sound effects are generated in the browser: whooshes on transitions, pops on tags, ticks on counters, clicks on
checklist items, a riser into the end card and a chime on the logo. A soft four-chord pad plays underneath. You can
turn the effects off, or upload your own music.

## The five looks (presets)

| Preset | Based on | Features |
|---|---|---|
| 1 · Motion graphics | "Attention is expensive" | White and one green with drifting circles, letters falling in with `$` particles, a whip-zoom into a ring timer, hexagon icons joined by lines, corner brackets, pill tags, and a hand-drawn circle around "leverage" |
| 2 · UI animation | "Build a business with Claude" | Blue-white gradient, cards with soft shadows, a chat mockup that slides up and zooms out, a flowchart with self-drawing dashed lines, a payment page, a dark-mode DM card, and a fake comment bar as the CTA |
| 3 · A-roll + SFX words | Sound-effects tips | One locked-off A-roll shot. Huge condensed yellow words sit on an animated waveform with a red playhead, and each word squashes out letter by letter as the next pops in |
| 4 · Cinematic phone frame | "Definition of success" | Rounded phone frame with creator name and countdown. A-roll dims and blurs while a glass checklist tilts in, plus a neon line graph, A-roll in a circle mask with sparkles, arrow bullets, and a map route to a gold trophy |
| 5 · Documentary story | Arthur Brooks story | Moody A-roll alternating wide and tight, large serif italic key words, a sepia flashback with a red circle, a photo card on white with a timeline slider, a tilted card carousel, and a black-and-white closing shot |

Every preset plays without any media: placeholders stand in for the speaker and the photos until you upload yours.

## Making your own reel

### Quick script (easiest)

Each line becomes one scene. Wrap the key word in `*stars*`. To add a visual, put it after a `|`:

```
Attention is *expensive.* | fall
You get about *10 seconds.* | ring: 10
Lose it and you keep *losing.* | hexflow: Losing *prospects*, Losing *momentum*
Earn it and people get | pills: Clearer, Sharper, More intentional
My first studio, *2014* | broll: 1 sepia
Focus is *leverage.* | circle
Want the template? | comment: FOCUS
```

| After the `\|` | Effect |
|---|---|
| `fall` / `circle` / `underline` / `highlight` | Animation on the key word |
| `pills: a, b, c` | Tags pop in one after another, alternating filled and outlined |
| `bullets: a, b` | Arrow-tagged lines slide in |
| `checklist: a, b` | Glass card tilts in and the items tick on (the background dims and blurs) |
| `hexflow: a, b` | Hexagon icons joined by lines that draw themselves |
| `flow: a, b, c` | Flowchart boxes with animated dashed connectors |
| `ring: 10` | Ring timer counting down |
| `graph` | Neon line graph drawing upwards |
| `timeline: 2010-2025` | Slider with a moving year marker |
| `sfx: CLICKS, RISER` | Big words on a waveform with a red playhead |
| `broll: 2 sepia` | Full-frame B-roll slot 2 (`bw` and `sepia` grades available) |
| `cards: 1, 2, 3` | Tilted photo cards sliding past on white |
| `comment: KEYWORD` | Fake comment bar CTA |
| `tight` | Tight A-roll framing |

If you've uploaded an A-roll video, the scenes play over it: consecutive A-roll scenes run with no transition (one
setup) and punch in on the key word. Otherwise they use the look's animated background.

### Advanced: JSON

Under **Advanced** the whole reel is editable JSON, so you can copy a preset and change anything:

```js
{
  "theme": "doc",                 // clean · saas · bold · dark · doc
  "handle": "@yourhandle",
  "music": "pad",                 // pad · none (or upload a track)
  "phone": { "name": "yourname" },// optional phone frame with countdown
  "aroll": { "offset": 0 },       // seconds into your A-roll file where the reel starts
  "scenes": [
    {
      "dur": 3,                   // seconds
      "in": "zoom",               // zoom · slide · blur · morph · flash · fade · cut
      "focus": { "x": 540, "y": 1100 }, // zoom-through centre
      "bg": "aroll",              // theme · aroll · white · "#hex" · { "media": 0, "grade": "sepia" }
      "frame": "tight",           // A-roll framing: wide (default) or tight
      "punch": true,              // 1.2× punch-in on the first key word (or a time in seconds)
      "dim": 1, "dimAt": 0.4,     // dim and blur the footage behind a card
      "flash": 1.8,               // white flash at this time
      "caption": { "text": "It took *10 years.*", "at": 0.2, "y": 1300, "size": 64, "rate": 0.26, "fx": "pop" },
      "elements": [ { "type": "timeline", "from": 2010, "to": 2025, "at": 0.6 } ]
    }
  ],
  "end": { "keyword": "STORY", "text": "Comment", "sub": "for the full interview", "tagline": "", "flash": true, "over": "aroll" }
}
```

The frame is 1080 × 1920, and `x`/`y` are in those pixels. Keep captions and CTAs above y ≈ 1550 and below y ≈ 220,
because Instagram's interface covers the bottom and top of the screen.

Element types: `pills`, `ring`, `hexflow`, `checklist`, `graph`, `timeline`, `waveform`, `chat`, `flow`, `cards`,
`photo`, `circleMask`, `route`, `circle`, `brackets`, `bullets`, `payment`, `comment`, `text`. The presets in
`presets.js` use every one of them, so you can copy from there. Any text inside an element also accepts `*key*` markup.

## Voice-over reels (from a command line)

If you have voice clips (one line each) and no video, two tools turn them into a finished MP4. They need Node,
ffmpeg and Playwright's Chromium.

```bash
# 1. trim each clip to its speech, join them in order, normalise loudness
python3 reels/tools/voiceover.py out/ clip1.m4a clip2.m4a clip3.m4a ...
#    → out/voice.wav and out/timing.json (scene start, length and speech span per clip)

# 2. write the script: one line per clip, in the same order, with *key words* and | visuals
#    then build a project whose scenes last exactly as long as each clip
#    (ReelStudio.buildFromScript(lines, { timing }) does this), and render it:
node reels/tools/render.js --project reel.json --voice out/voice.wav --out reel.mp4
```

`render.js` draws every frame exactly (not in real time) and renders the sound effects and music bed offline. It
lowers them under your voice while you speak, then encodes H.264 + AAC at 30 fps, ready to upload. Captions run word
by word across each line's speech. Each scene lasts as long as its clip, and transitions fall in the short pauses
between lines.

## Recording

**● Record video** plays the reel from the start and records the canvas together with the audio: sound effects, the
music bed and your A-roll's own sound. The file downloads when it finishes. The timeline runs on the audio clock, so
picture and sound stay in sync.

- In Chrome and Edge you get an **MP4 (H.264)**, which you can upload to Instagram directly.
- Firefox records **WebM**. Convert it before uploading, for example with
  `ffmpeg -i reel.webm -c:v libx264 -c:a aac reel.mp4`.
- Some Chromium builds store the audio as Opus inside the MP4. If Instagram rejects the file, run the same `ffmpeg`
  command on it.

Recording happens in real time, so a 30-second reel takes 30 seconds. Keep the tab in front while it records.

## Files

| File | What it is |
|---|---|
| `index.html` | The studio: preview, controls, media upload, quick script, JSON editor |
| `reel-engine.js` | Renderer: captions, transitions, elements, end card, sound, recording |
| `presets.js` | The five sample reels |
| `tools/voiceover.py` | Voice clips → one trimmed, levelled voice track + per-line timing |
| `tools/render.js` | Project (+ voice) → frame-exact H.264/AAC MP4 |

Fonts are Inter, Playfair Display and Anton from Google Fonts. Offline, the tool falls back to Helvetica/Arial,
Georgia and Impact.
