  // ---- motion graphics, built in code; each lands on the word in the shot list ------------------
  const panelsRoot = $('#panels');
  const SVG = {
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cross: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>',
    brief: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" fill="none" stroke="#7aa2ff" stroke-width="2.2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" fill="none" stroke="#7aa2ff" stroke-width="2.2"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="#7aa2ff" stroke-width="2.4"/><path d="M15 15l5 5" stroke="#7aa2ff" stroke-width="2.6" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M5 19V13M10 19V9M15 19V11M20 19V5" stroke="#7aa2ff" stroke-width="3" stroke-linecap="round"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 4l9 5-9 5-9-5z" fill="#7aa2ff"/><path d="M3 14l9 5 9-5" fill="none" stroke="#7aa2ff" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z" fill="#fff"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M3.5 7l8.5 6 8.5-6" fill="none" stroke="#fff" stroke-width="2.2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z" fill="#fff"/><circle cx="12" cy="10" r="2.2" fill="#7aa2ff"/></svg>',
  };
  const bars = (ws, cls = '') => ws.map((w) => `<div class="bar ${cls}" style="width:${w}%"></div>`).join('');
  const pill = (cls, icon, text, extra = '') => `<span class="pill ${cls} hid" ${extra}><span class="pi">${SVG[icon]}</span>${text}</span>`;
  // exact whole-word lookup on the aligned transcript (OM.cue matches inside words: "is" would hit "analysis")
  const CUEW = JSON.parse(document.getElementById('om-cues').textContent).words;
  const nz = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const W = (w, n = 1) => { const t = nz(w); let k = 0; for (const x of CUEW) if (nz(x.word) === t && ++k === n) return x.start; return null; };
  const TALK_Y = SEAM + 24 - Number(V.headTop);                  // split: the talk at full size, head just under the seam
  const PANELS = [];
  // a panel; split panels move the talk under the seam unless the neighbour already did
  function panel(id, start, end, kind, html, { talkIn = true, talkOut = true } = {}) {
    const el = document.createElement('div');
    el.className = `panel ${kind}`; el.id = id; el.dataset.omId = id;
    el.innerHTML = `<div class="pin">${html}</div>`;
    panelsRoot.appendChild(el);
    PANELS.push({ id, start, end, kind });
    tl.addLabel(`scene:${id}`, start);
    if (kind === 'split') {
      tl.fromTo(el, { autoAlpha: 1, yPercent: -101 }, { yPercent: 0, duration: 0.55, immediateRender: false }, start);
      if (talkIn) {
        tl.fromTo('#talkwrap', { y: 0 }, { y: TALK_Y, duration: 0.55, ease: 'expo.inOut', immediateRender: false }, start - 0.05);
        OM.sfx('slide', start, { gain: 0.35, dur: 0.5 });
      }
      tl.fromTo('.seam', { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: 0.45, immediateRender: false }, start + 0.15);
      if (talkOut) {
        tl.fromTo(el, { yPercent: 0 }, { yPercent: -101, duration: 0.42, ease: 'expo.in', immediateRender: false }, end - 0.42)
          .fromTo('#talkwrap', { y: TALK_Y }, { y: 0, duration: 0.45, ease: 'expo.inOut', immediateRender: false }, end - 0.4)
          .fromTo('.seam', { opacity: 1 }, { opacity: 0, duration: 0.2, immediateRender: false }, end - 0.3)
          .set(el, { autoAlpha: 0 }, end);
        OM.sfx('whip', end - 0.38, { gain: 0.35 });
      } else tl.set(el, { autoAlpha: 0 }, end + 0.45);       // the next panel covers it first
    } else {
      tl.fromTo(el, { autoAlpha: 0, scale: 1.1 }, { autoAlpha: 1, scale: 1, duration: 0.3, immediateRender: false }, start)
        .fromTo('.seam', { opacity: 1 }, { opacity: 0, duration: 0.2, immediateRender: false }, start)
        .fromTo(el, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.22, immediateRender: false }, end - 0.22);
    }
    return el;
  }
  const show = (sel, at, from = {}, dur = 0.42, ease = 'back.out(1.8)') =>
    tl.fromTo(sel, { autoAlpha: 0, scale: 0.7, ...from }, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: 0, duration: dur, ease, immediateRender: false }, at);
  // a stamp that LANDS on the word (it falls for 0.26 s before)
  const slam = (sel, word, rot = -12) => {
    tl.fromTo(sel, { autoAlpha: 0, scale: 2.3, rotation: rot }, { autoAlpha: 1, scale: 1, rotation: rot, duration: 0.26, ease: 'power4.in', immediateRender: false }, word - 0.26);
    OM.sfx('stamp', word, { gain: 0.7 });
  };
  const shake = (sel, at) => tl.fromTo(sel, { x: -14 }, { x: 0, duration: 0.45, ease: 'elastic.out(1.2, 0.3)', immediateRender: false }, at);

  // rows 3–4 · "it's not the job market, it's your resume."
  const tIts = W("it's") ?? 4.48, tJob = W('job') ?? 5.06, tIts2 = W("it's", 2) ?? 5.97, tResume = W('resume') ?? 6.59;
  panel('panel-resume', tIts - 0.08, 7.32, 'split', `
    <div class="doc" id="jm" style="left:170px;top:60px;width:740px;height:150px;display:flex;align-items:center;gap:26px;padding:0 40px">
      <div class="ic">${SVG.brief}</div><div style="font-weight:850;font-size:52px">Job market</div>
      <span class="xk hid" id="jm-x" style="margin-left:auto;width:76px;height:76px">${SVG.cross}</span></div>
    <div class="doc hid" id="sc-doc" style="left:250px;top:250px;width:580px;height:720px">
      <div class="dh"><div class="av"></div><div>${bars([72, 46], 'dark')}</div></div>
      ${[0, 1, 2].map(() => `<div class="sec">${bars([34], 'dark')}${bars([94, 82, 88])}</div>`).join('')}
      <div class="scan" id="sc-line"></div><div class="stamp hid" id="sc-stamp">REJECTED</div></div>`);
  show('#jm', tIts, { y: 40, scale: 0.95 }, 0.45, 'expo.out');
  show('#jm-x', tJob); OM.sfx('pop', tJob + 0.05, { gain: 0.5, note: -3 });
  show('#sc-doc', tIts2, { y: 80, scale: 0.92 }, 0.4, 'expo.out'); OM.sfx('paper', tIts2 + 0.1, { gain: 0.5 });
  tl.fromTo('#sc-line', { opacity: 1, y: 0 }, { opacity: 1, y: 700, duration: tResume - tIts2 - 0.25, ease: 'power1.inOut', immediateRender: false }, tIts2 + 0.15)
    .fromTo('#sc-line', { opacity: 1 }, { opacity: 0, duration: 0.15, immediateRender: false }, tResume - 0.1);
  slam('#sc-stamp', tResume); shake('#sc-doc', tResume + 0.02);

  // rows 7–12 · job post → the skill → "data analysis" ✓ → your resume → "good with numbers" ✗ → rejected
  const tAnd = W('and', 2) ?? 10.51, tPick = W('pick') ?? 12.37, tSkill = W('skill') ?? 12.86, tData = W('data') ?? 14.68;
  const tResume2 = W('resume', 2) ?? 16.35, tGood = W('good') ?? 19.03, tWith = W('with') ?? 19.21, tNumbers = W('numbers') ?? 19.38;
  const tThen = W('then') ?? 20.13, tRejected = W('rejected') ?? 21.14;
  panel('panel-keywords', tAnd - 0.08, 21.82, 'split', `
    <div class="doc" id="kw-job" style="left:70px;top:56px;width:940px;height:430px">
      <div class="ch"><div class="ic">${SVG.brief}</div><div class="ct">Job post</div><div class="cs">Requirements</div></div>
      <div class="req" id="kw-r1"><i></i><span>Data analysis</span><span class="tk hid" id="kw-r1t">${SVG.check}</span></div>
      <div class="req"><i></i>${bars([56])}</div><div class="req"><i></i>${bars([38])}</div>
      <div class="sweep hid" id="kw-sweep"></div></div>
    <div class="doc hid" id="kw-res" style="left:70px;top:536px;width:940px;height:420px">
      <div class="ch"><div class="av sm"></div><div class="ct">Your resume</div></div>
      <div class="req" id="kw-l1"><i></i><span id="kw-typed"><span class="wd" id="kw-w1">Good</span> <span class="wd" id="kw-w2">with</span> <span class="wd" id="kw-w3">numbers</span></span><span class="xk hid" id="kw-l1x">${SVG.cross}</span></div>
      <div class="req"><i></i>${bars([48])}</div><div class="req"><i></i>${bars([30])}</div>
      <div class="stamp hid" id="kw-stamp">REJECTED</div></div>
    <svg class="ch-l" id="kw-link" width="1080" height="1150"><path id="kw-path" d="" fill="none" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/></svg>
    <div class="ring hid" id="kw-ring" style="right:110px;top:596px"><svg viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="#3b1416" stroke-width="14"/></svg><b>0%</b><small>Keyword match</small></div>`);
  const rowY = (row, doc) => doc.offsetTop + row.offsetTop + row.offsetHeight / 2;
  const y1 = rowY($('#kw-r1'), $('#kw-job')), y2 = rowY($('#kw-l1'), $('#kw-res'));
  $('#kw-path').setAttribute('d', `M 128 ${y1} C 18 ${y1 + 60}, 18 ${y2 - 60}, 128 ${y2}`);
  const pathLen = $('#kw-path').getTotalLength();
  $('#kw-path').style.strokeDasharray = pathLen; $('#kw-path').style.strokeDashoffset = pathLen;
  $('#kw-sweep').style.top = $('#kw-r1').offsetTop + 'px';
  show('#kw-job', tAnd, { y: 60, scale: 0.95 }, 0.5, 'expo.out');
  tl.fromTo('#kw-sweep', { autoAlpha: 0, y: 168 }, { autoAlpha: 1, y: 168, duration: 0.15, immediateRender: false }, tPick - 0.1)
    .fromTo('#kw-sweep', { y: 168 }, { y: 0, duration: tSkill - tPick + 0.05, ease: 'expo.inOut', immediateRender: false }, tPick);
  OM.sfx('whoosh', tPick, { gain: 0.35 }); OM.sfx('tick', tSkill, { gain: 0.45 });
  tl.fromTo('#kw-r1', { backgroundColor: '#14532d00' }, { backgroundColor: '#14532d99', duration: 0.25, immediateRender: false }, tData)
    .fromTo('#kw-sweep', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2, immediateRender: false }, tData);
  show('#kw-r1t', tData); OM.sfx('ding', tData + 0.05, { gain: 0.5 });
  show('#kw-res', tResume2 - 0.25, { y: 120, scale: 0.95 }, 0.45, 'expo.out'); OM.sfx('paper', tResume2, { gain: 0.55 });
  [[1, tGood], [2, tWith], [3, tNumbers]].forEach(([n, t]) => { tl.fromTo(`#kw-w${n}`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.14, immediateRender: false }, t); OM.sfx('tick', t, { gain: 0.3 }); });
  tl.fromTo('#kw-l1', { backgroundColor: '#7f1d1d00' }, { backgroundColor: '#7f1d1d99', duration: 0.25, immediateRender: false }, tNumbers + 0.3);
  show('#kw-l1x', tNumbers + 0.35); OM.sfx('pop', tNumbers + 0.4, { gain: 0.4, note: -3 });
  tl.fromTo('#kw-path', { strokeDashoffset: pathLen }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut', immediateRender: false }, tThen);
  OM.sfx('draw', tThen, { dur: 0.45, gain: 0.35 });
  show('#kw-ring', tThen + 0.4); OM.sfx('thud', tThen + 0.45, { gain: 0.45 });
  slam('#kw-stamp', tRejected); shake('#kw-res', tRejected + 0.02);

  // row 13 · "And the fix number 2" → full-screen FIX 02, landing on "fix"
  const tFix2 = W('fix', 2) ?? 22.19, tIs = W('is', 4) ?? 22.96;
  panel('panel-fix2', 21.82, tIs - 0.04, 'full', `
    <div class="bigfix"><div class="no">FIX</div><div class="n" id="f2-n">02</div><div class="rule" id="f2-rule"></div></div>`);
  tl.set('#panel-keywords', { autoAlpha: 0 }, 22.15).set('#talkwrap', { y: 0 }, 22.15);
  tl.fromTo('#f2-n', { autoAlpha: 0, scale: 1.6, y: 30 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: 'power4.in', immediateRender: false }, tFix2 - 0.3)
    .fromTo('#f2-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out', immediateRender: false }, tFix2);
  OM.sfx('impact', tFix2, { gain: 0.6 });

  // rows 14–18 · "is add numbers" (half title) → before / after on the experience card
  const tAdd = W('add', 1) ?? 23.49, tSay = W('say') ?? 25.36, tDid = W('did') ?? 25.98, tNum = W('number', 3) ?? 27.16, tChanged = W('changed') ?? 28.21;
  const tAnd5 = W('and', 5) ?? 30.12;
  panel('panel-numbers', tIs - 0.04, tAnd5 - 0.05, 'split', `
    <div class="hdr" style="top:48px"><span class="bigt hid" id="nm-h">Add numbers</span></div>
    <div class="doc hid" id="nm-doc" style="left:70px;top:220px;width:940px;height:760px">
      <div class="ch"><div class="ic">${SVG.brief}</div><div class="ct">Experience</div></div>
      <div class="row" id="nm-before"><span class="lab red">Before</span><div class="bt">Managed social media.</div><div class="note hid" id="nm-note">Only says what you did</div></div>
      <div class="arrow hid" id="nm-arrow">↓</div>
      <div class="row hid" id="nm-after"><span class="lab green">After</span><div class="bt">Grew followers by <span class="slot" id="nm-s1">X%</span></div></div>
      <div style="position:absolute;left:40px;bottom:36px">${pill('green', 'check', 'Shows the change you made', 'id="nm-impact"')}</div></div>`, { talkOut: false });
  tl.fromTo('#nm-h', { autoAlpha: 0, scale: 1.3 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, tAdd - 0.12);
  OM.sfx('pop', tAdd, { gain: 0.55 });
  show('#nm-doc', tSay - 0.2, { y: 70, scale: 0.95 }, 0.42, 'expo.out'); OM.sfx('tick', tSay, { gain: 0.45 });
  show('#nm-note', tDid, { x: -20, scale: 1 }, 0.3, 'expo.out');
  show('#nm-arrow', tNum - 0.35, { y: -20, scale: 1 }, 0.3, 'expo.out');
  show('#nm-after', tNum - 0.2, { y: 30, scale: 0.96 }, 0.35, 'expo.out'); OM.sfx('pop', tNum, { gain: 0.5, note: 2 });
  tl.fromTo('#nm-s1', { boxShadow: '0 0 0 0 #2563eb00', scale: 1 }, { boxShadow: '0 0 0 12px #2563eb33', scale: 1.08, duration: 0.35, yoyo: true, repeat: 1, immediateRender: false }, tChanged);
  show('#nm-impact', tChanged); OM.sfx('ding', tChanged + 0.05, { gain: 0.5, note: 5 });

  // rows 19–20 · "and recruiter would stop scrolling" → the feed whips and stops on "stop"; "this" pulses the number
  const N = 9, HIT = 6, FH = [196, 238, 212, 254, 188, 228, 200, 240, 214];
  const HIT_Y = FH.slice(0, HIT).reduce((a, h) => a + h + 26, 0);
  const tStop = W('stop') ?? 31.49, tThis = W('this') ?? 33.41, tSkip = W('skip') ?? 34.36;
  panel('panel-feed', tAnd5 - 0.05, tSkip - 0.5, 'full', `
    <div class="feedlbl">Recruiter's feed</div>
    <div class="feedwin"><div class="feedmask"><div class="feed" id="fd">${Array.from({ length: N }, (_, i) => i === HIT
      ? `<div class="fc hit" style="height:200px"><div class="av"></div><div>${bars([46], 'dark')}<div class="bt">Grew followers by <span class="slot" id="fd-slot">X%</span></div></div></div>`
      : `<div class="fc" style="height:${FH[i]}px"><div class="av"></div><div>${bars([40 + (i * 23) % 35], 'dark')}${bars([85 - (i * 17) % 30, 60 - (i * 11) % 25].slice(0, FH[i] > 215 ? 2 : 1))}</div></div>`).join('')}</div></div>
      <div class="hitring hid" id="fd-ring" style="top:450px"></div></div>`);
  tl.set('#panel-numbers', { autoAlpha: 0 }, tAnd5 + 0.3);
  tl.fromTo('#fd', { y: 0, filter: 'blur(20px)' }, { y: 460 - HIT_Y, filter: 'blur(0px)', duration: tStop - tAnd5, ease: 'power2.inOut', immediateRender: false }, tAnd5);
  OM.sfx('whoosh', tAnd5, { gain: 0.6 });
  show('#fd-ring', tStop, { scale: 1.12 }, 0.35, 'expo.out'); OM.sfx('thud', tStop, { gain: 0.65 });
  tl.fromTo('#fd-slot', { scale: 1 }, { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, tThis);
  OM.sfx('pop', tThis, { gain: 0.5, note: 4 });

  // rows 21–26 · FIX 03 label on "skip" → fancy template on "fancy" → icons / table / 2-column → confuses → 1 column, clear heading, normal font
  const tFancy = W('fancy') ?? 35.25, tIcon = W('icon') ?? 36.64, tTable = W('table') ?? 37.11, tCol = W('2-column') ?? 38.25, tConf = W('confuses') ?? 38.7;
  const tOne = W('column') ?? 40.93, tClear = W('clear') ?? 42.36, tNormal = W('normal') ?? 44.0, tThis2 = W('this', 2) ?? 45.02;
  panel('panel-template', tSkip - 0.5, tThis2, 'split', `
    <div style="position:absolute;left:110px;top:34px"><span class="fixtag hid" id="sp-fix">FIX 03</span></div>
    <div style="position:absolute;right:110px;top:40px">${pill('red', 'cross', 'Fancy template', 'id="sp-x"')}</div>
    <div class="doc fancy hid" id="sp-fancy" style="left:110px;top:130px;width:860px;height:810px">
      <div class="side" id="sp-side"><div class="av"></div>${bars([82, 58], 'w')}
        <div class="icons" id="sp-icons"><span>${SVG.phone}</span><span>${SVG.mail}</span><span>${SVG.pin}</span></div>
        ${[86, 64, 74].map((w) => `${bars([45], 'w')}<div class="meter"><b style="width:${w}%"></b></div>`).join('')}</div>
      <div class="main" id="sp-main"><div class="mh">ABOUT ME</div>${bars([92, 84, 66])}<div class="mh">EXPERIENCE</div>
        <div class="tbl" id="sp-tbl">${'<div></div>'.repeat(9)}</div>${bars([88, 72, 80])}</div></div>
    <div class="doc clean hid" id="sp-clean" style="left:110px;top:130px;width:860px;height:810px">
      <div class="cn">Your Name</div>${bars([44])}
      <div class="hd">EXPERIENCE</div>${bars([94, 86, 72])}<div class="hd">SKILLS</div>${bars([80, 64])}<div class="hd">EDUCATION</div>${bars([70])}</div>
    <div class="hdr" style="top:922px">${pill('red', 'cross', 'ATS can’t read it', 'id="sp-ats"')}</div>
    <div class="chips" style="top:922px">${pill('green', 'check', '1 column', 'id="sp-c1"')}${pill('green', 'check', 'Clear headings', 'id="sp-c2"')}${pill('green', 'check', 'Normal font', 'id="sp-c3"')}</div>`,
    { talkIn: false, talkOut: false });
  tl.fromTo('#talkwrap', { y: TALK_Y }, { y: TALK_Y, duration: 0.01, immediateRender: false }, tSkip - 0.5);
  show('#sp-fix', tSkip, { x: -30, scale: 1 }, 0.35, 'expo.out'); OM.sfx('impact', tSkip, { gain: 0.4 });
  show('#sp-fancy', tFancy - 0.2, { y: 60, scale: 0.94, rotation: 3 }, 0.4, 'expo.out');
  show('#sp-x', tFancy + 0.3); OM.sfx('pop', tFancy + 0.35, { gain: 0.45, note: -2 });
  tl.fromTo('#sp-icons span', { autoAlpha: 1, scale: 1, rotation: 0, y: 0 }, { autoAlpha: 0, scale: 0.2, rotation: 90, y: -60, duration: 0.3, stagger: 0.07, ease: 'back.in(2)', immediateRender: false }, tIcon);
  OM.sfx('whip', tIcon, { gain: 0.35 });
  tl.fromTo('#sp-tbl div', { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.4, duration: 0.28, stagger: { each: 0.025, from: 'random' }, immediateRender: false }, tTable);
  OM.sfx('glitch', tTable, { gain: 0.3 });
  tl.fromTo('#sp-side', { scaleX: 1 }, { scaleX: 0, duration: 0.4, ease: 'expo.inOut', immediateRender: false }, tCol)
    .fromTo('#sp-main', { x: 0 }, { x: -150, duration: 0.4, ease: 'expo.inOut', immediateRender: false }, tCol);
  OM.sfx('whoosh', tCol, { gain: 0.35 });
  show('#sp-ats', tConf); shake('#sp-fancy', tConf); OM.sfx('glitch', tConf, { gain: 0.45 });
  tl.fromTo(['#sp-fancy', '#sp-x', '#sp-ats'], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2, immediateRender: false }, tOne - 0.25);
  show('#sp-clean', tOne - 0.2, { scale: 0.94, y: 30 }, 0.35, 'expo.out'); show('#sp-c1', tOne); OM.sfx('ding', tOne, { gain: 0.5, note: 1 });
  tl.fromTo('#sp-clean .hd', { color: '#f3f5f9', borderBottomColor: '#ffffff1a' }, { color: '#7aa2ff', borderBottomColor: '#4f8bff', duration: 0.3, stagger: 0.08, immediateRender: false }, tClear);
  show('#sp-c2', tClear); OM.sfx('ding', tClear, { gain: 0.5, note: 3 });
  show('#sp-c3', tNormal); OM.sfx('ding', tNormal, { gain: 0.5, note: 5 });

  // rows 27–28 · "so fix these 3 things" ticks on "3" / "things"; "and watch your call goes up" draws the line to "up"
  const t3 = W('3', 1) ?? 47.36, tThings = W('things') ?? 47.58, tWatch = W('watch') ?? 48.31, tUp = W('up') ?? 49.52, tComment = W('comment') ?? 49.95;
  panel('panel-recap', tThis2, tComment - 0.05, 'split', `
    <div class="doc" id="rc-doc" style="left:110px;top:60px;width:860px;height:470px;padding:30px 44px">
      ${[['search', 'Right keywords'], ['chart', 'Add numbers'], ['layers', 'Simple layout']].map(([ic, t], i) =>
        `<div class="rrow"><div class="ic">${SVG[ic]}</div>${t}<span class="tk hid" id="rc-t${i}">${SVG.check}</span></div>`).join('')}</div>
    <div class="doc gdoc hid" id="rc-graph" style="left:110px;top:570px;width:860px;height:370px">
      <div class="ct">Callbacks</div>
      <svg viewBox="0 0 780 190"><path id="rc-line" d="M 6 182 C 180 178, 300 168, 420 128 S 640 30, 772 10" fill="none" stroke="#22c55e" stroke-width="10" stroke-linecap="round"/>
        <circle id="rc-dot" cx="772" cy="10" r="14" fill="#22c55e"/></svg></div>`, { talkIn: false });
  [t3, tThings, tThings + 0.24].forEach((t, i) => { show(`#rc-t${i}`, t); OM.sfx('ding', t, { gain: 0.45, note: i * 2 }); });
  show('#rc-graph', tWatch - 0.15, { y: 60, scale: 0.95 }, 0.4, 'expo.out');
  const lineLen = $('#rc-line').getTotalLength();
  $('#rc-line').style.strokeDasharray = lineLen; $('#rc-line').style.strokeDashoffset = lineLen;
  tl.fromTo('#rc-line', { strokeDashoffset: lineLen }, { strokeDashoffset: 0, duration: tUp - tWatch, ease: 'power2.in', immediateRender: false }, tWatch);
  tl.fromTo('#rc-dot', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, tUp);
  OM.sfx('riser', tWatch, { dur: tUp - tWatch, gain: 0.3 }); OM.sfx('sparkle', tUp, { gain: 0.5 });
