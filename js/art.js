/* Vividham — line-illustration system + motion.
   One visual language: 48×48 monoline drawings, 1.75 stroke, round caps, ink line with a
   single gold "sequin" accent. Every drawing can "draw itself" (class .draw) for motion.
   Polished raster/Lottie versions of these are specified in design/prompts/*.json. */
(function (V) {
  const G = {}; // name → inner svg (48×48)
  const dot = (x, y, r = 1.6) => `<circle class="sq" cx="${x}" cy="${y}" r="${r}"/>`;

  /* ---------- pieces & accessories ---------- */
  G.costume = '<path d="M18 6c2 3 4 4 6 4s4-1 6-4l6 4-3 7-3-2v6l6 20H12l6-20v-6l-3 2-3-7z"/>' + dot(24, 22) + dot(20, 32) + dot(28, 32);
  G.skirt = '<path d="M17 8h14l2 7H15z"/><path d="M15 15 7 40c6 3 28 3 34 0L33 15"/><path d="M19 16l-4 25M24 16v26M29 16l4 25"/>' + dot(24, 11);
  G.top = '<path d="M16 8l-8 6 3 8 4-2v18h18V20l4 2 3-8-8-6c-1 3-3 5-8 5s-7-2-8-5z"/>' + dot(24, 26);
  G.trousers = '<path d="M15 6h18l3 36h-8l-4-24-4 24h-8z"/><path d="M15 11h18"/>' + dot(24, 8.5, 1.2);
  G.dupatta = '<path d="M10 8c10 2 18 2 28 0-2 10 0 20 4 32-12 2-22 2-34 0 4-12 6-22 2-32z"/><path d="M8 40l-1 3M14 41l-1 3M20 41v3M26 41v3M32 41l1 3M38 40l1 3"/>' + dot(24, 24);
  G.necklace = '<path d="M12 8c0 12 5 20 12 20s12-8 12-20"/><path d="M16 9c0 8 3 13 8 13s8-5 8-13"/><path d="M24 28v4"/><path d="M20 32h8l-4 8z"/>' + dot(24, 35, 1.4);
  G.jhumka = '<path d="M24 6v6"/><circle cx="24" cy="14" r="3"/><path d="M14 30c0-8 4-13 10-13s10 5 10 13z"/><path d="M15 34v3M20 35v4M24 35v5M28 35v4M33 34v3"/>' + dot(24, 24);
  G.mala = '<path d="M10 8c0 18 6 30 14 30S38 26 38 8"/><path d="M15 8c0 13 4 22 9 22s9-9 9-22"/>' + dot(24, 38, 2) + dot(17, 30) + dot(31, 30);
  G.belt = '<path d="M6 20c12 4 24 4 36 0v8c-12 4-24 4-36 0z"/><circle cx="24" cy="25" r="4"/><path d="M14 23v6M34 23v6"/>' + dot(24, 25, 1.4);
  G.headset = '<path d="M10 22c2-10 8-15 14-15s12 5 14 15"/><path d="M24 7v10"/><circle cx="24" cy="20" r="3"/><path d="M12 22l-2 8M36 22l2 8"/>' + dot(24, 20, 1.2) + dot(10, 31) + dot(38, 31);
  G.crown = '<path d="M10 36h28l2-20-8 6-8-12-8 12-8-6z"/><path d="M12 31h24"/><path d="M24 10c3-6 9-6 12-2-4 0-6 2-7 5"/>' + dot(24, 26) + dot(16, 27) + dot(32, 27);
  G.kireeta = '<path d="M12 38h24l-2-14-10-18-10 18z"/><path d="M14 30h20M17 22h14"/><path d="M8 38c0-6 2-10 4-12M40 38c0-6-2-10-4-12"/>' + dot(24, 15) + dot(24, 26);
  G.turban = '<path d="M9 30c0-10 7-17 15-17s15 7 15 17z"/><path d="M11 24c8-6 18-7 26 0M13 19c8 3 16 3 22-2"/><path d="M39 28c3 4 4 9 2 14"/>' + dot(24, 16, 1.4);
  G.cap = '<path d="M9 30c1-9 7-15 15-15s14 6 15 15z"/><path d="M7 30h34"/><path d="M24 15v15"/>' + dot(24, 22, 1.2);
  G.flower = '<path d="M8 30c6-10 26-10 32 0"/>' + [10, 16, 22, 28, 34, 40].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 22 : 26}" r="3"/>`).join('') + dot(24, 30);
  G.ghungroo = '<path d="M8 18c6-4 26-4 32 0v8c-6 4-26 4-32 0z"/>' + [12, 18, 24, 30, 36].map(x => `<circle cx="${x}" cy="31" r="3"/>`).join('') + '<path d="M8 22c-3 0-4 4-2 6"/>' + dot(24, 21.5, 1.2);
  G.bangles = '<ellipse cx="24" cy="18" rx="14" ry="5"/><ellipse cx="24" cy="24" rx="14" ry="5"/><ellipse cx="24" cy="30" rx="14" ry="5"/>' + dot(38, 24);
  G.armlet = '<path d="M8 24c6-8 26-8 32 0-6 8-26 8-32 0z"/><path d="M24 14l5 6-5 8-5-8z"/>' + dot(24, 21);
  G.flute = '<path d="M6 34 40 12"/><path d="M8 36l-2-3 34-22 2 3z"/><circle cx="20" cy="26" r="1"/><circle cx="25" cy="23" r="1"/><circle cx="30" cy="20" r="1"/><path d="M36 13c2 6 0 10-3 13"/>' + dot(33, 27);
  G.pot = '<path d="M14 12h20"/><path d="M16 12c-6 6-8 12-6 18 2 7 8 10 14 10s12-3 14-10c2-6 0-12-6-18"/><path d="M11 26h26"/>' + dot(18, 32) + dot(24, 33) + dot(30, 32);
  G.sticks = '<path d="M10 40 34 8M16 42 40 10"/><path d="M14 35l4 3M20 27l4 3M26 19l4 3"/>' + dot(34, 8) + dot(40, 10);
  G.sword = '<path d="M10 38 36 12l4-2-2 4-26 26"/><path d="M12 30l6 6"/><path d="M8 40l-2 2"/><circle cx="34" cy="34" r="8"/>' + dot(34, 34, 2);
  G.mace = '<path d="M14 40 28 22"/><circle cx="32" cy="16" r="8"/><path d="M26 12h12M32 8v16"/><path d="M12 42l4-4"/>' + dot(32, 16, 1.6);
  G.bow = '<path d="M14 6c14 6 14 30 0 36"/><path d="M14 6v36"/><path d="M6 24h34l-4-3M40 24l-4 3"/>' + dot(14, 24);
  G.trishul = '<path d="M24 44V10"/><path d="M14 8c0 8 4 12 10 12s10-4 10-12"/><path d="M24 4v6"/><path d="M18 30c-4 2-4 6 0 8M30 30c4 2 4 6 0 8"/><path d="M18 30h12M18 38h12"/>' + dot(24, 6);
  G.flag = '<path d="M12 44V6"/><path d="M12 8h26v8H12M12 16h26v8H12"/><circle cx="25" cy="16" r="2.5"/>' + dot(12, 6, 2);
  G.stick = '<path d="M30 6c-6 0-6 6 0 6v32"/><circle cx="14" cy="22" r="4"/><circle cx="24" cy="22" r="4"/><path d="M18 22h2"/>' + dot(30, 44, 1.4);
  G.chakra = '<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="4"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return `<path d="M${(24 + 4 * Math.cos(r)).toFixed(1)} ${(24 + 4 * Math.sin(r)).toFixed(1)}L${(24 + 14 * Math.cos(r)).toFixed(1)} ${(24 + 14 * Math.sin(r)).toFixed(1)}"/>`; }).join('') + dot(24, 24, 1.4);
  G.wings = '<path d="M24 16C16 6 6 8 4 16c4 2 8 2 10 0-2 6 0 12 10 14"/><path d="M24 16c8-10 18-8 20 0-4 2-8 2-10 0 2 6 0 12-10 14"/><path d="M24 16v18"/>' + dot(10, 12) + dot(38, 12);
  G.shoe = '<path d="M6 30c8 0 12-6 14-10 4 2 8 4 16 4 4 0 6 4 6 8H6z"/><path d="M6 36h36"/><path d="M40 26c3-2 3-6 0-8"/>' + dot(26, 26);

  /* ---------- categories ---------- */
  G['cat-classical'] = '<circle cx="24" cy="8" r="3.5"/><path d="M24 12v12"/><path d="M8 16l16 2 16-2"/><path d="M24 24l-12 6-4 10M24 24l12 6 4 10"/><path d="M18 28l6 8 6-8"/>' + dot(24, 18) + dot(8, 16) + dot(40, 16);
  G['cat-navratri'] = G.sticks;
  G['cat-krishna'] = '<path d="M24 44c0-14 2-26 0-36"/><path d="M24 8c-10 6-12 16-6 22 4 4 8 2 6-4"/><ellipse cx="24" cy="18" rx="5" ry="7"/><circle cx="24" cy="18" r="2"/>' + dot(24, 18, 1.4);
  G['cat-crown'] = G.crown;
  G['cat-states'] = '<path d="M14 8l8 2 6-2 4 6 6 2-2 8 4 4-8 6-4 10-6-6-4 2-2-10-6-6 4-6z"/><circle cx="22" cy="24" r="3"/>' + dot(22, 24, 1.2);
  G['cat-flag'] = G.flag;
  G['cat-mask'] = '<path d="M8 12c10-4 22-4 32 0 0 14-6 24-16 26C14 36 8 26 8 12z"/><path d="M14 20c2-2 6-2 8 0M26 20c2-2 6-2 8 0"/><path d="M18 28c4 4 8 4 12 0"/>' + dot(14, 30) + dot(34, 30);
  G['cat-star'] = '<path d="M24 6l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>' + dot(24, 24, 2);
  G['cat-disco'] = '<circle cx="24" cy="26" r="14"/><path d="M10 26h28M24 12v28M14 16c6 6 14 6 20 0M14 36c6-6 14-6 20 0"/><path d="M24 12V4"/>' + dot(31, 19, 1.4) + dot(17, 33, 1.4);
  G['cat-lehenga'] = '<path d="M18 6h12l1 8H17z"/><path d="M17 14 6 42h36L31 14"/><path d="M6 42c6-3 30-3 36 0"/><path d="M12 34c8 2 16 2 24 0"/>' + dot(24, 10) + dot(15, 38) + dot(33, 38);
  G['cat-jhumka'] = G.jhumka;
  G.all = '<rect x="8" y="8" width="13" height="13" rx="3"/><rect x="27" y="8" width="13" height="13" rx="3"/><rect x="8" y="27" width="13" height="13" rx="3"/><rect x="27" y="27" width="13" height="13" rx="3"/>' + dot(33.5, 33.5, 2);

  /* ---------- events ---------- */
  G['ev-stage'] = '<path d="M6 40h36M8 40V12h32v28"/><path d="M8 12c4 10 8 14 14 14M40 12c-4 10-8 14-14 14"/><circle cx="24" cy="32" r="3"/><path d="M24 35v5"/>' + dot(24, 18);
  G['ev-trophy'] = '<path d="M16 8h16v10a8 8 0 0 1-16 0z"/><path d="M16 12H9c0 6 3 8 7 8M32 12h7c0 6-3 8-7 8"/><path d="M24 26v8M17 40h14l-2-6H19z"/>' + dot(24, 14, 2);
  G['ev-lamp'] = '<path d="M10 30c4 6 24 6 28 0-6-2-22-2-28 0z"/><path d="M24 26c-4-4-4-10 0-16 4 6 4 12 0 16z"/><path d="M20 36l-2 6h12l-2-6"/>' + dot(24, 18, 1.6);
  G['ev-flute'] = G.flute;
  G['ev-dandiya'] = G.sticks;
  G['ev-modak'] = '<path d="M24 8c-10 10-14 18-12 24 2 6 22 6 24 0 2-6-2-14-12-24z"/><path d="M24 8v28M18 16c0 8-2 14-4 18M30 16c0 8 2 14 4 18"/>' + dot(24, 8, 2);
  G['ev-flag'] = G.flag;
  G['ev-karnataka'] = '<path d="M12 44V6"/><path d="M12 8h26v8H12z"/><path d="M12 16h26v8H12"/>' + dot(12, 6, 2) + dot(30, 12) + dot(30, 20);
  G['ev-balloon'] = '<ellipse cx="18" cy="16" rx="8" ry="10"/><ellipse cx="31" cy="20" rx="7" ry="9"/><path d="M18 26c0 6 4 8 4 16M31 29c0 6-4 8-6 13"/>' + dot(15, 12) + dot(28, 16);
  G['ev-charkha'] = '<circle cx="18" cy="22" r="12"/><circle cx="18" cy="22" r="2"/><path d="M18 10v24M6 22h24M10 14l16 16M26 14 10 30"/><path d="M30 22h12M38 22v18M8 40h34"/>' + dot(18, 22, 1.4);
  G['ev-mic'] = '<rect x="18" y="6" width="12" height="20" rx="6"/><path d="M12 22c0 8 5 12 12 12s12-4 12-12"/><path d="M24 34v8M16 42h16"/>' + dot(24, 14, 1.6);
  G['ev-rings'] = '<circle cx="18" cy="28" r="10"/><circle cx="30" cy="28" r="10"/><path d="M26 14l4-6 4 6-4 4z"/>' + dot(30, 12);
  G['ev-masks'] = '<path d="M6 10c8-3 16-3 22 0 0 12-4 18-11 20C10 28 6 22 6 10z"/><path d="M22 18c6-2 14-2 20 1 0 12-4 18-10 20-5-1-8-4-10-8"/><path d="M10 16h4M18 16h3M12 22c2 2 4 2 6 0M28 24h4M35 25h3M29 32c2-2 5-2 7 0"/>' + dot(16, 26);
  G['ev-camera'] = '<rect x="6" y="14" width="36" height="24" rx="4"/><path d="M16 14l3-6h10l3 6"/><circle cx="24" cy="26" r="7"/>' + dot(36, 19);

  /* ---------- flow / actions ---------- */
  G.booked = '<rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32M16 6v8M32 6v8"/><path d="M17 29l5 5 9-10"/>' + dot(36, 14, 1.2);
  G.handover = '<path d="M6 34h8l8 4h12c3 0 4-4 0-4h-8"/><path d="M14 30l6-4h8c2 0 2 4 0 4"/><path d="M26 6h14l2 16H24z"/><path d="M29 10c0 4 6 4 6 0"/>' + dot(33, 16);
  G.back = '<path d="M8 18 24 10l16 8v16l-16 8-16-8z"/><path d="M8 18l16 8 16-8M24 26v16"/><path d="M38 6l-6 6 6 6"/><path d="M32 12h10"/>' + dot(24, 34);
  G.clean = '<path d="M24 6c-6 8-10 13-10 18a10 10 0 0 0 20 0c0-5-4-10-10-18z"/><circle cx="36" cy="34" r="4"/><circle cx="12" cy="38" r="3"/><circle cx="38" cy="22" r="2"/><path d="M19 26c0 3 2 5 5 5"/>' + dot(24, 24, 1.2);
  G.bell = '<path d="M12 34V22a12 12 0 0 1 24 0v12l4 4H8z"/><path d="M20 42a4 4 0 0 0 8 0"/><path d="M24 6v4"/>' + dot(24, 20);
  G.coin = '<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="12"/><path d="M19 17h10M19 21h10M19 25l8 8M19 25h3c4 0 4-8 0-8"/>' + dot(36, 12);
  G.check = '<circle cx="24" cy="24" r="18"/><path d="M15 25l6 6 12-14"/>' + dot(38, 10);
  G.hanger = '<path d="M24 14c0-3 2-5 5-5s5 2 5 5-4 4-6 6-4 3-4 4"/><path d="M24 24 6 36c-2 2 0 4 2 4h32c2 0 4-2 2-4z"/>' + dot(29, 9, 1.4);
  G.receipt = '<path d="M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3z"/><path d="M18 16h12M18 22h12M18 28h8"/>' + dot(30, 28);
  G.home = '<path d="M8 22 24 8l16 14v18H8z"/><path d="M20 40V28h8v12"/><path d="M24 8V4"/>' + dot(24, 18);
  G.grid = G.all;
  G.tap = '<path d="M20 26V12a3 3 0 0 1 6 0v10l8 2c3 1 4 3 3 6l-3 10H22l-8-10c-2-2 1-5 3-3l3 3"/><path d="M14 8a10 10 0 0 1 18 0" class="ring"/>';
  G.whatsapp = '<path d="M8 40l3-9a16 16 0 1 1 6 6z"/><path d="M18 18c0 6 6 12 12 12l3-3-4-3-2 2c-2-1-4-3-5-5l2-2-3-4z"/>';
  G.phone = '<path d="M14 6l6 8-4 4c2 5 6 9 10 11l4-4 8 6-4 8C20 38 10 28 8 10z"/>';
  G.studio = '<path d="M8 40V18l8-6h16l8 6v22"/><path d="M14 40V22h20v18"/><circle cx="24" cy="30" r="5"/><path d="M36 8l4-4M40 12h4M32 6V2"/>' + dot(24, 30, 1.4);
  G.sparkle = '<path d="M24 6l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"/>' + dot(38, 10) + dot(10, 38);
  G.dress = G.costume;
  G.needle = '<path d="M10 38 38 10"/><ellipse cx="36" cy="12" rx="2" ry="4" transform="rotate(45 36 12)"/><path d="M36 12c6 8-2 18-12 18S8 36 14 42"/>' + dot(14, 42);
  G.tear = '<path d="M10 8h28v32H10z"/><path d="M10 22l6 3-4 4 6 3-3 4 5 4"/>' + dot(30, 16);
  G.hourglass = '<path d="M12 6h24M12 42h24"/><path d="M14 6c0 10 10 12 10 18S14 32 14 42M34 6c0 10-10 12-10 18s10 8 10 18"/><path d="M18 38c2-3 10-3 12 0"/>' + dot(24, 24, 1.4);

  /* render helper */
  // Codex-drawn icon set (tools/icon-sheets.mjs) is used when present; the SVG line set is the fallback.
  V.useCodexIcons = () => !V.state || V.state.settings.iconSet !== 'line';
  V.art = (name, cls = '', title) => {
    const png = V.useCodexIcons() && window.VIVIDHAM_ICONS && window.VIVIDHAM_ICONS[name];
    if (png) return `<img class="art art-img ${cls}" src="${png}" alt="${title ? V.esc(title) : ''}" ${title ? '' : 'aria-hidden="true"'} draggable="false">`;
    return V.artSvg(name, cls, title);
  };
  V.artSvg = (name, cls = '', title) => `<svg class="art ${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${title ? `role="img" aria-label="${V.esc(title)}"` : 'aria-hidden="true"'}>${G[name] || G.costume}</svg>`;
  V.artNames = Object.keys(G);

  /* ---------- big scenes ---------- */
  // Bharatanatyam dancer in aramandi — used on splash + empty states.
  V.dancer = (cls = '') => `<svg class="scene ${cls}" viewBox="0 0 240 240" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g class="ln">
      <circle cx="120" cy="44" r="13"/>
      <path d="M108 40c-6-10 4-22 16-18 6 2 9 8 8 14"/>
      <path d="M132 36c10 2 14 10 10 18-3 6-8 6-10 2"/>
      <path d="M120 57v10"/>
      <path d="M100 70c10-4 30-4 40 0l-4 34h-32z"/>
      <path d="M100 72 62 82l-16-4M140 72l38 10 16-4"/>
      <path d="M46 78l-6-6M46 78l-8 2M194 78l6-6M194 78l8 2"/>
      <path d="M104 104c-4 12-14 20-30 26l-6 40M136 104c4 12 14 20 30 26l6 40"/>
      <path d="M68 170l-12 4M172 170l12 4"/>
      <path d="M110 104l-8 46 18 10 18-10-8-46"/>
      <path d="M104 126h32M106 138h28"/>
      <path d="M70 166c4 2 4 6 0 8M170 166c-4 2-4 6 0 8"/>
    </g>
    <g class="sqs"><circle cx="120" cy="86" r="3"/><circle cx="62" cy="82" r="2.4"/><circle cx="178" cy="82" r="2.4"/><circle cx="120" cy="150" r="3"/><circle cx="96" cy="44" r="2.2"/><circle cx="148" cy="54" r="2.2"/></g>
  </svg>`;
  // Counter scene for the Today hero: rack of costumes, bag, bell.
  V.counterScene = (cls = '') => `<svg class="scene ${cls}" viewBox="0 0 320 180" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g class="ln">
      <path d="M20 160h280"/>
      <path d="M40 160V30h120v130M40 30h120"/>
      ${[62, 92, 122].map((x, i) => `<g class="swing s${i}"><path d="M${x} 30v8c0-4 8-4 8 0s-6 4-6 6"/><path d="M${x + 2} 44l-14 8v62h28V52z"/><path d="M${x - 12} 70h28"/><path d="M${x - 12} 114c4 6 24 6 28 0"/></g>`).join('')}
      <path d="M190 160v-60h90v60"/><path d="M186 100h98"/>
      <path d="M206 100V78h26l4 22"/><path d="M212 84c0 6 14 6 14 0"/>
      <g class="bellg"><path d="M254 96V86a10 10 0 0 1 20 0v10l3 4h-26z"/><path d="M260 104a4 4 0 0 0 8 0"/></g>
      <path d="M244 60c10-8 22-8 32 0" stroke-dasharray="2 6"/>
    </g>
    <g class="sqs"><circle cx="76" cy="84" r="2.6"/><circle cx="106" cy="92" r="2.6"/><circle cx="136" cy="80" r="2.6"/><circle cx="219" cy="90" r="2.4"/><circle cx="264" cy="90" r="2.4"/></g>
  </svg>`;

  /* ---------- placeholder "awaiting studio render" image ---------- */
  const COLOUR = { red: '#B3261E', maroon: '#6E1B24', gold: '#C9A04A', yellow: '#E2B93B', green: '#3E7D4F', emerald: '#1F6B4F', blue: '#2C4F9E', navy: '#1F2E5A', royal: '#2C4F9E', pink: '#D35D88', rani: '#C2185B', magenta: '#B0236F',
    black: '#222', white: '#F5F2EC', ivory: '#EFE6D2', cream: '#EFE3C8', orange: '#E07A2E', saffron: '#E8892B', rust: '#A9522B', teal: '#1F7A7A', silver: '#B9BDC4', multicolour: 'conic', mirror: '#C8CCD2', brown: '#7A5233', olive: '#6B6B3A', khaki: '#BFA46E', 'off-white': '#EEE8DC', peacock: '#1F6F78', purple: '#6A3C8C' };
  const hex = c => COLOUR[c] || COLOUR[(c || '').split(' ')[0]] || '#BDB3A6';
  const cache = {};
  V.placeholder = (icon, colours = []) => {
    const k = icon + colours.join(','); if (cache[k]) return cache[k];
    const sw = colours.slice(0, 4).map((c, i) => hex(c) === 'conic' ? `<g transform="translate(${60 + i * 22} 270)"><circle r="7" fill="#E2B93B"/><path d="M0-7A7 7 0 0 1 7 0H0z" fill="#B3261E"/><path d="M0 7A7 7 0 0 1-7 0H0z" fill="#2C4F9E"/></g>` : `<circle cx="${60 + i * 22}" cy="270" r="7" fill="${hex(c)}" stroke="#00000018"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="#ECE8E3"/><rect y="230" width="200" height="70" fill="#F1EEEA"/>
      <g transform="translate(52 70) scale(2)" fill="none" stroke="#7C1D26" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".78">${(G[icon] || G.costume).replace(/class="sq"/g, 'fill="#B4822C" stroke="none" class="sq"')}</g>
      ${sw}</svg>`;
    return (cache[k] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg));
  };

  /* ---------- the journey ribbon (status told with symbols, not words) ---------- */
  // steps: booked → handover → back → clean ; branch: bell (waiting) / coin (fined)
  V.journey = (o, size = 'sm') => {
    const s = V.status(o); const out = o.status !== 'booked' && o.status !== 'cancelled' ? V.outstanding(o) : null;
    const branch = s === 'partial' ? 'bell' : (o.fines || []).some(f => /unreturned/i.test(f.note)) ? 'coin' : null;
    const idx = { booked: 0, out: 1, overdue: 1, partial: 2, closed: 3, cancelled: -1 }[s];
    const steps = [['booked', 'st_booked'], ['handover', 'st_out'], [branch || 'back', branch === 'bell' ? 'st_partial' : 'st_back'], ['clean', 'st_clean']];
    return `<div class="journey ${size} j-${s}" aria-label="${V.esc(V.t(V.STATUS[s][2] || 'st_' + s))}">${steps.map(([icon, label], i) => `
      ${i ? `<i class="jl ${i <= idx ? 'done' : ''} ${i === idx && s === 'overdue' ? 'late' : ''}"></i>` : ''}
      <span class="js ${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''} ${i === idx && (s === 'overdue' || branch === 'bell') ? 'warn' : ''}">${V.art(icon)}${size === 'lg' ? `<small>${V.t(label)}</small>` : ''}</span>`).join('')}
      ${size === 'lg' && out && out.pieces && s !== 'closed' && o.status !== 'out' ? `<em class="jmiss">${V.art('bell')} ${out.pieces}</em>` : ''}</div>`;
  };

  /* ---------- motion: splash, transitions, celebrations, hints ---------- */
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  V.splash = () => new Promise(done => {
    const el = document.getElementById('splash'); if (!el) return done();
    if (sessionStorage.getItem('vv_splash') || reduce()) { el.remove(); return done(); }
    sessionStorage.setItem('vv_splash', '1');
    el.innerHTML = `<div class="sp-in">${V.dancer('sp-dancer draw')}<div class="sp-word"><b>Vividham</b><span>ವಿವಿಧಂ · The Costume Wardrobe</span></div>
      <div class="thread"><svg viewBox="0 0 220 20" fill="none"><path class="track" d="M4 10h212"/><path class="stitch" d="M4 10h212"/></svg><span class="needle">${V.art('sticks')}</span></div></div>`;
    el.classList.add('on');
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 520); }, 2100);
  });
  V.transition = (fn) => {
    const view = document.getElementById('view');
    if (reduce()) return fn();
    if (document.startViewTransition) { document.startViewTransition(() => fn()); return; }
    fn(); view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
  };
  // Celebration overlays: 'returned' | 'reminder' | 'fine' | 'handover' | 'booked'
  V.celebrate = (kind, text) => {
    const icon = { returned: 'check', reminder: 'bell', fine: 'coin', handover: 'handover', booked: 'booked', render: 'sparkle' }[kind] || 'check';
    const el = document.createElement('div'); el.className = `celebrate c-${kind}`;
    const confetti = kind === 'returned' || kind === 'booked' || kind === 'render' ? Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--d:${60 + (i % 4) * 22}px;--c:${['#B4822C', '#7C1D26', '#E9A23B', '#1F6F78'][i % 4]}"></i>`).join('') : '';
    el.innerHTML = `<div class="cel-in"><div class="cel-art">${V.art(icon, 'draw')}${confetti ? `<div class="confetti">${confetti}</div>` : ''}${kind === 'reminder' ? '<b class="cel-2">2</b>' : ''}</div>${text ? `<p>${V.esc(text)}</p>` : ''}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), reduce() ? 600 : 1300);
    setTimeout(() => el.remove(), reduce() ? 900 : 1700);
  };
  // One-time gesture hint: a finger that taps the target.
  V.hint = (selector, id) => {
    if (localStorage.getItem('vv_hint_' + id)) return;
    const t = document.querySelector(selector); if (!t) return;
    const r = t.getBoundingClientRect(); if (!r.width) return;
    const h = document.createElement('div'); h.className = 'tap-hint'; h.innerHTML = V.art('tap');
    h.style.left = (r.left + r.width / 2 - 18 + scrollX) + 'px'; h.style.top = (r.top + r.height / 2 - 6 + scrollY) + 'px';
    document.body.appendChild(h);
    const kill = () => { h.remove(); localStorage.setItem('vv_hint_' + id, '1'); document.removeEventListener('pointerdown', kill, true); };
    document.addEventListener('pointerdown', kill, true); setTimeout(kill, 6000);
  };
  // Generic loader (used while sending to the render studio).
  V.loader = (label = '') => `<div class="loader">${V.art('hanger', 'swing')}<div class="thread mini"><svg viewBox="0 0 120 10" fill="none"><path class="track" d="M2 5h116"/><path class="stitch loop" d="M2 5h116"/></svg></div>${label ? `<small>${V.esc(label)}</small>` : ''}</div>`;
})(window.V = window.V || {});
