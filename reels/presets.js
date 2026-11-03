/* Reel Studio – sample projects, one per reference reel.
 * Every preset plays without media (placeholders stand in for A-roll and
 * B-roll). Upload your own clips in the panel and they replace the placeholders:
 *   bg: 'aroll'          → your talking-head video (one setup, punch-ins)
 *   bg: { media: 0 }     → B-roll slot 1 (images or videos)
 *   cards / photo items  → { media: n } uses B-roll slot n + 1
 */
window.REEL_PRESETS = [
  // 1 ─ pure motion graphics, two colours, letters falling, whip-zoom, pills, circled key word
  {
    id: 'attention',
    name: '1 · Motion graphics (clean green)',
    project: {
      title: 'Attention is expensive', theme: 'clean', handle: '@yourhandle', music: 'pad',
      scenes: [
        { dur: 3.3, caption: { text: 'Attention is\n*expensive.*', at: 0.3, y: 900, size: 76, fx: 'fall', particle: '$' } },
        { dur: 3.6, in: 'zoom', focus: { x: 540, y: 1120 }, caption: { text: 'You get about *10 seconds.*', at: 0.2, y: 560 },
          elements: [{ type: 'ring', from: 10, to: 0, at: 0.6, dur: 2.6, y: 1130, r: 170, label: 'to hook someone' }] },
        { dur: 3.8, in: 'slide', caption: { text: 'Lose it and you keep *losing.*', at: 0.2, y: 420 },
          elements: [{ type: 'hexflow', items: ['Losing *prospects*', 'Losing *momentum*', 'Losing *opportunities*'], at: 1.0, y: 800 }] },
        { dur: 3.8, in: 'blur', caption: { text: 'Earn it and people get', at: 0.2, y: 640 },
          elements: [
            { type: 'brackets', x: 540, y: 1150, w: 900, h: 420, at: 0.6 },
            { type: 'pills', items: ["They're clearer", 'Sharper', 'More intentional', 'Faster to say yes'], at: 1.0, y: 1150 },
          ] },
        { dur: 3.3, in: 'morph', caption: { text: 'Focus is *leverage.*', at: 0.25, y: 940, size: 78, fx: 'circle' } },
      ],
      end: { keyword: 'FOCUS', text: 'Comment', sub: "and I'll send you the hook checklist", tagline: 'save this for your next edit', flash: true },
    },
  },

  // 2 ─ SaaS-style UI animation: cards with soft shadows, chat, flowchart, payment, comment CTA
  {
    id: 'business',
    name: '2 · UI animation (SaaS gradient)',
    project: {
      title: 'Build a business with AI', theme: 'saas', handle: '@yourhandle', music: 'pad',
      scenes: [
        { dur: 4.4, caption: { text: 'I built a whole *business* in a chat.', at: 0.2, y: 300, size: 58 },
          elements: [{ type: 'chat', title: 'AI assistant', at: 1.0, gap: 0.8, y: 1100, h: 1180, messages: [
            { me: true, text: 'Build me a landing page for my editing templates' },
            { text: 'Done. Want a checkout too?' },
            { me: true, text: 'Yes, $77, UPI and cards' },
            { text: 'Checkout is live ✓' },
          ] }] },
        { dur: 3.8, in: 'zoom', caption: { text: 'Then connect *everything.*', at: 0.2, y: 380 },
          elements: [{ type: 'flow', nodes: ['Website', 'AI assistant', 'Payments', 'Instagram DMs'], at: 0.8, y: 720, step: 260 }] },
        { dur: 3.6, in: 'slide', caption: { text: 'People pay while you *sleep.*', at: 0.2, y: 420 },
          elements: [{ type: 'payment', title: 'Reel templates', subtitle: '42 After Effects files', amount: '$77', methods: ['UPI', 'Visa', 'Apple Pay'], at: 0.8, y: 1080 }] },
        { dur: 3.6, in: 'blur', caption: { text: 'DMs answer *themselves.*', at: 0.2, y: 330 },
          elements: [{ type: 'chat', title: 'Instagram DMs', at: 0.7, gap: 0.7, y: 1060, h: 1000, dark: true, messages: [
            { text: 'Hey! Saw your reel, where do I get the templates?' },
            { me: true, text: "Here's the link 👉 yoursite.com/templates" },
            { text: 'Bought it 🙌' },
          ] }] },
        { dur: 3.4, in: 'morph', caption: { text: 'Posts *schedule* for the week', at: 0.2, y: 600 },
          elements: [{ type: 'pills', items: ['Mon · Reel', 'Tue · Carousel', 'Wed · Story', 'Thu · Reel', 'Fri · Live'], at: 0.9, y: 1050 }] },
        { dur: 3.4, in: 'zoom', caption: { text: 'Want the *exact* setup?', at: 0.2, y: 760 },
          elements: [{ type: 'comment', keyword: 'BUSINESS', text: 'Comment', avatar: 'B', at: 0.9, y: 1140, light: true, sub: "I'll send you the link", subColor: '#5a6785' }] },
      ],
      end: { keyword: 'BUSINESS', text: 'Comment', sub: "and I'll DM you the full workflow", flash: false },
    },
  },

  // 3 ─ one locked-off A-roll shot, huge yellow SFX words on a waveform with a red playhead
  {
    id: 'sfx',
    name: '3 · A-roll + SFX words (bold yellow)',
    project: {
      title: 'Sound effects that make edits pop', theme: 'bold', handle: '@yourhandle', music: 'none', aroll: { offset: 0 },
      scenes: [
        { dur: 3.2, bg: 'aroll', punch: true, caption: { text: '4 sound effects that make every edit *pop*', at: 0.2, y: 1320, size: 60 } },
        { dur: 2.4, bg: 'aroll', elements: [{ type: 'waveform', small: 'use', words: [{ text: 'CLICKS', at: 0.15 }], y: 1180 }],
          caption: { text: 'on every text pop-in', at: 0.7, y: 1480, size: 50 } },
        { dur: 2.4, bg: 'aroll', frame: 'tight', elements: [{ type: 'waveform', small: 'use', words: [{ text: 'CAMERA', at: 0.15 }], y: 1180 }],
          caption: { text: 'shutters on photo cuts', at: 0.7, y: 1480, size: 50 } },
        { dur: 2.4, bg: 'aroll', elements: [{ type: 'waveform', small: 'use', words: [{ text: 'RISER', at: 0.15 }], y: 1180 }],
          caption: { text: 'before the big reveal', at: 0.7, y: 1480, size: 50 } },
        { dur: 2.6, bg: 'aroll', frame: 'tight', elements: [{ type: 'waveform', small: 'use', words: [{ text: 'WHOOSH', at: 0.15 }], y: 1180 }],
          caption: { text: 'on every transition', at: 0.7, y: 1480, size: 50 } },
        { dur: 3.2, bg: 'aroll', punch: 0.3, caption: { text: 'Want my *pack?*', at: 0.2, y: 1080 },
          elements: [{ type: 'comment', keyword: 'SFX', text: 'Comment', avatar: 'S', at: 0.8, y: 1400, light: false }] },
      ],
      end: { keyword: 'SFX', text: 'Comment', sub: 'for the free sound pack', over: 'aroll' },
    },
  },

  // 4 ─ dark, cinematic, inside a phone frame with a countdown; visual metaphors build up
  {
    id: 'success',
    name: '4 · Cinematic phone frame (dark)',
    project: {
      title: 'The definition of success', theme: 'dark', handle: '@yourhandle', music: 'pad', aroll: { offset: 0 },
      phone: { name: 'yourname', subtitle: 'Original audio' },
      scenes: [
        { dur: 3.2, bg: 'aroll', frame: 'tight', punch: true, caption: { text: 'What does *success* actually mean?', at: 0.2, y: 1200 } },
        { dur: 4.2, bg: 'aroll', dim: 1, dimAt: 0.2, caption: { text: 'Most people *never* write it down.', at: 0.1, y: 420, size: 54 },
          elements: [{ type: 'checklist', title: 'My *definition*', items: ['Time with family', 'Work I am proud of', 'Health first', 'Enough, not more'], at: 0.5, y: 1150 }] },
        { dur: 3.6, in: 'zoom', caption: { text: 'Setting yourself up for *success*', at: 0.2, y: 480, size: 56 },
          elements: [{ type: 'graph', at: 0.6, dur: 2, y: 860, h: 560 }] },
        { dur: 3.8, in: 'slide', bg: 'theme', caption: { text: 'Know *who* you are', at: 0.2, y: 380 },
          elements: [
            { type: 'circleMask', media: 'aroll', x: 540, y: 860, r: 300, at: 0.4 },
            { type: 'bullets', items: ['Your *values*', 'Your *pace*', 'Your *finish line*'], at: 1.1, y: 1360 },
          ] },
        { dur: 4.2, in: 'blur', bg: 'theme',
          elements: [{ type: 'route', at: 0.2, dur: 2.4, label: '*Succeed*', number: 86 }] },
      ],
      end: { keyword: 'SUCCESS', text: 'Comment', sub: 'for my goal-setting template', flash: true },
    },
  },

  // 5 ─ documentary story: moody A-roll wide/tight, archive cards on white, timeline, sepia flashback
  {
    id: 'story',
    name: '5 · Documentary story (serif)',
    project: {
      title: 'The story', theme: 'doc', handle: '@yourhandle', music: 'pad', aroll: { offset: 0 },
      scenes: [
        { dur: 2.6, bg: 'aroll', caption: { text: 'One decision *saved* my career.', at: 0.2, y: 1300 } },
        { dur: 2.4, bg: 'aroll', frame: 'tight', punch: true, caption: { text: 'It took *10 years.*', at: 0.2, y: 1300 } },
        { dur: 3.0, in: 'blur', bg: { media: 0, grade: 'sepia' }, caption: { text: 'I grew up playing the *horn.*', at: 0.3, y: 1300 },
          elements: [{ type: 'circle', x: 540, y: 820, rx: 260, ry: 220, at: 1.2, color: '#ff3b30' }] },
        { dur: 3.6, in: 'slide', bg: 'white', caption: { text: 'Then I became a *student* again', at: 0.2, y: 260, size: 54 },
          elements: [{ type: 'timeline', from: 1990, to: 2025, start: 1992, end: 2004, ticks: [1990, 2000, 2010, 2020], at: 0.5, dur: 2, y: 1580, suffix: '' }, { type: 'photo', media: 1, at: 0.3, y: 900, w: 720, h: 840, tilt: -0.035 }] },
        { dur: 4.2, in: 'zoom', bg: 'white', caption: { text: "Now I'm a", at: 0.1, y: 260, size: 54 },
          elements: [{ type: 'cards', mode: 'carousel', at: 0, gap: 1.1, y: 920, items: [
            { media: 2, label: 'Podcaster', caption: '2019' }, { media: 3, label: 'Author', caption: '2021' }, { media: 4, label: 'Teacher', caption: '2024' },
          ] }] },
        { dur: 2.8, in: 'morph', bg: 'aroll', punch: true, caption: { text: 'And I walked the *Camino de Santiago.*', at: 0.2, y: 1300 } },
        { dur: 2.6, in: 'blur', bg: { media: 5, grade: 'bw' }, caption: { text: 'Some lessons only come *slowly.*', at: 0.3, y: 1300 } },
      ],
      end: { keyword: 'STORY', text: 'Comment', sub: 'for the full interview', over: 'aroll' },
    },
  },
];
