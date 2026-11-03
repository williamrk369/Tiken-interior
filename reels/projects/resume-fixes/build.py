"""Build the resume-fixes reel: captions + word-timed graphics on top of the aroll.py edit.

    python3 build.py OUT/project.json      # OUT = the folder tools/aroll.py wrote
    → project.json here, then:
    node ../../tools/render.js --project project.json --aroll OUT/aroll.mp4 --out resume-reel.mp4
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
words = json.load(open(os.path.join(HERE, 'words.json')))
base = json.load(open(sys.argv[1]))
END = 55.0
# caption groups: same words as spoken, *key* = styled word
groups = """If you have applied to *thousands* of jobs
and *nobody* is calling you back,
it's not the *job market,*
it's your *resume.*
So the fix *number 1*
is use the *right word.*
And in order to do that,
you have to pick out the *skill.*
If they use the word *data analysis*
and in your resume you, you write
*good with numbers,*
then your resume is *rejected.*
And the fix *number 2*
is *add numbers.*
Don't just say what you did,
just add the *number*
of what you have *changed*
because of you,
and recruiter would *stop scrolling*
if you add this
and skip the *fancy template,*
icon table, and *2-column*
*confuses* the recruiters.
Just only *1 column*
and *clear heading*
and *normal font.*
This thing so fix these *3 things*
and watch your call *goes up.*
Comment *RESUME*
so that you can know
what kind of resume you will share.""".split('\n')
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
caps, k = [], 0
for g in groups:
    toks = g.split()
    times = []
    for t in toks:
        assert norm(t) == norm(words[k]['w']), (t, words[k]['w'])
        times.append(round(max(0, words[k]['s'] - 0.05), 2)); k += 1
    caps.append({'text': g, 'start': times[0], 'times': times})
assert k == len(words)
for i, c in enumerate(caps):
    c['end'] = round(caps[i + 1]['start'] - 0.02, 2) if i + 1 < len(caps) else END
W = {}
for w in words: W.setdefault(norm(w['w']), []).append(w['s'])
def at(word, n=0): return W[norm(word)][n]

Y = 430
overlays = [
    {'start': 1.0, 'end': 4.45, 'elements': [
        {'type': 'stat', 'label': 'Applications sent', 'value': 1000, 'suffix': '+', 'at': at('thousands') - 1.0, 'y': 300, 'w': 860},
        {'type': 'stat', 'label': 'Callbacks', 'value': 0, 'color': '#ff4d4d', 'at': at('calling') - 1.0, 'y': 450, 'w': 860, 'dur': 0.1}]},
    {'start': 6.2, 'end': 7.32, 'dim': 0.6, 'elements': [{'type': 'doc', 'at': 0.1, 'y': 980, 'w': 380}]},
    {'start': at('data') - 0.2, 'end': 21.78, 'elements': [
        {'type': 'xlist', 'title': 'Keyword match', 'y': Y, 'items': [
            {'label': 'Job post asks for', 'text': '"Data analysis"', 'ok': True, 'at': 0.2},
            {'label': 'Your resume says', 'text': '"Good with numbers"', 'ok': False, 'at': at('good') - at('data') + 0.2}]},
        {'type': 'stamp', 'text': 'REJECTED', 'at': at('rejected') - at('data') + 0.2, 'y': Y + 175, 'x': 640, 'size': 96, 'breathe': 0}]},
    {'start': at('say') - 0.15, 'end': 29.95, 'elements': [
        {'type': 'xlist', 'title': 'Example', 'y': Y, 'items': [
            {'text': 'Managed social media', 'ok': False, 'at': 0.15},
            {'text': 'Grew followers by 40%', 'ok': True, 'at': at('number', 2) - at('say') + 0.15}]}]},
    {'start': at('recruiter') - 0.1, 'end': 33.7, 'elements': [
        {'type': 'feed', 'at': 0.1, 'dur': at('scrolling') - at('recruiter') - 0.1, 'y': Y, 'h': 460, 'badge': '+40%'}]},
    {'start': at('fancy') - 0.15, 'end': 39.98, 'elements': [
        {'type': 'xlist', 'title': 'Skip', 'y': Y, 'rowH': 84, 'items': [
            {'text': 'Fancy template', 'at': 0.15, 'size': 42},
            {'text': 'Icons', 'at': at('icon') - at('fancy') + 0.15, 'size': 42},
            {'text': 'Tables', 'at': at('table') - at('fancy') + 0.15, 'size': 42},
            {'text': '2 columns', 'at': at('2-column') - at('fancy') + 0.15, 'size': 42}]}]},
    {'start': at('only') , 'end': 45.9, 'elements': [
        {'type': 'xlist', 'title': 'Do this', 'y': Y, 'items': [
            {'text': '1 column', 'ok': True, 'at': at('column') - at('only')},
            {'text': 'Clear headings', 'ok': True, 'at': at('clear') - at('only')},
            {'text': 'Normal font', 'ok': True, 'at': at('normal') - at('only')}]}]},
    {'start': at('watch') - 0.2, 'end': 49.85, 'elements': [
        {'type': 'panel', 'y': Y, 'w': 880, 'h': 420, 'at': 0},
        {'type': 'graph', 'label': '*Callbacks*', 'x': 170, 'y': Y - 100, 'w': 740, 'h': 240, 'at': 0.1, 'dur': 1.3,
         'points': [0.05, 0.08, 0.06, 0.18, 0.3, 0.5, 0.72, 0.95], 'breathe': 0}]},
    {'start': at('comment'), 'end': END, 'elements': [
        {'type': 'comment', 'keyword': 'RESUME', 'text': 'Comment', 'avatar': 'R', 'at': 0.05, 'y': 400, 'light': True}]},
]
# scenes: drop the content-neutral circle cutaways, tag the floating cards with the fix number
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
print(len(caps), 'caption groups,', len(overlays), 'graphics, scenes', len(base['scenes']))
