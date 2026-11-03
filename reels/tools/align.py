#!/usr/bin/env python3
"""Time every word of a known transcript against the A-roll (forced alignment).

    pip install pocketsphinx          # ships its own English model, no downloads
    python3 reels/tools/align.py out/aroll.mp4 transcript.txt out/words.json

transcript.txt is what is said, in order (punctuation is fine; digits 1–20
are read as words). The result is [{"w": word as written, "s": start, "e": end}]
in seconds on the A-roll's timeline, ready to group into caption lines
(a project's "captions": [{ text, start, end, times }]).

Recognising unknown speech offline is unreliable, but aligning a known
transcript is accurate, so get the words from the speaker or a transcription
service and let this place them.
"""
import json
import re
import subprocess
import sys

from pocketsphinx import Decoder

NUM = {str(i): w for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen '
                                         'fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split())}


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    media, text, out = sys.argv[1:]
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', media, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    tokens = []
    for d in re.findall(r'\S+', open(text, encoding='utf-8').read().replace('—', ' ').replace('–', ' ')):
        w = re.sub(r"[^a-z0-9'\-]", '', d.lower())
        parts = [NUM.get(p, p) for p in w.split('-') if p]
        if parts:
            tokens.append((d, parts))
    spoken = [p for _, ps in tokens for p in ps]
    dec = Decoder(samprate=16000, bestpath=False)
    unknown = sorted({w for w in spoken if dec.lookup_word(w) is None})
    if unknown:
        sys.exit('not in the pronunciation dictionary (respell them as they sound): ' + ', '.join(unknown))
    dec.set_align_text(' '.join(spoken))
    dec.start_utt(); dec.process_raw(pcm, full_utt=True); dec.end_utt()
    segs = [(s.start_frame / 100, (s.end_frame + 1) / 100) for s in dec.seg()
            if s.word not in ('<s>', '</s>', '<sil>', '[NOISE]', '(NULL)')]
    if len(segs) != len(spoken):
        sys.exit(f'alignment failed ({len(segs)} of {len(spoken)} words placed): check the transcript matches the audio')
    res, k = [], 0
    for d, ps in tokens:
        chunk = segs[k:k + len(ps)]; k += len(ps)
        res.append({'w': d, 's': round(chunk[0][0], 2), 'e': round(chunk[-1][1], 2)})
    with open(out, 'w') as f:
        json.dump(res, f, indent=0)
    print(f'{len(res)} words aligned, {res[0]["s"]:.2f}–{res[-1]["e"]:.2f}s → {out}')


if __name__ == '__main__':
    main()
