"""Build the resume-fixes reel: captions + word-timed graphics + photo B-roll on top of the aroll.py edit.

    python3 build.py OUT/project.json      # OUT = the folder tools/aroll.py wrote
    → project.json here, then:
    node ../../tools/render.js --project project.json --aroll OUT/aroll.mp4 --out resume-reel.mp4
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
words = json.load(open(os.path.join(HERE, 'words.json')))
base = json.load(open(sys.argv[1]))
END = 55.0

# Each caption line: (what was said, what is shown). The shown text is grammar-fixed;
# its words take their timing from the matching spoken words, the rest are interpolated.
LINES = [
    ("If you have applied to thousands of jobs", "If you've applied to *thousands* of jobs"),
    ("and nobody is calling you back,", "and *nobody* is calling you back,"),
    ("it's not the job market,", "it's not the *job market.*"),
    ("it's your resume.", "It's your *resume.*"),
    ("So the fix number 1", "So, fix *number 1:*"),
    ("is use the right word.", "use the *right words.*"),
    ("And in order to do that,", "To do that,"),
    ("you have to pick out the skill.", "pick out the *skills* they ask for."),
    ("If they use the word data analysis", 'If the job says *"data analysis"*'),
    ("and in your resume you, you write", "and your resume says"),
    ("good with numbers,", '*"good with numbers,"*'),
    ("then your resume is rejected.", "your resume gets *rejected.*"),
    ("And the fix number 2", "Fix *number 2:*"),
    ("is add numbers.", "*add numbers.*"),
    ("Don't just say what you did,", "Don't just say what you did."),
    ("just add the number", "Add the *numbers*"),
    ("of what you have changed", "for what you *changed*"),
    ("because of you,", "because of you."),
    ("and recruiter would stop scrolling", "Recruiters will *stop scrolling*"),
    ("if you add this", "when you add this."),
    ("and skip the fancy template,", "Fix 3: skip the *fancy template.*"),
    ("icon table, and 2-column", "Icons, tables and *2 columns*"),
    ("confuses the recruiters.", "*confuse* recruiters."),
    ("Just only 1 column", "Use just *1 column,*"),
    ("and clear heading", "*clear headings*"),
    ("and normal font.", "and a *normal font.*"),
    ("This thing so fix these 3 things", "Fix these *3 things*"),
    ("and watch your call goes up.", "and watch your *calls go up.*"),
    ("Comment RESUME", "Comment *RESUME*"),
    ("so that you can know", "so you can see"),
    ("what kind of resume you will share.", "the kind of resume I'll share."),
]
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower().replace("'ve", '').replace('#', ''))
stem = lambda w: norm(w).rstrip('s')

caps, k = [], 0
for said, shown in LINES:
    toks = said.split()
    st = []
    for t in toks:
        assert norm(t) == norm(words[k]['w']), (t, words[k]['w'])
        st.append((stem(t), max(0, words[k]['s'] - 0.05), words[k]['e'])); k += 1
    out, j = [], 0
    for w in shown.split():
        m = next((i for i in range(j, len(st)) if st[i][0] and st[i][0] == stem(w)), None)
        out.append(st[m][1] if m is not None else None)
        if m is not None: j = m + 1
    # interpolate the unmatched words across the spoken span of this line
    span0, span1 = st[0][1], max(st[-1][1], st[-1][2] - 0.25)
    known = [(i, t) for i, t in enumerate(out) if t is not None]
    if not known or known[0][0] != 0: known.insert(0, (-1, span0 - (span1 - span0) / max(1, len(out))))
    if known[-1][0] != len(out) - 1: known.append((len(out), span1 + 0.05))
    for a, b in zip(known, known[1:]):
        for i in range(a[0] + 1, b[0]):
            out[i] = a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0])
    out = [max(span0, t) for t in out]
    for i in range(1, len(out)): out[i] = max(out[i], out[i - 1] + 0.04)
    caps.append({'text': shown, 'start': round(out[0], 2), 'times': [round(t, 2) for t in out]})
assert k == len(words)
for i, c in enumerate(caps):
    c['end'] = round(caps[i + 1]['start'] - 0.02, 2) if i + 1 < len(caps) else END

W = {}
for w in words: W.setdefault(norm(w['w']), []).append(w['s'])
def at(word, n=0): return W[norm(word)][n]

Y = 430
B = 'broll/'
# photo B-roll: 6 full-screen, 4 half photo / half talking head (each placed on the words it illustrates)
full = [  # (image, start, end)
    (B + '15.webp', at("it's", 0) - 0.1, 7.32),                 # it's not the job market, it's your resume
    (B + '14.webp', at('use', 0) - 0.12, at('and', 1) + 0.0),    # use the right words
    (B + '13.webp', at('you', 2) - 0.1, at('if', 1) - 0.1),     # pick out the skills
    (B + '12.webp', at('good') - 0.12, 21.78),                  # "good with numbers" → rejected
    (B + '11.webp', 23.34, at("don't") - 0.1),      # add numbers
    (B + '4.webp', at('recruiter') - 0.25, 33.7),               # recruiters will stop scrolling
]
splits = [  # (image, start, end, content height fraction)
    (B + '5.webp', at("don't") - 0.1, at('because') - 0.05, 0.54),  # don't just say what you did
    (B + '3.webp', 35.15, at('just', 2) - 0.08, 0.65),               # skip the fancy template
    (B + '2.webp', at('just', 2) - 0.08, at('this', 1) - 0.02, 0.69),  # 1 column, clear headings, normal font
    (B + '1.webp', 47.81, at('so', 2) - 0.05, 0.62),                 # fix these 3 things → comment
]
overlays = [
    {'start': 1.0, 'end': at("it's", 0) - 0.1, 'elements': [
        {'type': 'stat', 'label': 'Applications sent', 'value': 1000, 'suffix': '+', 'at': at('thousands') - 1.0, 'y': 300, 'w': 860},
        {'type': 'stat', 'label': 'Callbacks', 'value': 0, 'color': '#ff4d4d', 'at': at('calling') - 1.0, 'y': 450, 'w': 860, 'dur': 0.1}]},
    {'start': at('data') - 0.2, 'end': at('good') - 0.12, 'elements': [
        {'type': 'xlist', 'title': 'The job post asks for', 'y': Y - 40, 'items': [
            {'text': '"Data analysis"', 'ok': True, 'at': 0.2}]}]},
    *[{'start': round(s, 2), 'end': round(e, 2), 'elements': [{'type': 'bpic', 'src': src, 'breathe': 0, 'drift': 0}]}
      for src, s, e in full],
    *[{'start': round(s, 2), 'end': round(e, 2),
       'elements': [{'type': 'split', 'src': src, 'contentH': ch, 'splitY': 1150, 'breathe': 0, 'drift': 0}]}
      for src, s, e, ch in splits],
    {'start': at('so', 2) - 0.05, 'end': END, 'elements': [
        {'type': 'comment', 'keyword': 'RESUME', 'text': 'Comment', 'avatar': 'R', 'at': 0.05, 'y': 400, 'light': True}]},
]
# captions sit on the seam while the screen is split
for c in caps:
    if any(c['start'] < e and c['end'] > s + 0.3 for _, s, e, _ in splits):
        c['style'] = {'y': 1150}

labels = iter(['FIX #1', 'FIX #2', 'FIX #3', '3 FIXES'])
for sc in base['scenes']:
    if sc.get('bg') == 'theme':
        sc.update({'bg': 'aroll', 'frame': 'wide', 'focusY': 0.2}); sc.pop('elements', None); sc['sfx'] = []
    if sc.get('bg') == 'white':
        sc['elements'].append({'type': 'pills', 'items': [next(labels)], 'style': 'filled', 'y': 250, 'size': 60, 'at': 0.15})
base['scenes'][0]['elements'] = [e for e in base['scenes'][0].get('elements', []) if e['type'] != 'brackets']
base.update({'title': 'Resume fixes', 'theme': 'bold', 'music': 'lofi', 'captions': caps, 'overlays': overlays,
             'captionStyle': {'weight': 700, 'key': 'color', 'size': 64, 'stroke': 12, 'y': 1470},
             'end': {'keyword': 'RESUME', 'text': 'Comment', 'tagline': 'Follow for more resume tips', 'flash': False}})
json.dump(base, open(os.path.join(HERE, 'project.json'), 'w'), indent=1)
print(len(caps), 'caption lines,', len(overlays), 'graphics/B-roll,', len(base['scenes']), 'scenes')
for o in sorted(overlays, key=lambda o: o['start']): print(f"  {o['start']:6.2f}-{o['end']:6.2f}  " + ', '.join(e.get('src', e['type']) for e in o['elements']))
for c in caps: print(f"{c['start']:6.2f}  {c['text']}")
