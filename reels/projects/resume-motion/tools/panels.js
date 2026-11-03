  // ---- motion graphics, built in code: each one shows what is being said, moving on the words --
  const panelsRoot = $('#panels');
  const SVG = {
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cross: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>',
    brief: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" fill="none" stroke="#2563eb" stroke-width="2.2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" fill="none" stroke="#2563eb" stroke-width="2.2"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="#2563eb" stroke-width="2.4"/><path d="M15 15l5 5" stroke="#2563eb" stroke-width="2.6" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M5 19V13M10 19V9M15 19V11M20 19V5" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 4l9 5-9 5-9-5z" fill="#2563eb"/><path d="M3 14l9 5 9-5" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z" fill="#fff"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M3.5 7l8.5 6 8.5-6" fill="none" stroke="#fff" stroke-width="2.2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z" fill="#fff"/><circle cx="12" cy="10" r="2.2" fill="#2563eb"/></svg>',
  };
  const bars = (ws, cls = '') => ws.map((w) => `<div class="bar ${cls}" style="width:${w}%"></div>`).join('');
  const pill = (cls, icon, text, extra = '') => `<span class="pill ${cls} hid" ${extra}><span class="pi">${SVG[icon]}</span>${text}</span>`;
  const PANELS = [];
  function panel(id, start, end, kind, html) {
    const el = document.createElement('div');
    el.className = `panel ${kind}`; el.id = id; el.dataset.omId = id; el.innerHTML = html;
    panelsRoot.appendChild(el);
    PANELS.push({ id, start, end, kind });
    tl.addLabel(`scene:${id}`, start);
    if (kind === 'split') {
      // the graphic drops in from the top; the talk slides under the seam, face first
      tl.fromTo(el, { autoAlpha: 1, yPercent: -101 }, { yPercent: 0, duration: 0.6, immediateRender: false }, start)
        .fromTo('#talkwrap', { y: 0, scale: 1 }, { y: SEAM - 380, scale: 0.8, duration: 0.6, ease: 'expo.inOut', immediateRender: false }, start - 0.05)
        .fromTo('.seam', { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: 0.5, immediateRender: false }, start + 0.2)
        .fromTo(el, { yPercent: 0 }, { yPercent: -101, duration: 0.45, ease: 'expo.in', immediateRender: false }, end - 0.45)
        .fromTo('#talkwrap', { y: SEAM - 380, scale: 0.8 }, { y: 0, scale: 1, duration: 0.5, ease: 'expo.inOut', immediateRender: false }, end - 0.42)
        .fromTo('.seam', { opacity: 1 }, { opacity: 0, duration: 0.2, immediateRender: false }, end - 0.3)
        .set(el, { autoAlpha: 0 }, end);
      OM.sfx('slide', start, { gain: 0.35, dur: 0.5 });
      OM.sfx('whip', end - 0.4, { gain: 0.35 });
    } else {
      tl.fromTo(el, { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1, duration: 0.4, immediateRender: false }, start)
        .fromTo(el, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, immediateRender: false }, end - 0.25);
    }
    return el;
  }
  const show = (sel, at, from = {}, dur = 0.45, ease = 'back.out(1.8)') =>
    tl.fromTo(sel, { autoAlpha: 0, scale: 0.7, ...from }, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: 0, duration: dur, ease, immediateRender: false }, at);
  const slam = (sel, at, rot = -12) => {
    tl.fromTo(sel, { autoAlpha: 0, scale: 2.3, rotation: rot }, { autoAlpha: 1, scale: 1, rotation: rot, duration: 0.26, ease: 'power4.in', immediateRender: false }, at);
    OM.sfx('stamp', at + 0.24, { gain: 0.7 });
  };
  const shake = (sel, at) => tl.fromTo(sel, { x: -14 }, { x: 0, duration: 0.45, ease: 'elastic.out(1.2, 0.3)', immediateRender: false }, at);
  const W = (w, n) => cue(w, n);

  // 1 · "it's not the job market, it's your resume": an ATS scan, then rejected
  panel('panel-scan', 4.38, 7.32, 'split', `
    <div class="doc" id="sc-doc" style="left:250px;top:110px;width:580px;height:820px">
      <div class="dh"><div class="av"></div><div>${bars([72, 46], 'dark')}</div></div>
      ${[0, 1, 2].map(() => `<div class="sec">${bars([34], 'dark')}${bars([94, 82, 88])}</div>`).join('')}
      <div class="scan" id="sc-line"></div>
      <div class="stamp hid" id="sc-stamp">REJECTED</div>
    </div>
    <div class="hdr" style="top:964px">${pill('blue', 'search', 'ATS scan', 'id="sc-tag" style="font-size:30px;padding:10px 26px 10px 12px"')}</div>`);
  show('#sc-doc', 4.45, { y: 80, scale: 0.92, rotation: -3 }, 0.55, 'expo.out');
  show('#sc-tag', 4.7);
  tl.fromTo('#sc-line', { opacity: 1, y: 0 }, { opacity: 1, y: 800, duration: 1.3, ease: 'power1.inOut', immediateRender: false }, 4.75)
    .fromTo('#sc-line', { opacity: 1 }, { opacity: 0, duration: 0.2, immediateRender: false }, 6.05);
  OM.sfx('riser', 4.8, { dur: 1.2, gain: 0.25 });
  const tResume = (W('resume') ?? 6.59);
  slam('#sc-stamp', tResume - 0.12);
  shake('#sc-doc', tResume + 0.14);

  // 2 · "use the right words… pick out the skill… data analysis… good with numbers… rejected"
  panel('panel-keywords', 9.02, 21.78, 'split', `
    <div class="doc" id="kw-job" style="left:70px;top:64px;width:940px;height:430px">
      <div class="ch"><div class="ic">${SVG.brief}</div><div class="ct">Job post</div><div class="cs">Requirements</div></div>
      <div class="req" id="kw-r1"><i></i><span>Data analysis</span><span class="tk hid" id="kw-r1t">${SVG.check}</span></div>
      <div class="req"><i></i>${bars([56])}</div>
      <div class="req"><i></i>${bars([38])}</div>
      <div class="sweep hid" id="kw-sweep"></div>
    </div>
    <div class="doc hid" id="kw-res" style="left:70px;top:540px;width:940px;height:420px">
      <div class="ch"><div class="av sm"></div><div class="ct">Your resume</div></div>
      <div class="req" id="kw-l1"><i></i><span id="kw-typed">${[...'Good with numbers'].map((c) => `<span class="ch1">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span><span class="xk hid" id="kw-l1x">${SVG.cross}</span></div>
      <div class="req"><i></i>${bars([48])}</div>
      <div class="req"><i></i>${bars([30])}</div>
      <div class="stamp hid" id="kw-stamp">REJECTED</div>
    </div>
    <svg class="ch-l" id="kw-link" width="1080" height="1150"><path id="kw-path" d="" fill="none" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/></svg>
    <div class="ring hid" id="kw-ring" style="right:110px;top:600px"><svg viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="#fde2e2" stroke-width="14"/></svg><b>0%</b><small>Keyword match</small></div>`);
  // rows have fixed heights, so their centres are known before fonts load
  const rowY = (row, doc) => doc.offsetTop + row.offsetTop + row.offsetHeight / 2;
  const y1 = rowY($('#kw-r1'), $('#kw-job')), y2 = rowY($('#kw-l1'), $('#kw-res'));
  $('#kw-path').setAttribute('d', `M 128 ${y1} C 18 ${y1 + 60}, 18 ${y2 - 60}, 128 ${y2}`);
  const pathLen = $('#kw-path').getTotalLength();
  $('#kw-path').style.strokeDasharray = pathLen; $('#kw-path').style.strokeDashoffset = pathLen;
  $('#kw-sweep').style.top = $('#kw-r1').offsetTop + 'px';
  show('#kw-job', 9.1, { y: 60, scale: 0.95 }, 0.55, 'expo.out');
  const tRight = W('right') ?? 9.57, tSkill = W('skill') ?? 12.86, tData = W('data') ?? 14.68, tYour = W('your', 2) ?? 16.16;
  const tGood = W('good') ?? 19.03, tRejected = W('rejected') ?? 21.14;
  tl.fromTo('#kw-sweep', { autoAlpha: 0, y: 168 }, { autoAlpha: 1, y: 168, duration: 0.2, immediateRender: false }, tRight - 0.05)
    .fromTo('#kw-sweep', { y: 168 }, { y: 0, duration: 0.9, ease: 'expo.inOut', immediateRender: false }, tSkill - 0.6);
  OM.sfx('whoosh', tSkill - 0.4, { gain: 0.35 });
  tl.fromTo('#kw-r1', { backgroundColor: '#dcfce700' }, { backgroundColor: '#dcfce7', duration: 0.3, immediateRender: false }, tData)
    .fromTo('#kw-sweep', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, immediateRender: false }, tData);
  show('#kw-r1t', tData + 0.1); OM.sfx('ding', tData + 0.15, { gain: 0.5 });
  show('#kw-res', tYour - 0.1, { y: 120, scale: 0.95 }, 0.6, 'expo.out'); OM.sfx('paper', tYour + 0.2, { gain: 0.55 });
  tl.fromTo('#kw-typed .ch1', { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 0.045, immediateRender: false }, tGood);
  OM.sfx('type', tGood, { dur: 0.75, gain: 0.35 });
  tl.fromTo('#kw-l1', { backgroundColor: '#fee2e200' }, { backgroundColor: '#fee2e2', duration: 0.3, immediateRender: false }, tGood + 0.8);
  show('#kw-l1x', tGood + 0.85); OM.sfx('pop', tGood + 0.9, { gain: 0.4, note: -3 });
  tl.fromTo('#kw-path', { strokeDashoffset: pathLen }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut', immediateRender: false }, tGood + 1.0);
  OM.sfx('draw', tGood + 1.0, { dur: 0.5, gain: 0.35 });
  show('#kw-ring', tGood + 1.4); OM.sfx('thud', tGood + 1.5, { gain: 0.45 });
  slam('#kw-stamp', tRejected - 0.1);
  shake('#kw-res', tRejected + 0.16);

  // 3 · "add numbers — don't just say what you did — add the numbers for what you changed"
  panel('panel-numbers', 23.34, 29.95, 'split', `
    <div class="hdr" style="top:58px"><span class="pill blue hid" id="nm-h">Add numbers</span></div>
    <div class="doc" id="nm-doc" style="left:70px;top:176px;width:940px;height:800px">
      <div class="ch"><div class="ic">${SVG.brief}</div><div class="ct">Experience</div></div>
      <div class="row hid" id="nm-before"><span class="lab red">Before</span><div class="bt">Managed social media.</div><div class="note hid" id="nm-note">Only says what you did</div></div>
      <div class="arrow hid" id="nm-arrow">↓</div>
      <div class="row hid" id="nm-after"><span class="lab green">After</span>
        <div class="bt">Grew followers by <span class="slot hid" id="nm-s1">X%</span> in <span class="slot hid" id="nm-s2">N months</span></div></div>
    </div>
    <div class="hdr" style="top:1000px">${pill('green', 'check', 'Shows the change you made', 'id="nm-impact"')}</div>`);
  const tAdd = W('add', 1) ?? 23.49, tDont = W("don't") ?? 24.67, tSay = W('say') ?? 25.36, tNum = W('number', 5) ?? 27.16, tChanged = W('changed') ?? 28.21;
  show('#nm-h', tAdd - 0.05); OM.sfx('pop', tAdd, { gain: 0.5 });
  show('#nm-doc', 23.45, { y: 60, scale: 0.95 }, 0.55, 'expo.out');
  show('#nm-before', tDont - 0.1, { y: 30, scale: 0.96 }, 0.45, 'expo.out'); OM.sfx('tick', tDont, { gain: 0.4 });
  show('#nm-note', tSay + 0.1, { x: -20, scale: 1 }, 0.35, 'expo.out');
  show('#nm-arrow', tNum - 0.5, { y: -20, scale: 1 }, 0.35, 'expo.out');
  show('#nm-after', tNum - 0.3, { y: 30, scale: 0.96 }, 0.45, 'expo.out'); OM.sfx('whoosh', tNum - 0.35, { gain: 0.3 });
  show('#nm-s1', tNum + 0.05, { scale: 0.4 }); show('#nm-s2', tNum + 0.3, { scale: 0.4 });
  OM.sfx('pop', tNum + 0.1, { gain: 0.5, note: 2 }); OM.sfx('pop', tNum + 0.35, { gain: 0.5, note: 4 });
  tl.fromTo('#nm-after .slot', { boxShadow: '0 0 0 0 #2563eb00' }, { boxShadow: '0 0 0 10px #2563eb33', duration: 0.5, yoyo: true, repeat: 1, immediateRender: false }, tChanged - 0.1);
  show('#nm-impact', tChanged + 0.05); OM.sfx('ding', tChanged + 0.1, { gain: 0.5, note: 5 });

  // 4 · "recruiters will stop scrolling": the feed whips past and stops on the resume with numbers
  const N = 13, HIT = 10, STEP = 226;
  panel('panel-feed', 30.13, 33.7, 'full', `
    <div class="feedlbl">Recruiter's feed</div>
    <div class="feedwin"><div class="feedmask"><div class="feed" id="fd">${Array.from({ length: N }, (_, i) => i === HIT
      ? `<div class="fc hit"><div class="av"></div><div>${bars([46], 'dark')}<div class="bt">Grew followers by <span class="slot">X%</span></div></div></div>`
      : `<div class="fc"><div class="av"></div><div>${bars([40 + (i * 23) % 35], 'dark')}${bars([85 - (i * 17) % 30, 60 - (i * 11) % 25])}</div></div>`).join('')}</div></div>
      <div class="hitring hid" id="fd-ring" style="top:${460 - 10}px"></div></div>`);
  const tStop = (W('scrolling') ?? 31.93) - 0.15;
  tl.fromTo('#fd', { y: 0, filter: 'blur(12px)' }, { y: 460 - HIT * STEP, filter: 'blur(0px)', duration: tStop - 30.2, ease: 'power4.out', immediateRender: false }, 30.2);
  OM.sfx('whoosh', 30.2, { gain: 0.6 });
  show('#fd-ring', tStop - 0.05, { scale: 1.15 }, 0.4, 'expo.out');
  OM.sfx('thud', tStop, { gain: 0.65 });

  // 5 · "skip the fancy template — icons, tables, 2 columns confuse recruiters — 1 column, clear headings, normal font"
  panel('panel-template', 35.15, 45.0, 'split', `
    <div class="doc fancy" id="sp-fancy" style="left:110px;top:96px;width:860px;height:840px">
      <div class="side" id="sp-side"><div class="av"></div>${bars([82, 58], 'w')}
        <div class="icons" id="sp-icons"><span>${SVG.phone}</span><span>${SVG.mail}</span><span>${SVG.pin}</span></div>
        ${[86, 64, 74].map((w) => `${bars([45], 'w')}<div class="meter"><b style="width:${w}%"></b></div>`).join('')}</div>
      <div class="main" id="sp-main"><div class="mh">ABOUT ME</div>${bars([92, 84, 66])}<div class="mh">EXPERIENCE</div>
        <div class="tbl" id="sp-tbl">${'<div></div>'.repeat(9)}</div>${bars([88, 72, 80])}</div>
    </div>
    <div class="doc clean hid" id="sp-clean" style="left:110px;top:96px;width:860px;height:840px">
      <div class="cn">Your Name</div>${bars([44])}
      <div class="hd" id="sp-h1">EXPERIENCE</div>${bars([94, 86, 72])}
      <div class="hd" id="sp-h2">SKILLS</div>${bars([80, 64])}
      <div class="hd" id="sp-h3">EDUCATION</div>${bars([70])}
    </div>
    <div style="position:absolute;right:70px;top:36px">${pill('red', 'cross', 'Fancy template', 'id="sp-x"')}</div>
    <div class="hdr" style="top:958px">${pill('red', 'cross', 'ATS can’t read it', 'id="sp-ats"')}</div>
    <div class="chips" style="top:958px">${pill('green', 'check', '1 column', 'id="sp-c1"')}${pill('green', 'check', 'Clear headings', 'id="sp-c2"')}${pill('green', 'check', 'Normal font', 'id="sp-c3"')}</div>`);
  const tTpl = W('template') ?? 35.8, tIcon = W('icon') ?? 36.64, tTable = W('table') ?? 37.11, tCol = W('2-column') ?? 38.25, tConf = W('confuses') ?? 38.7;
  const tOne = W('column', 2) ?? 40.93, tClear = W('clear') ?? 42.36, tNormal = W('normal') ?? 44.0;
  show('#sp-fancy', 35.2, { y: 70, scale: 0.93, rotation: 3 }, 0.6, 'expo.out');
  show('#sp-x', tTpl - 0.1); OM.sfx('pop', tTpl, { gain: 0.45, note: -2 });
  tl.fromTo('#sp-icons span', { autoAlpha: 1, scale: 1, rotation: 0, y: 0 }, { autoAlpha: 0, scale: 0.2, rotation: 90, y: -60, duration: 0.35, stagger: 0.09, ease: 'back.in(2)', immediateRender: false }, tIcon - 0.05);
  OM.sfx('whip', tIcon, { gain: 0.35 });
  tl.fromTo('#sp-tbl div', { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.4, duration: 0.3, stagger: { each: 0.03, from: 'random' }, immediateRender: false }, tTable - 0.05);
  OM.sfx('glitch', tTable, { gain: 0.3 });
  tl.fromTo('#sp-side', { scaleX: 1 }, { scaleX: 0, duration: 0.5, ease: 'expo.inOut', immediateRender: false }, tCol - 0.1)
    .fromTo('#sp-main', { x: 0 }, { x: -150, duration: 0.5, ease: 'expo.inOut', immediateRender: false }, tCol - 0.1);
  OM.sfx('whoosh', tCol - 0.1, { gain: 0.35 });
  show('#sp-ats', tConf); shake('#sp-fancy', tConf + 0.05); OM.sfx('glitch', tConf + 0.05, { gain: 0.45 });
  const tSwap = W('just', 3) ?? 40.08;
  tl.fromTo(['#sp-fancy', '#sp-x', '#sp-ats'], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3, immediateRender: false }, tSwap - 0.15);
  show('#sp-clean', tSwap, { scale: 0.94, y: 30 }, 0.55, 'expo.out'); OM.sfx('chime', tSwap + 0.1, { gain: 0.4 });
  show('#sp-c1', tOne - 0.15); OM.sfx('ding', tOne - 0.1, { gain: 0.45, note: 1 });
  show('#sp-c2', tClear - 0.1); OM.sfx('ding', tClear - 0.05, { gain: 0.45, note: 3 });
  tl.fromTo('#sp-clean .hd', { color: '#0f1115', borderBottomColor: '#e5e9f0' }, { color: '#2563eb', borderBottomColor: '#2563eb', duration: 0.4, stagger: 0.12, immediateRender: false }, tClear);
  show('#sp-c3', tNormal - 0.1); OM.sfx('ding', tNormal - 0.05, { gain: 0.45, note: 5 });

  // 6 · "fix these 3 things and watch your calls go up"
  panel('panel-recap', 47.81, 51.03, 'split', `
    <div class="doc" id="rc-doc" style="left:110px;top:70px;width:860px;height:470px;padding:30px 44px">
      ${[['search', 'Right keywords'], ['chart', 'Add numbers'], ['layers', 'Simple layout']].map(([ic, t], i) =>
        `<div class="rrow"><div class="ic">${SVG[ic]}</div>${t}<span class="tk hid" id="rc-t${i}">${SVG.check}</span></div>`).join('')}
    </div>
    <div class="doc gdoc hid" id="rc-graph" style="left:110px;top:580px;width:860px;height:370px">
      <div class="ct">Callbacks</div>
      <svg viewBox="0 0 780 190"><path id="rc-line" d="M 6 182 C 180 178, 300 168, 420 128 S 640 30, 772 10" fill="none" stroke="#22c55e" stroke-width="10" stroke-linecap="round"/>
        <circle id="rc-dot" cx="772" cy="10" r="14" fill="#22c55e"/></svg>
    </div>`);
  const tWatch = W('watch') ?? 48.31, tUp = W('up') ?? 49.52;
  show('#rc-doc', 47.86, { y: 60, scale: 0.95 }, 0.55, 'expo.out');
  [0, 1, 2].forEach((i) => { show(`#rc-t${i}`, 48.0 + i * 0.22); OM.sfx('ding', 48.05 + i * 0.22, { gain: 0.45, note: i * 2 }); });
  show('#rc-graph', tWatch - 0.1, { y: 60, scale: 0.95 }, 0.5, 'expo.out');
  const lineLen = $('#rc-line').getTotalLength();
  $('#rc-line').style.strokeDasharray = lineLen; $('#rc-line').style.strokeDashoffset = lineLen;
  tl.fromTo('#rc-line', { strokeDashoffset: lineLen }, { strokeDashoffset: 0, duration: tUp - tWatch, ease: 'power2.in', immediateRender: false }, tWatch + 0.2);
  tl.fromTo('#rc-dot', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.4, ease: 'back.out(3)', immediateRender: false }, tUp + 0.15);
  OM.sfx('riser', tWatch + 0.2, { dur: tUp - tWatch, gain: 0.3 });
  OM.sfx('sparkle', tUp + 0.2, { gain: 0.5 });
