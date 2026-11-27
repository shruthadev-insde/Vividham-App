/* Vividham — app shell, router and main screens.
   Design rule: every action and status has a pictogram first, a word second (EN / ಕನ್ನಡ). */
(function (V) {
  const { esc, ic, rs } = V;
  V.ui = { tab: 'today', sub: null, cat: 'all', age: 'all', q: '', ev: null, ofilter: 'active', oq: '' };
  V.act = {};   // click actions:  data-act="name"
  V.bind = {};  // input bindings: data-bind="name"

  /* ---------- shared components ---------- */
  const data = d => Object.entries(d).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  V.btn = (label, act, d = {}, cls = '', icon, art) =>
    `<button class="btn ${cls}" data-act="${act}" ${data(d)}>${art ? V.art(art) : icon ? ic(icon) : ''}<span>${label}</span></button>`;
  V.chip = s => { const [, c, k] = V.STATUS[s]; return `<span class="chip ${c}">${V.t(k)}</span>`; };
  V.stepper = (act, val, max, d = {}, size = '', min = 0) =>
    `<div class="stepper ${size}">
      <button class="step" data-act="${act}" data-d="-1" ${data(d)} ${val <= min ? 'disabled' : ''} aria-label="Less">${ic('minus')}</button>
      <b>${val}${max != null ? `<small>/${max}</small>` : ''}</b>
      <button class="step" data-act="${act}" data-d="1" ${data(d)} ${max != null && val >= max ? 'disabled' : ''} aria-label="More">${ic('plus')}</button>
    </div>`;
  V.thumbs = o => {
    const seen = []; o.lines.forEach(l => { const k = l.cid + l.vid; if (!seen.find(s => s.k === k)) seen.push({ k, l }); });
    return `<div class="thumbs">${seen.slice(0, 3).map(({ l }) => { const c = V.cost(l.cid); return c ? `<img src="${V.img(c, l.vid)}" alt="">` : ''; }).join('')}${seen.length > 3 ? `<em>+${seen.length - 3}</em>` : ''}</div>`;
  };
  V.progress = (a, b, cls = '') => `<div class="bar ${cls}"><i style="width:${b ? Math.round(100 * a / b) : 0}%"></i></div>`;
  // Missing pieces as pictograms with counts — readable without words.
  V.pieceIcons = o => `<div class="picons">${V.outGroups(o).map(x => {
    const l = o.lines.find(l => V.lineLabel(l) === x.line) || o.lines[0]; const c = V.cost(l.cid);
    const p = x.full ? c.pieces[0] : c.pieces.find(p => p.n === x.name) || c.pieces[0];
    return `<span class="pic ${x.full ? 'full' : ''}" title="${esc(x.n + ' × ' + x.name)}">${x.full ? `<img src="${V.img(c, l.vid)}" alt="">` : V.art(p.icon)}<b>${x.n}</b><small>${esc(x.full ? (x.n === 1 ? 'full set' : 'full sets') : x.name)}</small></span>`;
  }).join('')}</div>`;

  V.orderCard = (o, opts = {}) => {
    const s = V.status(o); const t = V.today();
    const qty = V.orderQty(o), back = V.orderBack(o);
    let meta = '', action = '';
    if (s === 'booked') {
      meta = `${V.art('booked')} ${o.pickup <= t ? `<b>${V.t('pickups')}</b>` : V.fmtD(o.pickup)} · ${V.plural(qty, 'set')}`;
      action = o.pickup <= t ? V.btn(V.t('hand_over'), 'handover', { id: o.id }, 'primary', null, 'handover') : '';
    } else if (s === 'out' || s === 'overdue') {
      meta = `${V.art(s === 'overdue' ? 'hourglass' : 'back')} ${s === 'overdue' ? `<b class="red">${V.relDay(o.due)}</b>` : V.relDay(o.due) === 'today' ? `<b>${V.t('due_today')}</b>` : V.fmtD(o.due)} · ${back}/${qty}`;
      action = V.btn(V.t('return'), 'openReturn', { id: o.id }, 'primary', null, 'back');
    } else if (s === 'partial') {
      meta = `${V.art('bell')} <b class="amber">${V.t('still_out')}:</b> ${esc(V.outShort(o))}`;
      action = opts.reminder ? '' : V.btn(V.t('return'), 'openReturn', { id: o.id }, 'ghost', null, 'back');
    } else {
      meta = s === 'cancelled' ? V.t('st_cancelled') : `${V.art('check')} ${V.fmtD(o.closedOn)} · ${V.fines(o) ? `${V.t('add_fine')} ${rs(V.fines(o))}` : `${V.t('refund')} ${rs(o.refund)}`}`;
    }
    return `<article class="ocard s-${s}" data-act="openOrder" data-id="${o.id}">
      ${V.thumbs(o)}
      <div class="obody">
        <div class="otop"><h3>${esc(o.cust.group || o.cust.name)}</h3>${V.chip(s)}</div>
        <div class="osub">${esc(o.cust.name)} · <span class="mono">${o.code}</span></div>
        ${V.journey(o)}
        <div class="ometa">${meta}</div>
      </div>
      <div class="oact">${action || ic('right', 'muted')}</div>
    </article>`;
  };

  V.empty = (art, title, text) => `<div class="empty">${V.art(art, 'draw big')}<h3>${title}</h3><p>${text}</p></div>`;

  /* ---------- product tile (rental-catalogue style) ---------- */
  V.productTile = (c, opts = {}) => {
    const v0 = opts.vid ? V.variant(c, opts.vid) : (c.variants.find(v => V.hasRender(c, v.id)) || c.variants[0]);
    const ready = opts.vid ? V.readyNow(c.id, v0.id) : V.readyAll(c), stock = opts.vid ? v0.stock : V.stockAll(c);
    const lvl = ready === 0 ? 'none' : ready <= Math.max(2, stock * 0.2) ? 'low' : 'ok';
    const alt = V.renderOf(c, v0.id, 'signature') || V.renderOf(c, v0.id, 'three-quarter') || (c.variants.length > 1 && c.variants.map(v => V.renderOf(c, v.id)).filter(Boolean).find(src => src !== V.renderOf(c, v0.id)));
    const rendered = V.hasRender(c, v0.id);
    return `<div class="tile-p ${c.kind}" data-act="openCostume" data-id="${c.id}" data-vid="${v0.id}" role="button" tabindex="0">
      <div class="ph ${rendered ? '' : 'awaiting'} ${alt ? 'has-alt' : ''}">
        <img loading="lazy" src="${V.img(c, v0.id)}" alt="${esc(c.name)}">
        ${alt ? `<img class="alt" loading="lazy" src="${alt}" alt="">` : ''}
        <span class="avail ${lvl}"><i></i>${ready} ${V.t('ready')}</span>
        ${V.isConcept(c, v0.id) ? `<span class="concept" title="Concept image — real garment photo pending">${V.art('sparkle')}Concept</span>` : ''}
        ${rendered ? '' : `<span class="await">${V.art('studio')}<small>${V.t('studio_photo')}</small></span>`}
        <button class="quick" data-act="quickAdd" data-id="${c.id}" data-vid="${v0.id}" aria-label="${V.t('add_to_bag')}">${ic('plus')}</button>
      </div>
      <div class="pinfo">
        <small class="pcat">${esc(V.lang() === 'kn' ? c.catKn : c.catLabel)}${c.age === 'kids' ? ' · ' + V.t('kids') : ''}</small>
        <b class="pname">${esc(c.name)}</b>
        <span class="pprice">${rs(c.rate)} <small>${V.t('rent')} · ${c.kind === 'accessory' ? 'each' : V.state.settings.cycleDays + ' days'}</small></span>
        ${c.variants.length > 1 ? `<span class="swatches-dots">${c.variants.slice(0, 7).map(v => `<i title="${esc(v.label)}" style="background:${V.swatch(v.colours)}"></i>`).join('')}${c.variants.length > 7 ? `<em>+${c.variants.length - 7}</em>` : ''}</span>` : ''}
      </div>
    </div>`;
  };
  const SW = { red: '#B3261E', maroon: '#6E1B24', gold: '#C9A04A', yellow: '#E2B93B', green: '#3E7D4F', emerald: '#1F6B4F', blue: '#2C4F9E', navy: '#1F2E5A', pink: '#D35D88', magenta: '#B0236F', black: '#222', white: '#F5F2EC', ivory: '#EFE6D2', cream: '#EFE3C8', orange: '#E07A2E', saffron: '#E8892B', rust: '#A9522B', teal: '#1F7A7A', silver: '#B9BDC4', brown: '#7A5233', olive: '#6B6B3A', khaki: '#BFA46E', mirror: '#C8CCD2', 'off-white': '#EEE8DC', camo: '#6B6B3A' };
  V.swatch = cols => { const c = (cols || []).map(x => SW[x] || SW[(x || '').split(' ')[0]]).filter(Boolean); if (!c.length) return '#BDB3A6'; if (c.length === 1) return c[0]; return `linear-gradient(135deg, ${c[0]} 50%, ${c[1]} 50%)`; };

  /* ---------- chrome ---------- */
  const TABS = [['today', 'home', 'tab_today'], ['costumes', 'hanger', 'tab_costumes'], ['orders', 'receipt', 'tab_orders'], ['reminders', 'bell', 'tab_reminders'], ['more', 'grid', 'tab_more']];
  function renderChrome() {
    const due = V.remindersDue().length;
    const html = TABS.map(([id, art, label]) => `<button class="tab ${V.ui.tab === id ? 'on' : ''}" data-act="go" data-tab="${id}">
        ${V.art(art, id === 'reminders' && due ? 'ring-bell' : '')}<span>${V.t(label)}</span>${id === 'reminders' && due ? `<em class="badge">${due}</em>` : ''}</button>`).join('');
    document.getElementById('tabs').innerHTML = html;
    document.getElementById('bottombar').innerHTML = html;
    const bagN = V.state.bag.reduce((s, b) => s + b.qty, 0);
    document.getElementById('bagbtn').innerHTML = `${ic('bag')}<span class="hide-sm">${V.t('bag')}</span>${bagN ? `<em class="badge gold">${bagN}</em>` : ''}`;
    const off = V.state.settings.dayOffset;
    document.getElementById('clock').innerHTML = `${ic('calendar')}<span>${V.fmtD(V.today())}</span>${off ? `<em class="demo">+${off}d</em>` : ''}`;
    document.getElementById('langbtn').textContent = V.t('lang');
    document.documentElement.lang = V.lang() === 'kn' ? 'kn' : 'en';
  }

  /* ---------- screens ---------- */
  const VIEWS = {};

  VIEWS.today = () => {
    const t = V.today(); const os = V.state.orders;
    const overdue = os.filter(o => V.status(o) === 'overdue');
    const dueToday = os.filter(o => o.status === 'out' && o.due === t);
    const rem = V.remindersDue();
    const pick = os.filter(o => o.status === 'booked' && o.pickup <= t);
    const clean = V.inCleaning();
    const week = os.filter(o => (o.status === 'booked' && o.pickup > t && o.pickup <= V.addDays(t, 7)) || (o.status === 'out' && o.due > t && o.due <= V.addDays(t, 7)))
      .sort((a, b) => (a.status === 'booked' ? a.pickup : a.due).localeCompare(b.status === 'booked' ? b.pickup : b.due));
    const tile = (n, art, label, sub, cls, tab, f) => `<button class="pulse ${cls} ${n ? '' : 'zero'}" data-act="go" data-tab="${tab}" ${f ? `data-filter="${f}"` : ''}>
        <span class="pa">${V.art(art, n && cls === 'amber' ? 'ring-bell' : '')}</span><b>${n}</b><span>${V.t(label)}</span><small>${V.t(sub)}</small></button>`;
    const attention = [...rem, ...overdue];
    const todo = attention.length + dueToday.length + pick.length;
    const sunday = V.parse(t).getDay() === 0;
    return `
      <section class="hero">
        <div class="hero-txt">
          <p class="eyebrow">${sunday ? 'Sunday · shop closed' : V.lang() === 'kn' ? 'ನಮಸ್ಕಾರ 🙏' : 'Namaskara 🙏'}</p>
          <h1>${V.fmtLong(t)}</h1>
          <p class="lead">${todo ? `<b>${todo}</b> ${todo === 1 ? 'thing' : 'things'} on the counter today.` : 'All calm — nothing waiting on the counter.'}</p>
          <div class="hero-cta">${V.btn(V.t('new_rental'), 'newRental', {}, 'primary lg', null, 'hanger')}${V.btn(V.t('showcase'), 'showcase', {}, 'ghost lg', null, 'sparkle')}</div>
        </div>
        <div class="hero-art">${V.counterScene('draw' + (rem.length ? ' bell-on' : ''))}</div>
      </section>
      <section class="pulses">
        ${tile(dueToday.length, 'back', 'coming_back', 'due_today', '', 'orders', 'out')}
        ${tile(rem.length, 'bell', 'reminders_due', 'due_today', 'amber', 'reminders')}
        ${tile(overdue.length, 'hourglass', 'overdue', 'not_returned', 'red', 'orders', 'out')}
        ${tile(pick.length, 'handover', 'going_out', 'pickups', '', 'orders', 'booked')}
        ${tile(clean, 'clean', 'in_cleaning', 'sets_buffer', 'blue', 'more', 'stock')}
      </section>
      ${localStorage.getItem('vv_legend') ? '' : `<section class="legend">
        <div class="lg-flow">${[['booked', 'st_booked'], ['handover', 'st_out'], ['back', 'st_back'], ['clean', 'st_clean']].map(([a, k], i) => `${i ? '<i class="lg-line"></i>' : ''}<span>${V.art(a, 'draw')}<small>${V.t(k)}</small></span>`).join('')}
          <span class="lg-branch"><i class="lg-fork"></i><span>${V.art('bell')}<small>${V.t('remind_2')}</small></span><span>${V.art('coin')}<small>${V.t('add_fine')}</small></span></span></div>
        <p>Every order travels this line. Short on return? It branches to a reminder or a fine.</p>
        <button class="iconbtn" data-act="hideLegend" aria-label="Hide">${ic('x')}</button></section>`}
      ${V.waPanel()}
      ${attention.length ? `<h2 class="sec">${V.art('bell')} ${V.t('needs_attention')}</h2><div class="list">${attention.map(o => V.orderCard(o)).join('')}</div>` : ''}
      ${pick.length ? `<h2 class="sec">${V.art('handover')} ${V.t('going_out')}</h2><div class="list">${pick.map(o => V.orderCard(o)).join('')}</div>` : ''}
      ${dueToday.length ? `<h2 class="sec">${V.art('back')} ${V.t('coming_back')}</h2><div class="list">${dueToday.map(o => V.orderCard(o)).join('')}</div>` : ''}
      ${week.length ? `<h2 class="sec">${V.art('booked')} ${V.t('next_7')}</h2>
        <div class="rail">${week.map(o => { const go = o.status === 'booked'; const d = go ? o.pickup : o.due; return `<button class="rstop ${go ? 'go' : 'back'}" data-act="openOrder" data-id="${o.id}">
          <span class="rdate"><b>${V.parse(d).getDate()}</b><small>${V.parse(d).toLocaleDateString('en-IN', { weekday: 'short' })}</small></span>
          <span class="rdot">${V.art(go ? 'handover' : 'back')}</span>
          <span class="rname">${esc(o.cust.group || o.cust.name)}</span><small>${V.plural(V.orderQty(o), 'set')}</small></button>`; }).join('')}</div>` : ''}
    `;
  };
  V.act.hideLegend = () => { localStorage.setItem('vv_legend', '1'); V.render(); };

  V.costList = () => {
    const q = V.ui.q.trim();
    let list = q ? V.rec.search(q) : V.state.costumes.slice();
    if (V.ui.ev) list = list.filter(c => (c.usage || []).includes(V.ui.ev));
    list = list.filter(c => (V.ui.cat === 'all' ? c.kind !== 'accessory' || q : c.cat === V.ui.cat) &&
      (V.ui.age === 'all' || c.age === V.ui.age || c.age === 'all' || (V.ui.age === 'adult' && c.age === 'teen')));
    // rendered items first so the grid reads as one shoot; then by availability
    if (!q) list.sort((a, b) => (V.hasRender(b) - V.hasRender(a)) || ((V.readyAll(b) > 0) - (V.readyAll(a) > 0)));
    let extra = '';
    if (V.ui.ev) {
      const r = V.rec.forEvent(V.ui.ev, V.ui.age === 'all' ? null : V.ui.age === 'kids' ? 'kids' : 'Adults');
      if (r.accessories.length) extra = `<div class="ev-acc"><span class="lbl">${V.art('sparkle')} ${V.t('complete_look')}</span>${r.accessories.map(a => `<button class="mini" data-act="openCostume" data-id="${a.id}"><img src="${V.img(a)}" alt=""><span>${esc(a.name)}</span></button>`).join('')}</div>`;
    }
    return extra + (list.length ? `<div class="pgrid">${list.map(c => V.productTile(c)).join('')}</div>` : V.empty('hanger', 'No costumes found', 'Try another category, occasion or word.'));
  };
  VIEWS.costumes = () => {
    const cats = V.CATS.filter(k => k.id === 'all' || V.state.costumes.some(c => c.cat === k.id));
    const count = V.state.costumes.filter(c => c.kind !== 'accessory').length;
    const ev = V.ui.ev && V.EVENTS.find(e => e.id === V.ui.ev);
    const catObj = cats.find(k => k.id === V.ui.cat) || {};
    return `
      <div class="shophead">
        <div><p class="eyebrow">The Wardrobe · ${count} costumes · ${V.state.costumes.length - count} accessories</p>
          <h1>${ev ? esc(V.lang() === 'kn' ? ev.kn : ev.label) : V.ui.cat === 'all' ? 'Ready to rent' : esc(V.lang() === 'kn' ? catObj.kn : catObj.label)}</h1></div>
        <div class="seg">${[['all', 'all'], ['kids', 'kids'], ['adult', 'adults']].map(([a, k]) => `<button class="${V.ui.age === a ? 'on' : ''}" data-act="age" data-age="${a}">${V.t(k)}</button>`).join('')}</div>
      </div>
      <div class="cats">${cats.map(k => `<button class="cat ${V.ui.cat === k.id ? 'on' : ''}" data-act="cat" data-cat="${k.id}">
        <span class="ring">${V.art(k.icon)}</span><span>${esc(V.lang() === 'kn' ? k.kn : k.label)}</span></button>`).join('')}</div>
      <div class="toolbar">
        <label class="search">${ic('search')}<input type="search" data-bind="q" value="${esc(V.ui.q)}" placeholder="${V.t('search')}"></label>
      </div>
      <div class="evrail"><span class="lbl">${V.t('shop_by_event')}</span>${V.EVENTS.map(e => `<button class="evchip ${V.ui.ev === e.id ? 'on' : ''}" data-act="ev" data-ev="${e.id}">${V.art(e.icon)}<span>${esc(V.lang() === 'kn' ? e.kn : e.label)}</span></button>`).join('')}</div>
      <div id="results">${V.costList()}</div>
    `;
  };

  const OFILTERS = [['active', 'all', 'receipt'], ['booked', 'st_booked', 'booked'], ['out', 'st_out', 'handover'], ['partial', 'st_partial', 'bell'], ['closed', 'st_closed', 'check']];
  const ofilter = (o, f) => {
    if (f === 'active') return ['booked', 'out', 'partial'].includes(o.status);
    if (f === 'closed') return o.status === 'closed' || o.status === 'cancelled';
    return o.status === f;
  };
  V.ordList = () => {
    const q = V.ui.oq.trim().toLowerCase();
    const rank = o => ({ overdue: 0, partial: 1, out: 2, booked: 3, closed: 4, cancelled: 5 }[V.status(o)]);
    const list = V.state.orders.filter(o => ofilter(o, V.ui.ofilter) &&
      (!q || q.split(/\s+/).every(w => `${o.code} ${o.cust.name} ${o.cust.group} ${o.cust.phone} ${o.event}`.toLowerCase().includes(w))))
      .sort((a, b) => rank(a) - rank(b) || (a.status === 'booked' ? a.pickup.localeCompare(b.pickup) : a.due.localeCompare(b.due)));
    return list.length ? `<div class="list">${list.map(o => V.orderCard(o)).join('')}</div>` : V.empty('receipt', 'No orders here', 'Orders matching this filter will show up here.');
  };
  VIEWS.orders = () => `
      <div class="pagehead"><h1>${V.t('tab_orders')}</h1>${V.btn(V.t('new_rental'), 'newRental', {}, 'primary', null, 'hanger')}</div>
      <div class="toolbar">
        <div class="seg scroll">${OFILTERS.map(([id, k, art]) => `<button class="${V.ui.ofilter === id ? 'on' : ''}" data-act="ofilter" data-f="${id}">${V.art(art)}${V.t(k)}<small>${V.state.orders.filter(o => ofilter(o, id)).length}</small></button>`).join('')}</div>
        <label class="search">${ic('search')}<input type="search" data-bind="oq" value="${esc(V.ui.oq)}" placeholder="Name, school, phone, VC-…"></label>
      </div>
      <div id="results">${V.ordList()}</div>`;

  VIEWS.reminders = () => {
    const t = V.today();
    const list = V.state.orders.filter(o => o.status === 'partial' && o.reminder && o.reminder.on).sort((a, b) => a.reminder.next.localeCompare(b.reminder.next));
    const due = list.filter(o => o.reminder.next <= t);
    const card = o => {
      const r = o.reminder; const isDue = r.next <= t;
      return `<article class="rcard ${isDue ? 'due' : ''}">
        <div class="rhead" data-act="openOrder" data-id="${o.id}">
          <span class="rbell">${V.art('bell', isDue ? 'ring-bell' : '')}${isDue ? '' : `<b>${Math.max(0, V.diff(t, r.next))}</b>`}</span>
          <div><h3>${esc(o.cust.group || o.cust.name)}</h3><div class="osub">${esc(o.cust.name)} · <span class="mono">${o.code}</span></div></div>
          <span class="rwhen ${isDue ? 'due' : ''}">${isDue ? 'Remind today' : V.fmtD(r.next)}</span>
        </div>
        <div class="missing"><div class="mlabel">${V.art('hourglass')} ${V.t('still_out')} · due ${V.relDay(o.due)}</div>${V.pieceIcons(o)}</div>
        <div class="rdots" title="Reminders sent">${Array.from({ length: Math.max(3, r.log.length + 1) }, (_, i) => `<i class="${i < r.log.length ? 'sent' : i === r.log.length ? 'next' : ''}"></i>`).join('')}<small>${V.plural(r.log.length, 'reminder')} sent · ${V.t('deposit')} ${rs(o.deposit)}</small></div>
        <div class="ractions">
          <a class="btn wa" href="${V.waLink(o.cust.phone, V.fill(V.state.settings.tpl.reminder, o))}" target="_blank" rel="noopener" data-act="waRemind" data-id="${o.id}">${V.art('whatsapp')}<span>${V.t('whatsapp')}</span></a>
          ${V.btn(V.t('items_back'), 'openReturn', { id: o.id }, 'primary', null, 'back')}
          ${V.btn(V.t('add_fine'), 'openReturn', { id: o.id, mode: 'fine' }, 'ghost danger', null, 'coin')}
          <button class="link" data-act="called" data-id="${o.id}">${V.art('phone')} ${V.t('called')}</button>
        </div>
      </article>`;
    };
    return `
      <div class="pagehead"><div><h1>${V.t('tab_reminders')}</h1><p class="lead flowline">${V.art('bell')}<i></i><b>${V.state.settings.reminderEvery}d</b><i></i>${V.art('bell')}<i></i><b>…</b><i></i>${V.art('check')}<em>/</em>${V.art('coin')}</p></div></div>
      ${V.waPanel()}
      ${list.length ? `
        ${due.length ? `<h2 class="sec amber">${V.art('bell', 'ring-bell')} Due today · ${due.length}</h2><div class="rlist">${due.map(card).join('')}</div>` : `<div class="note ok">${V.art('check')} No reminders due today.</div>`}
        ${list.length > due.length ? `<h2 class="sec">${V.art('booked')} Coming up</h2><div class="rlist">${list.filter(o => o.reminder.next > t).map(card).join('')}</div>` : ''}
      ` : V.empty('bell', 'Nothing pending', 'When a customer returns 19 of 20 sets, choose the 2-day reminder on the return screen and it appears here.')}
    `;
  };

  /* ---------- More ---------- */
  const MORE = [['calendar', 'booked', 'calendar', 'Free sets per day, pickups & returns'], ['customers', 'phone', 'customers', 'ID, trust score & history'], ['stock', 'clean', 'stock', 'Counts, cleaning buffer, add costumes'], ['studio', 'studio', 'studio', 'Turn a garment photo into a catalogue image'],
    ['choreo', 'cat-classical', 'choreo', 'Packages & workshops'], ['showcase', 'sparkle', 'showcase', 'Full-screen gallery for customers'], ['settings', 'grid', 'settings', 'Fines, reminders, messages, backup'], ['roadmap', 'receipt', 'about', 'What’s built & next phases']];
  VIEWS.more = () => {
    const sub = V.ui.sub;
    if (sub && V.SUB[sub]) return `<button class="back" data-act="go" data-tab="more">${ic('left')} ${V.t('tab_more')}</button>` + V.SUB[sub]();
    const s = V.state.settings;
    return `
      <div class="shopcard">
        <img src="assets/img/logo.jpg" alt="Vividham logo">
        <div><h1>${esc(s.shopName)}</h1><p>${ic('pin')} ${esc(s.address)}</p><p>${ic('clock')} ${esc(s.hours)} · Sunday closed</p><p>${ic('phone')} ${esc(s.phone)}</p></div>
      </div>
      <div class="moregrid">${MORE.map(([id, art, k, d]) => `<button class="mtile" data-act="${id === 'showcase' ? 'showcase' : 'sub'}" data-sub="${id}">${V.art(art, 'draw')}<b>${V.t(k)}</b><small>${d}</small></button>`).join('')}</div>`;
  };

  /* ---------- render & routing ---------- */
  V.render = () => {
    renderChrome();
    document.getElementById('view').innerHTML = VIEWS[V.ui.tab]();
    if (V.sheetState) V.renderSheet();
  };
  V.go = (tab, extra = {}) => {
    V.transition(() => {
      Object.assign(V.ui, { tab, sub: null }, extra);
      history.replaceState(null, '', '#' + tab + (V.ui.sub ? '/' + V.ui.sub : ''));
      V.render(); window.scrollTo({ top: 0 });
    });
  };
  V.act.go = d => {
    const extra = {};
    if (d.tab === 'orders' && d.filter) extra.ofilter = d.filter;
    if (d.tab === 'more' && d.filter) extra.sub = d.filter;
    V.go(d.tab, extra);
  };
  V.act.sub = d => V.transition(() => { V.ui.tab = 'more'; V.ui.sub = d.sub; history.replaceState(null, '', '#more/' + d.sub); V.render(); window.scrollTo({ top: 0 }); });
  V.act.cat = d => { V.ui.cat = d.cat; V.ui.ev = null; V.transition(V.render); };
  V.act.age = d => { V.ui.age = d.age; V.render(); };
  V.act.ev = d => { V.ui.ev = V.ui.ev === d.ev ? null : d.ev; V.ui.cat = 'all'; V.transition(V.render); };
  V.act.ofilter = d => { V.ui.ofilter = d.f; V.render(); };
  V.act.lang = () => { V.state.settings.lang = V.lang() === 'kn' ? 'en' : 'kn'; V.save(); V.transition(V.render); };
  // Search updates only the results so the input (and the soft keyboard) is never replaced.
  V.bind.q = (el, type) => { if (type !== 'input') return; V.ui.q = el.value; document.getElementById('results').innerHTML = V.costList(); };
  V.bind.oq = (el, type) => { if (type !== 'input') return; V.ui.oq = el.value; document.getElementById('results').innerHTML = V.ordList(); };

  V.act.handover = d => V.openSheet('handover', { id: d.id });
  V.act.called = d => { V.followUp(d.id, 'Phone call'); V.celebrate('reminder', `Call logged · next in ${V.state.settings.reminderEvery} days`); V.render(); };
  V.act.waRemind = d => { V.followUp(d.id, 'WhatsApp'); V.celebrate('reminder', `Sent · next in ${V.state.settings.reminderEvery} days`); setTimeout(V.render, 50); return 'allow'; };
  V.act.quickAdd = d => {
    const ex = V.state.bag.find(b => b.cid === d.id && b.vid === d.vid);
    if (ex) ex.qty++; else V.state.bag.push({ cid: d.id, vid: d.vid, qty: 1 });
    V.save(); V.render(); V.toast(`${V.cost(d.id).name} → ${V.t('bag')}`);
    const b = document.getElementById('bagbtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  };

  V.toast = msg => {
    const el = document.getElementById('toast');
    el.innerHTML = `${ic('check')}<span>${esc(msg)}</span>`; el.classList.add('show');
    clearTimeout(V._tt); V._tt = setTimeout(() => el.classList.remove('show'), 3000);
  };

  /* ---------- event delegation ---------- */
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = V.act[el.dataset.act];
    if (!fn) return;
    const res = fn(el.dataset, el, ev);
    if (res !== 'allow') ev.preventDefault();
    ev.stopPropagation();
  });
  document.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role=button][data-act]')) { ev.preventDefault(); ev.target.click(); } });
  ['input', 'change'].forEach(type => document.addEventListener(type, ev => {
    const el = ev.target.closest('[data-bind]');
    if (!el) return;
    const fn = V.bind[el.dataset.bind];
    if (fn) fn(el, type, ev);
  }));

  V.VIEWS = VIEWS;
})(window.V);
