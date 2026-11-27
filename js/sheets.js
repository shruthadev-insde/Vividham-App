/* Vividham — sheets (modals): costume, rental bag/booking, order, hand-over, Return & Check, demo clock. */
(function (V) {
  const { esc, ic, rs } = V;
  const SHEETS = {};
  V.SHEETS = SHEETS;

  /* ---------- sheet plumbing ---------- */
  V.openSheet = (kind, data = {}) => { V.sheetState = { kind, ...data }; V.renderSheet(true); };
  V.closeSheet = () => {
    V.sheetState = null;
    const el = document.getElementById('sheet'); el.hidden = true; el.innerHTML = '';
    document.body.classList.remove('locked');
  };
  V.renderSheet = (fresh) => {
    const s = V.sheetState; if (!s) return;
    const el = document.getElementById('sheet');
    const prev = el.querySelector('.sbody'); const top = prev && !fresh ? prev.scrollTop : 0;
    const r = SHEETS[s.kind](s);
    el.innerHTML = `<div class="scrim" data-act="closeSheet"></div>
      <div class="sheet ${r.size || ''} ${fresh ? 'anim' : ''}" role="dialog" aria-modal="true">
        <header class="shead"><div class="stitle">${r.title}</div><button class="iconbtn" data-act="closeSheet" aria-label="Close">${ic('x')}</button></header>
        <div class="sbody">${r.body}</div>
        ${r.foot ? `<footer class="sfoot">${r.foot}</footer>` : ''}
      </div>`;
    el.hidden = false; document.body.classList.add('locked');
    el.querySelector('.sbody').scrollTop = top;
  };
  V.act.closeSheet = () => V.closeSheet();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && V.sheetState) V.closeSheet(); });
  // Re-render a sheet while typing in a numeric field without losing focus.
  function liveRender(el) {
    const sel = `[data-bind="${el.dataset.bind}"]${el.dataset.k != null ? `[data-k="${el.dataset.k}"]` : ''}`;
    V.renderSheet();
    const n = document.querySelector('#sheet ' + sel);
    if (n) { n.focus(); const L = n.value.length; try { n.setSelectionRange(L, L); } catch (e) { } }
  }
  const num = v => Math.max(0, parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0);
  const numInput = (bind, val, k) => `<input class="num" inputmode="numeric" data-bind="${bind}" ${k != null ? `data-k="${k}"` : ''} value="${val}">`;

  /* ================= COSTUME (product page) ================= */
  V.act.openCostume = d => {
    const t = V.today(); const c = V.cost(d.id);
    V.openSheet('costume', { id: d.id, vid: d.vid || (c.variants.find(v => V.hasRender(c, v.id)) || c.variants[0]).id, shot: 'front', from: (V.state.draft && V.state.draft.pickup) || t, to: (V.state.draft && V.state.draft.due) || V.addDays(t, V.state.settings.cycleDays), qty: 1 });
  };
  const SHOTS = ['front', 'three-quarter', 'signature', 'detail'];
  SHEETS.costume = s => {
    const c = V.cost(s.id); const v = V.variant(c, s.vid);
    const free = V.avail(c.id, v.id, s.from, s.to);
    const inBag = V.state.bag.filter(b => b.cid === c.id && b.vid === v.id).reduce((a, b) => a + b.qty, 0);
    const shots = SHOTS.filter(sh => V.renderOf(c, v.id, sh));
    const main = V.renderOf(c, v.id, s.shot) || V.img(c, v.id);
    const look = V.rec.completeLook(c.id, v.id);
    const extra = look.filter(x => !x.inSet).slice(0, 8);
    const scene = V.rec.scene(c.id).slice(0, 6);
    const theme = c.theme && V.THEMES[c.theme];
    const evs = (c.usage || []).map(u => V.EVENTS.find(e => e.id === u)).filter(Boolean);
    const isAcc = c.kind === 'accessory';
    return {
      size: 'wide pdp',
      title: `<span class="eyebrow">${V.art(c.icon)} ${esc(V.lang() === 'kn' ? c.catKn : c.catLabel)} · ${c.age === 'kids' ? V.t('kids') : c.age === 'all' ? V.t('all') : V.t('adults')}</span>`,
      body: `<div class="cs">
        <div class="cs-gallery">
          <div class="cs-photo ${V.hasRender(c, v.id) ? '' : 'awaiting'}"><img src="${main}" alt="${esc(c.name)}">
            ${V.hasRender(c, v.id) ? '' : `<span class="await big">${V.art('studio', 'draw')}<small>${V.t('studio_photo')}</small></span>`}</div>
          ${shots.length > 1 ? `<div class="shots">${shots.map(sh => `<button class="${sh === s.shot ? 'on' : ''}" data-act="pickShot" data-shot="${sh}"><img src="${V.renderOf(c, v.id, sh)}" alt="${sh}"></button>`).join('')}</div>` : ''}
        </div>
        <div class="cs-info">
          <h2>${esc(c.name)}</h2>
          <div class="price-line"><b>${rs(c.rate)}</b><span>${V.t('rent')} · ${isAcc ? 'each' : `${V.state.settings.cycleDays} days`} · +${rs(c.extraDay)}/extra day</span></div>
          <div class="dep">${V.art('coin')} ${V.t('deposit')} ${rs(c.deposit)} <small>refundable</small></div>
          ${c.variants.length > 1 ? `<div class="label">${V.t('choose_colour')} · <b>${esc(v.label)}</b></div>
          <div class="swatches">${c.variants.map(x => `<button class="sw ${x.id === v.id ? 'on' : ''}" data-act="pickVariant" data-vid="${x.id}" title="${esc(x.label)}">
            <img src="${V.img(c, x.id)}" alt=""><i style="background:${V.swatch(x.colours)}"></i><small>${V.readyNow(c.id, x.id)}</small></button>`).join('')}</div>` : ''}
          <div class="datebox">
            <label>${V.art('handover')}<span>${V.t('pickup')}</span><input type="date" data-bind="csFrom" value="${s.from}"></label>
            <label>${V.art('back')}<span>${V.t('return_by')}</span><input type="date" data-bind="csTo" value="${s.to}"></label>
            <div class="freebox ${free <= 0 ? 'none' : free < s.qty ? 'low' : 'ok'}"><b>${Math.max(0, free)}</b><span>/${v.stock}<br>${V.t('free_dates')}</span></div>
          </div>
          ${inBag ? `<p class="note">${ic('bag')} ${inBag} already in the bag</p>` : ''}
          ${V.isConcept(c, v.id) ? `<p class="note concept-note">${V.art('studio')} <b>Concept image.</b> Generated from the description — add a photo of the real garment in Render studio to replace it.</p>` : ''}
          <p class="desc">${esc(c.desc)}</p>
          ${evs.length ? `<div class="evtags">${evs.map(e => `<span>${V.art(e.icon)}${esc(V.lang() === 'kn' ? e.kn : e.label)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
      ${!isAcc ? `<section class="cs-sec"><h3>${V.art('hanger')} ${V.t('included')}</h3>
        <div class="setrow">${c.pieces.map(p => `<span class="setp">${V.art(p.icon)}<small>${p.q > 1 ? p.q + '× ' : ''}${esc(p.n)}</small></span>`).join('')}</div></section>` : ''}
      ${extra.length ? `<section class="cs-sec"><h3>${V.art('sparkle')} ${V.t('complete_look')}</h3>
        <div class="hrail">${extra.map(x => { const a = x.item; const inB = V.state.bag.some(b => b.cid === a.id); return `<div class="rcmd">
          <button class="rimg" data-act="openCostume" data-id="${a.id}"><img src="${V.img(a)}" alt=""></button>
          <b>${esc(a.name)}</b><small>${rs(a.rate)} · ${x.ready} ${V.t('ready')}</small>
          <span class="why">${x.why.slice(0, 2).map(w => `<em>${esc(w)}</em>`).join('')}</span>
          <button class="btn sm ${inB ? 'ghost' : 'primary'}" data-act="addRec" data-id="${a.id}" data-qty="${s.qty}">${inB ? ic('check') : ic('plus')}<span>${inB ? V.t('added') : V.t('add')}</span></button></div>`; }).join('')}</div></section>` : ''}
      ${scene.length ? `<section class="cs-sec"><h3>${V.art(theme ? theme.icon : 'cat-mask')} ${V.t('make_scene')}${theme ? ` · <span class="muted">${esc(V.lang() === 'kn' ? theme.kn : theme.label)}</span>` : ''}</h3>
        <div class="hrail">${scene.map(x => `<button class="rcmd scene" data-act="openCostume" data-id="${x.item.id}"><span class="rimg"><img src="${V.img(x.item)}" alt=""></span><b>${esc(x.item.name)}</b><small>${rs(x.item.rate)} · ${x.ready} ${V.t('ready')}</small><span class="why">${x.why.slice(0, 1).map(w => `<em>${esc(w)}</em>`).join('')}</span></button>`).join('')}</div></section>` : ''}
      ${c.sizes.length ? `<section class="cs-sec"><h3>${V.art('top')} ${V.t('size_guide')} <small>(inches)</small></h3>
          <table class="sizes"><thead><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Length</th></tr></thead>
          <tbody>${c.sizes.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
          <p class="muted small">Minor alterations & fitting at the counter.</p></section>` : ''}
      <p class="muted small sku">${c.id} · ${c.source === 'instagram' ? 'from the Vividham collection' : 'catalogue item — confirm stock'}</p>`,
      foot: `${V.stepper('csQty', s.qty, null, {}, '', 1)}
        <button class="btn primary lg grow" data-act="addToBag" ${free < s.qty ? 'data-warn="1"' : ''}>${ic('bag')}<span>${V.t('add_to_bag')} · ${s.qty} × ${rs(c.rate)}</span></button>`
    };
  };
  V.act.pickVariant = d => { V.sheetState.vid = d.vid; V.sheetState.shot = 'front'; V.renderSheet(); };
  V.act.pickShot = d => { V.sheetState.shot = d.shot; V.renderSheet(); };
  V.act.addRec = d => {
    const c = V.cost(d.id); const qty = Math.max(1, +d.qty || 1);
    const ex = V.state.bag.find(b => b.cid === c.id);
    if (ex) ex.qty = Math.max(ex.qty, qty); else V.state.bag.push({ cid: c.id, vid: c.variants[0].id, qty });
    V.save(); V.render(); V.toast(`${qty} × ${c.name} → ${V.t('bag')}`);
  };
  V.act.csQty = d => { V.sheetState.qty = Math.max(1, V.sheetState.qty + (+d.d)); V.renderSheet(); };
  V.bind.csFrom = (el, type) => { if (type !== 'change' || !el.value) return; const s = V.sheetState; s.from = el.value; if (s.to < s.from) s.to = V.addDays(s.from, V.state.settings.cycleDays); V.renderSheet(); };
  V.bind.csTo = (el, type) => { if (type !== 'change' || !el.value) return; const s = V.sheetState; s.to = el.value < s.from ? s.from : el.value; V.renderSheet(); };
  V.act.addToBag = d => {
    const s = V.sheetState;
    const ex = V.state.bag.find(b => b.cid === s.id && b.vid === s.vid);
    if (ex) ex.qty += s.qty; else V.state.bag.push({ cid: s.id, vid: s.vid, qty: s.qty });
    const dr = ensureDraft(); dr.pickup = s.from; dr.due = s.to; dr.deposit = null;
    V.save(); V.closeSheet(); V.render();
    V.toast(`${s.qty} × ${V.cost(s.id).name} → ${V.t('bag')}${d.warn ? ' — check availability' : ''}`);
    const b = document.getElementById('bagbtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  };

  /* ================= RENTAL BAG → BOOKING ================= */
  function ensureDraft() {
    const t = V.today();
    if (!V.state.draft) V.state.draft = { name: '', phone: '', group: '', event: '', pickup: t, due: V.addDays(t, V.state.settings.cycleDays), choreo: null, discount: 0, advance: 0, deposit: null, notes: '' };
    return V.state.draft;
  }
  V.act.openBag = () => { ensureDraft(); V.openSheet('bag'); };
  V.act.newRental = () => {
    if (!V.state.bag.length) { V.go('costumes'); V.toast('Tap a costume to start a rental'); return; }
    V.act.openBag();
  };
  SHEETS.bag = s => {
    const dr = ensureDraft(); const bag = V.state.bag; const t = V.today();
    if (!bag.length) return {
      title: 'Rental bag', body: V.empty('bag', 'The bag is empty', 'Browse costumes and tap “Add to bag”. School and troupe orders can mix many costumes.'),
      foot: `<button class="btn primary lg grow" data-act="bagBrowse">${ic('shirt')}<span>Browse costumes</span></button>`
    };
    const days = Math.max(1, V.diff(dr.pickup, dr.due)); const extra = Math.max(0, days - V.state.settings.cycleDays);
    const rent = V.rentFor(bag, dr.pickup, dr.due);
    const tr = dr.phone.replace(/\D/g, '').length >= 10 ? V.trust(dr.phone) : null;
    const dep = dr.deposit != null ? dr.deposit : Math.round(V.depositFor(bag) * (tr ? tr.mult : 1));
    const ch = dr.choreo ? V.CHOREO.find(x => x.id === dr.choreo) : null;
    const total = rent + (ch ? ch.price : 0) - (dr.discount || 0);
    const short = bag.filter(b => V.avail(b.cid, b.vid, dr.pickup, dr.due) < b.qty);
    const known = [...new Map(V.state.orders.map(o => [o.cust.phone, o.cust])).values()];
    const sets = bag.reduce((a, b) => a + b.qty, 0);
    return {
      size: 'wide',
      title: `Rental bag <span class="muted">· ${V.plural(sets, 'set')}</span>`,
      body: `<div class="bag"><div class="bag-left">
        <section class="bag-lines">
          ${bag.map((b, i) => {
            const c = V.cost(b.cid); const free = V.avail(b.cid, b.vid, dr.pickup, dr.due);
            return `<div class="bline">
              <img src="${V.img(c, b.vid)}" alt="">
              <div class="bl-info"><b>${esc(V.lineLabel(b))}</b>
                <small>${rs(c.rate)} / set · deposit ${rs(c.deposit)}</small>
                <span class="freetag ${free < b.qty ? 'bad' : ''}">${free < b.qty ? `${ic('alert')} Only ${Math.max(0, free)} free for these dates` : `${ic('check')} ${free} free`}</span></div>
              ${V.stepper('bagQty', b.qty, null, { i })}
              <button class="iconbtn" data-act="bagRemove" data-i="${i}" aria-label="Remove">${ic('trash')}</button>
            </div>`;
          }).join('')}
          <button class="link" data-act="bagBrowse">${ic('plus')} Add more costumes</button>
        </section>
        ${(() => { const sug = V.rec.forBag(bag); return sug.length ? `<section class="forgot"><h4>${V.art('sparkle')} ${V.t('missing_for_bag')}</h4>${sug.map(x => `<div class="fg">
            <img src="${V.img(x.item)}" alt=""><div><b>${esc(x.item.name)}</b><small>for ${esc([...new Set(x.for)].join(', '))} · ${rs(x.item.rate)} each</small></div>
            <button class="btn sm primary" data-act="addRec" data-id="${x.sku}" data-qty="${x.qty}">${ic('plus')}<span>${x.qty}</span></button></div>`).join('')}</section>` : ''; })()}
        ${V.studentSection(dr)}
        <section class="totals">
          <div><span>Costume rent (${V.plural(sets, 'set')})</span><b>${rs(rent)}</b></div>
          ${ch ? `<div><span>Choreography · ${esc(ch.label)}</span><b>${rs(ch.price)}</b></div>` : ''}
          ${dr.discount ? `<div><span>Discount</span><b>− ${rs(dr.discount)}</b></div>` : ''}
          <div class="tot"><span>Total</span><b>${rs(total)}</b></div>
          <div><span>Refundable deposit${tr && tr.mult > 1 ? ` <small class="red">×${tr.mult} (${tr.label})</small>` : ''}</span><b>${rs(dep)}</b></div>
          ${dr.advance ? `<div><span>Advance received</span><b>− ${rs(dr.advance)}</b></div>` : ''}
          <div class="pay"><span>To collect at pickup</span><b>${rs(total - (dr.advance || 0) + dep)}</b></div>
        </section>
        </div>
        <section class="form">
          <div class="row2">
            <label><span class="li">${V.art('handover')}${V.t('pickup')}</span><input type="date" data-bind="dr" data-k="pickup" value="${dr.pickup}"></label>
            <label><span class="li">${V.art('back')}${V.t('return_by')}</span><input type="date" data-bind="dr" data-k="due" value="${dr.due}"></label>
          </div>
          <p class="hint">${V.plural(days, 'day')}${extra ? ` · <b>${extra} extra</b> beyond the ${V.state.settings.cycleDays}-day cycle` : ' · standard cycle'} · sets go to cleaning for ${V.cost(bag[0].cid).turnaround} days after return</p>
          <div class="row2">
            <label><span class="li">${V.art('whatsapp')}Phone (WhatsApp)</span><input inputmode="tel" list="knownPhones" data-bind="drTxt" data-k="phone" value="${esc(dr.phone)}" placeholder="98450 12345"></label>
            <label>Customer name<input data-bind="drTxt" data-k="name" value="${esc(dr.name)}" placeholder="Contact person"></label>
          </div>
          ${tr ? V.idCard(dr.phone, true) : ''}
          <datalist id="knownPhones">${known.map(k => `<option value="${esc(k.phone)}">${esc(k.name)} · ${esc(k.group)}</option>`).join('')}</datalist>
          <div class="row2">
            <label>School / troupe / family<input data-bind="drTxt" data-k="group" value="${esc(dr.group)}" placeholder="e.g. St. Agnes Primary"></label>
            <label>Event<input data-bind="drTxt" data-k="event" value="${esc(dr.event)}" placeholder="Annual Day, Navratri…"></label>
          </div>
          <div class="label">${ic('music')} Add choreography <small>(optional)</small></div>
          <div class="chips">
            <button class="pick ${!dr.choreo ? 'on' : ''}" data-act="drChoreo" data-id="">Costumes only</button>
            ${V.CHOREO.map(x => `<button class="pick ${dr.choreo === x.id ? 'on' : ''}" data-act="drChoreo" data-id="${x.id}">${esc(x.label)} <small>${rs(x.price)}</small></button>`).join('')}
          </div>
          <div class="row3">
            <label>Discount ₹${numInput('drNum', dr.discount || 0, 'discount')}</label>
            <label>Advance paid ₹${numInput('drNum', dr.advance || 0, 'advance')}</label>
            <label>Deposit ₹${numInput('drNum', dep, 'deposit')}</label>
          </div>
        </section>
        
      </div>`,
      foot: `${short.length ? `<p class="warn">${ic('alert')} ${short.length === 1 ? 'One costume is' : short.length + ' costumes are'} short for these dates</p>` : ''}
        <button class="btn ghost" data-act="bagQuote">${ic('wa')}<span>Send quote</span></button>
        <span class="grow"></span>
        ${dr.pickup <= t ? `<button class="btn ghost" data-act="bagConfirm" data-hand="0">Save booking</button>
          <button class="btn primary lg" data-act="bagConfirm" data-hand="1">${ic('handover')}<span>Hand over now</span></button>`
          : `<button class="btn primary lg" data-act="bagConfirm" data-hand="0">${ic('check')}<span>Confirm booking</span></button>`}`
    };
  };
  V.act.bagBrowse = () => { V.closeSheet(); V.go('costumes'); };
  V.act.bagQty = d => { const b = V.state.bag[+d.i]; b.qty = Math.max(1, b.qty + (+d.d)); V.state.draft.deposit = null; V.save(); V.renderSheet(); V.render(); };
  V.act.bagRemove = d => { V.state.bag.splice(+d.i, 1); V.state.draft.deposit = null; V.save(); V.renderSheet(); V.render(); };
  V.act.drChoreo = d => { V.state.draft.choreo = d.id || null; V.save(); V.renderSheet(); };
  V.bind.dr = (el, type) => {
    if (type !== 'change' || !el.value) return;
    const dr = V.state.draft; dr[el.dataset.k] = el.value;
    if (dr.due <= dr.pickup) dr.due = V.addDays(dr.pickup, el.dataset.k === 'due' ? 1 : V.state.settings.cycleDays);
    V.save(); V.renderSheet();
  };
  V.bind.drTxt = (el, type) => {
    const dr = V.state.draft; dr[el.dataset.k] = el.value;
    if (el.dataset.k === 'phone' && type === 'change') {
      const k = V.state.orders.find(o => o.cust.phone.replace(/\D/g, '') === el.value.replace(/\D/g, ''));
      if (k && !dr.name) { dr.name = k.cust.name; dr.group = k.cust.group; V.toast(`Returning customer · ${k.cust.name}`); }
      dr.deposit = null; V.save(); V.renderSheet();
    }
    V.save();
  };
  V.bind.drNum = (el, type) => { if (type !== 'input') return; V.state.draft[el.dataset.k] = num(el.value); V.save(); liveRender(el); };
  V.act.bagQuote = () => {
    const dr = V.state.draft;
    const fake = { code: 'Quote', cust: { name: dr.name || 'there', group: dr.group, phone: dr.phone }, lines: V.state.bag, pickup: dr.pickup, due: dr.due, deposit: dr.deposit != null ? dr.deposit : V.depositFor(V.state.bag), rent: V.rentFor(V.state.bag, dr.pickup, dr.due), choreo: dr.choreo ? V.CHOREO.find(x => x.id === dr.choreo) : null, discount: dr.discount };
    window.open(V.waLink(dr.phone || V.state.settings.phone, V.fill(V.state.settings.tpl.booking, fake).replace('Thank you for booking with', 'Here is your quote from')), '_blank');
  };
  V.act.bagConfirm = d => {
    const dr = V.state.draft;
    const missing = [];
    if (!dr.name.trim()) missing.push('customer name');
    if (dr.phone.replace(/\D/g, '').length < 10) missing.push('a 10-digit phone');
    if (missing.length) { V.toast('Please add ' + missing.join(' and ')); return; }
    const short = V.state.bag.filter(b => V.avail(b.cid, b.vid, dr.pickup, dr.due) < b.qty);
    if (short.length && !confirm(`Not enough free stock for: ${short.map(V.lineLabel).join(', ')}.\nBook anyway (e.g. you will stitch or source extra)?`)) return;
    const tr = V.trust(dr.phone);
    if (tr.tier === 'risky' && !V.ownerOk(`${dr.name} has a risky record (${tr.facts.join(', ')})`)) return;
    if (d.hand === '1' && V.needsId(dr.phone) && !V.ownerOk('no ID / face photo yet')) return;
    const ch = dr.choreo ? V.CHOREO.find(x => x.id === dr.choreo) : null;
    const o = V.createOrder({ ...dr, lines: V.state.bag, choreo: ch ? { id: ch.id, label: ch.label, price: ch.price } : null, deposit: dr.deposit != null ? dr.deposit : Math.round(V.depositFor(V.state.bag) * tr.mult), handover: d.hand === '1' });
    V.state.bag = []; V.state.draft = null; V.save();
    V.openSheet('order', { id: o.id, fresh: true }); V.render();
    V.celebrate(d.hand === '1' ? 'handover' : 'booked', `${o.code} ${d.hand === '1' ? 'handed over' : 'booked'}`);
  };

  /* ================= ORDER ================= */
  V.act.openOrder = d => V.openSheet('order', { id: d.id });
  SHEETS.order = s => {
    const o = V.order(s.id); const st = V.status(o); const set = V.state.settings;
    const out = V.outstanding(o);
    const fines = V.fines(o);
    const total = V.orderTotal(o);
    const waTpl = o.status === 'closed' ? set.tpl.closed : o.status === 'partial' ? set.tpl.reminder : set.tpl.booking;
    let foot = '';
    if (o.status === 'booked') foot = `${V.btn('Cancel', 'cancelOrder', { id: o.id }, 'ghost danger')}<span class="grow"></span>${V.btn(V.t('hand_over'), 'handover', { id: o.id }, 'primary lg', null, 'handover')}`;
    else if (o.status === 'out') foot = `${V.btn('+1 day', 'extendOrder', { id: o.id }, 'ghost', null, 'booked')}<span class="grow"></span>${V.btn(V.t('return_check'), 'openReturn', { id: o.id }, 'primary lg', null, 'back')}`;
    else if (o.status === 'partial') foot = `${V.btn(V.t('add_fine'), 'openReturn', { id: o.id, mode: 'fine' }, 'ghost danger', null, 'coin')}<span class="grow"></span>${V.btn(V.t('items_back'), 'openReturn', { id: o.id }, 'primary lg', null, 'back')}`;
    return {
      size: 'wide',
      title: `<span class="mono">${o.code}</span> ${V.chip(st)}`,
      body: `
        ${s.fresh ? `<div class="note ok">${ic('check')} Saved. Send the customer a WhatsApp confirmation?</div>` : ''}
        <div class="ohead">
          <div><h2>${esc(o.cust.group || o.cust.name)}</h2><p class="muted">${esc(o.cust.name)}${o.event ? ' · ' + esc(o.event) : ''}</p>${V.trustChip(o.cust.phone)}</div>
          <div class="contact">
            <a class="btn wa" href="${V.waLink(o.cust.phone, V.fill(waTpl, o))}" target="_blank" rel="noopener" ${o.status === 'partial' ? `data-act="waRemind" data-id="${o.id}"` : ''}>${V.art('whatsapp')}<span>WhatsApp</span></a>
            <a class="btn ghost" href="tel:${esc(o.cust.phone.replace(/\s/g, ''))}">${V.art('phone')}<span>${esc(o.cust.phone)}</span></a>
          </div>
        </div>
        ${V.journey(o, 'lg')}
        <div class="facts">
          <div><small>Pickup</small><b>${V.fmtD(o.pickup)}</b></div>
          <div><small>Return by</small><b class="${st === 'overdue' ? 'red' : ''}">${V.fmtD(o.due)}</b></div>
          <div><small>Sets back</small><b>${V.orderBack(o)} / ${V.orderQty(o)}</b></div>
          <div><small>Deposit held</small><b>${rs(o.deposit)}</b></div>
        </div>
        ${o.status === 'partial' && o.reminder ? `<div class="note amber">${V.art('bell', 'ring-bell')} Reminder every ${o.reminder.every} days · next <b>${V.fmtD(o.reminder.next)}</b> · sent ${V.plural(o.reminder.log.length, 'time')}</div>` : ''}
        <h3>Items</h3>
        <div class="olines">${o.lines.map(l => {
          const c = V.cost(l.cid); const lo = V.lineOut(l);
          return `<div class="oline"><img src="${V.img(c, l.vid)}" alt="">
            <div><b>${esc(V.lineLabel(l))}</b><small>${l.qty} × ${rs(c.rate)} · ${c.pieces.length} pieces per set</small>
            ${o.status !== 'booked' ? V.progress(l.pr[0] || 0, l.qty, lo.some(n => n) && o.status === 'partial' ? 'amber' : '') : ''}
            ${lo.some(n => n) && o.status !== 'booked' && o.status !== 'out' ? `<div class="miss">${lo.map((n, i) => n ? `<span>${V.art(c.pieces[i].icon)}${n}× ${esc(c.pieces[i].n)}</span>` : '').join('')}</div>` : ''}</div>
            <b class="qty">${l.qty}</b></div>`;
        }).join('')}</div>
        ${o.writtenOff ? `<p class="muted small">Written off after fine: ${o.writtenOff.map(x => `${x.n}× ${esc(x.name)}`).join(', ')}</p>` : ''}
        <h3>Money</h3>
        <div class="totals">
          <div><span>Rent</span><b>${rs(o.rent)}</b></div>
          ${o.choreo ? `<div><span>Choreography · ${esc(o.choreo.label)}</span><b>${rs(o.choreo.price)}</b></div>` : ''}
          ${o.discount ? `<div><span>Discount</span><b>− ${rs(o.discount)}</b></div>` : ''}
          <div class="tot"><span>Total</span><b>${rs(total)}</b></div>
          ${o.status === 'booked' ? `<div><span>Advance received</span><b>${rs(o.advance)}</b></div><div class="pay"><span>Collect at pickup (balance + deposit)</span><b>${rs(total - o.advance + o.deposit)}</b></div>` : `<div><span>Paid</span><b>${rs(o.paid)}</b></div>`}
          <div><span>Deposit held</span><b>${rs(o.deposit)}</b></div>
          ${(o.fines || []).map(f => `<div class="fine"><span>${esc(f.note)} <small>${V.fmtD(f.d)}</small></span><b>− ${rs(f.amt)}</b></div>`).join('')}
          ${o.status === 'closed' ? (o.balanceDue ? `<div class="pay red"><span>Customer owes</span><b>${rs(o.balanceDue)}</b></div>` : `<div class="pay"><span>Deposit refunded</span><b>${rs(o.refund)}</b></div>`)
            : fines ? `<div class="pay"><span>Deposit balance so far</span><b>${rs(o.deposit - fines)}</b></div>` : ''}
        </div>
        <h3>History</h3>
        <ol class="timeline">${(o.timeline || []).slice().reverse().map(x => `<li><small>${V.fmtD(x.d)}</small><span>${esc(x.t)}</span></li>`).join('')}
          ${(o.returns || []).filter(r => r.note).map(r => `<li class="quote"><small>${V.fmtD(r.d)}</small><span>“${esc(r.note)}”</span></li>`).join('')}</ol>
        ${(() => { const keys = [o.outPhoto ? [o.outPhoto, 'Handed over'] : null, ...(o.returns || []).filter(r => r.photo).map((r, i) => [r.photo, 'Returned ' + V.fmtD(r.d)])].filter(Boolean); return keys.length ? `<h3>${V.art('studio')} Photos</h3><div class="photo-row">${keys.map(([k, l]) => V.photoSlot(k, l)).join('')}</div>` : ''; })()}
        ${o.students && o.students.length ? `<h3>${V.art('cat-classical')} Students (${o.students.length})</h3><div class="stu-grid">${o.students.map(st => { const c = V.cost(o.lines[st.li].cid); const out = st.back ? c.pieces.map((p, pi) => p.q - st.back[pi]).reduce((a, b) => a + b, 0) : null; return `<span class="stu ${st.back ? (out ? 'r-some' : 'r-done') : ''}"><b>${esc(st.name)}</b><small>${esc(st.size || '')} · ${esc(st.cls || '')}</small>${out ? `<em class="red">${out} missing</em>` : ''}</span>`; }).join('')}</div>` : ''}
        ${V.altSection(o)}
        ${V.ledger(o)}
        ${o.status === 'closed' ? V.refundPanel(o) : ''}
        <div class="row-actions">${V.btn('Print slip', 'printSlip', { id: o.id }, 'ghost', 'printer')}${V.btn(o.students && o.students.length ? 'Child bag labels' : 'Bag labels', 'printLabels', { id: o.id }, 'ghost', null, 'receipt')}</div>
      `,
      foot
    };
  };
  V.act.cancelOrder = d => { if (!confirm('Cancel this booking? The sets become free again.')) return; V.cancel(d.id); V.renderSheet(); V.render(); V.toast('Booking cancelled'); };
  V.act.extendOrder = d => { const o = V.order(d.id); V.extend(d.id, V.addDays(o.due, 1)); V.renderSheet(); V.render(); V.toast(`Return date moved to ${V.fmtD(o.due)} · rent ${rs(o.rent)}`); };

  /* ================= HAND OVER ================= */
  SHEETS.handover = s => {
    const o = V.order(s.id); const total = V.orderTotal(o);
    return {
      title: `Hand over · <span class="mono">${o.code}</span>`,
      body: `<h2>${esc(o.cust.group || o.cust.name)}</h2>
        <p class="muted">Count each piece into the bag. The same list is checked on return.</p>
        ${V.needsId(o.cust.phone) ? `<div class="note amber">${V.art('cat-mask')} Take the customer's face and ID photo before handing over.</div>${V.idCard(o.cust.phone, true)}` : `<div class="idmini">${V.trustChip(o.cust.phone)}</div>`}
        <div class="photo-row">${V.photoSlot(`order/${o.id}/out`, 'Packed bag')}${V.camBtn(`order/${o.id}/out`, 'Photo of packed bag', 'outPhoto', { id: o.id })}</div>
        ${V.scanBox('out')}${(o.tags || []).length ? `<p class="hint">${V.art('check')} ${o.tags.length} tagged sets scanned</p>` : ''}
        ${o.lines.map(l => { const c = V.cost(l.cid); return `<div class="pack"><img src="${V.img(c, l.vid)}" alt=""><div><b>${l.qty} × ${esc(V.lineLabel(l))}</b>
          <div class="setrow sm">${c.pieces.map(p => `<span class="setp">${V.art(p.icon)}<b>${l.qty * p.q}</b><small>${esc(p.n)}</small></span>`).join('')}</div></div></div>`; }).join('')}
        <div class="totals">
          <div><span>Rent balance</span><b>${rs(total - (o.advance || 0))}</b></div>
          <div><span>Refundable deposit</span><b>${rs(o.deposit)}</b></div>
          <div class="pay"><span>Collect now</span><b>${rs(total - (o.advance || 0) + o.deposit)}</b></div>
          <div><span>Return by</span><b>${V.fmtD(o.due)}</b></div>
        </div>
        ${(o.payments || []).some(p => p.kind === 'pickup payment') ? `<div class="note ok">${V.art('check')} Payment recorded</div>` : V.collectPanel(o, total - (o.advance || 0) + o.deposit, 'pickup payment')}`,
      foot: `<span class="grow"></span><button class="btn primary lg" data-act="confirmHandover" data-id="${o.id}">${V.art('handover')}<span>Counted & handed over</span></button>`
    };
  };
  V.act.outPhoto = d => { V.order(d.id).outPhoto = d.key; V.save(); };
  V.act.confirmHandover = d => { const o0 = V.order(d.id); if (V.needsId(o0.cust.phone) && !V.ownerOk('no ID / face photo yet')) return; if (!o0.outPhoto && !confirm('No photo of the packed bag yet. Hand over anyway?')) return; V.handOver(d.id); V.save(); V.openSheet('order', { id: d.id, fresh: true }); V.render(); V.celebrate('handover', V.order(d.id).code + ' handed over'); };

  /* ================= RETURN & CHECK =================
     Staff count what came back (sets and loose pieces).
     Shortfall → two big choices: Add Fine  |  2-Day Reminder.               */
  V.act.openReturn = d => {
    const o = V.order(d.id);
    const fineMode = d.mode === 'fine';
    V.openSheet('return', {
      id: o.id,
      lines: o.lines.map(l => {
        const c = V.cost(l.cid);
        return { prev: l.pr.slice(), pr: fineMode ? l.pr.slice() : c.pieces.map(p => l.qty * p.q), touched: {} };
      }),
      cond: 'good', dmg: o.lines.map(() => 0), dmgFee: V.state.settings.damageFee,
      lateOn: true, fine: null, choice: fineMode ? 'fine' : null, note: '', photoKey: `order/${o.id}/in-${(o.returns || []).length + 1}`,
      students: (o.students || []).map(st => { const c = V.cost(o.lines[st.li].cid); const prev = st.back || c.pieces.map(() => 0); return { ...st, prev, state: fineMode ? 'none' : 'all', miss: [] }; })
    });
    if (o.students && o.students.length) studentsToLines(V.sheetState); V.renderSheet();
  };
  // Student mode: each child's state decides the counted pieces for their costume line.
  function stuNow(o, st) { const c = V.cost(o.lines[st.li].cid); return c.pieces.map((p, pi) => st.state === 'all' ? p.q : st.state === 'none' ? st.prev[pi] : (st.miss.includes(pi) ? st.prev[pi] : p.q)); }
  function studentsToLines(s) {
    const o = V.order(s.id);
    s.lines.forEach((L, li) => { const kids = s.students.filter(x => x.li === li); if (!kids.length) return; const extra = o.lines[li].qty - kids.length;
      L.pr = L.pr.map((_, pi) => Math.max(L.prev[pi], kids.reduce((a, st) => a + stuNow(o, st)[pi], 0) + Math.max(0, extra) * V.cost(o.lines[li].cid).pieces[pi].q)); L.touched = {}; });
    s.fine = null;
  }
  V.act.stuCycle = d => { const s = V.sheetState; const st = s.students[+d.i]; const full = st.prev.every((n, pi) => n >= V.cost(V.order(s.id).lines[st.li].cid).pieces[pi].q); if (full) return; st.state = { all: 'none', none: 'some', some: 'all' }[st.state]; if (st.state === 'some' && !st.miss.length) st.miss = [V.cost(V.order(s.id).lines[st.li].cid).pieces.length > 1 ? 1 : 0]; studentsToLines(s); V.renderSheet(); };
  V.act.stuMiss = d => { const s = V.sheetState; const st = s.students[+d.i]; const pi = +d.pi; st.miss = st.miss.includes(pi) ? st.miss.filter(x => x !== pi) : [...st.miss, pi]; if (!st.miss.length) st.state = 'all'; studentsToLines(s); V.renderSheet(); };
  function studentHtml(s) {
    const o = V.order(s.id); if (!s.students || !s.students.length) return '';
    return `<section class="stu-ret"><div class="label">${V.art('cat-classical')} Tap each child: ${V.art('check')} back · ${V.art('hourglass')} not back · ${V.art('needle')} pieces missing</div>
      <div class="stu-grid">${s.students.map((st, i) => { const c = V.cost(o.lines[st.li].cid); const done = st.prev.every((n, pi) => n >= c.pieces[pi].q);
        return `<div class="stu r-${done ? 'done' : st.state}"><button class="stu-b" data-act="stuCycle" data-i="${i}">${V.art(done || st.state === 'all' ? 'check' : st.state === 'none' ? 'hourglass' : 'needle')}<b>${esc(st.name)}</b><small>${esc(st.size || '')} ${esc(c.name.split(' ').slice(0, 2).join(' '))}</small></button>
          ${st.state === 'some' && !done ? `<div class="stu-miss">${c.pieces.map((p, pi) => `<button class="${st.miss.includes(pi) ? 'on' : ''}" data-act="stuMiss" data-i="${i}" data-pi="${pi}" title="${esc(p.n)}">${V.art(p.icon)}</button>`).join('')}</div>` : ''}</div>`; }).join('')}</div></section>`;
  }
  V.studentHtml = studentHtml;
  function calcReturn(s) {
    const o = V.order(s.id); const set = V.state.settings;
    let newSets = 0; const missing = []; let missingValue = 0;
    o.lines.forEach((l, li) => {
      const c = V.cost(l.cid); const L = s.lines[li];
      newSets += L.pr[0] - L.prev[0];
      c.pieces.forEach((p, pi) => {
        const n = l.qty * p.q - L.pr[pi];
        if (n > 0) { missing.push({ li, pi, n, name: p.n, line: V.lineLabel(l), fee: p.fee }); missingValue += n * p.fee; }
      });
    });
    const lateDays = V.lateDays(o);
    const lateAmt = s.lateOn ? lateDays * set.lateFee * newSets : 0;
    const dmgSets = s.cond === 'good' ? 0 : s.dmg.reduce((a, b) => a + b, 0);
    const dmgAmt = s.cond === 'good' ? 0 : dmgSets * s.dmgFee;
    const charges = [];
    const rentDue = Math.max(0, V.orderTotal(o) - (o.paid || 0));
    if (rentDue) charges.push({ amt: rentDue, note: 'Extra rent (return date extended)', rent: true });
    if (lateAmt) charges.push({ amt: lateAmt, note: `Late fee (${V.plural(lateDays, "day")} × ${V.plural(newSets, "set")} × ${rs(set.lateFee)})` });
    if (dmgAmt) charges.push({ amt: dmgAmt, note: `${s.cond === 'damaged' ? 'Damage' : 'Repair'} charge (${dmgSets} sets)` });
    const fine = s.fine != null ? s.fine : missingValue;
    const prevFines = V.fines(o);
    const chargesTotal = charges.reduce((a, c) => a + c.amt, 0);
    const deductions = prevFines + chargesTotal + (missing.length && s.choice === 'fine' ? fine : 0);
    return { o, newSets, missing, missingValue, lateDays, lateAmt, dmgSets, dmgAmt, charges, fine, prevFines, chargesTotal, balance: o.deposit - deductions };
  }
  SHEETS.return = s => {
    const r = calcReturn(s); const o = r.o; const set = V.state.settings;
    const short = r.missing.length > 0;
    const settle = b => b >= 0 ? `<div class="pay"><span>Refund to customer</span><b>${rs(b)}</b></div>` : `<div class="pay red"><span>Collect from customer</span><b>${rs(-b)}</b></div>`;
    const groups = V.outGroups({ lines: o.lines.map((l, i) => ({ ...l, pr: s.lines[i].pr })) });
    const missingList = V.pieceIcons({ lines: o.lines.map((l, i) => ({ ...l, pr: s.lines[i].pr })) });
    const itemCount = groups.reduce((a, x) => a + x.n, 0);
    let decision = '';
    if (short) {
      decision = `<section class="decide">
        <div class="dhead">${V.art('hourglass', 'wobble')}<div><b>${groups.length === 1 && groups[0].full ? `${V.plural(groups[0].n, 'set')} not returned` : `${V.plural(itemCount, 'item')} not returned`}</b><small>Choose how to settle this order</small></div></div>
        ${missingList}
        <div class="choices">
          <button class="choice fine ${s.choice === 'fine' ? 'on' : ''}" data-act="retChoice" data-c="fine"><span class="cart">${V.art('coin', 'drop')}</span><b>${V.t('add_fine')}</b><small>Deduct from deposit · close order</small><em>${rs(r.missingValue)}</em></button>
          <button class="choice remind ${s.choice === 'remind' ? 'on' : ''}" data-act="retChoice" data-c="remind"><span class="cart">${V.art('bell', 'ring-bell')}<b class="cday">${set.reminderEvery}</b></span><b>${V.t('remind_2')}</b><small>Customer will bring it · remind every ${set.reminderEvery} days</small><em>${V.fmtD(V.addDays(V.today(), set.reminderEvery))}</em></button>
        </div>
        ${s.choice === 'fine' ? `<div class="finebox">
            <label>Fine amount ₹${numInput('retFine', r.fine)}</label>
            <small>Suggested ${rs(r.missingValue)} = replacement value of missing items. Unreturned costumes are written off stock.</small>
          </div>` : ''}
        ${s.choice === 'remind' ? `<div class="note amber">${V.art('bell')} Goes to Reminders. Next reminder <b>${V.fmtD(V.addDays(V.today(), set.reminderEvery))}</b>, then every ${set.reminderEvery} days. Deposit ${rs(o.deposit)} stays held.</div>` : ''}
      </section>`;
    } else {
      decision = `<div class="note ok big allback">${V.art('check', 'draw')} ${V.t('everything_back')}. ${r.newSets ? `${V.plural(r.newSets, 'set')} go to cleaning.` : ''}</div>`;
    }
    const lineHtml = o.lines.map((l, li) => {
      const c = V.cost(l.cid); const L = s.lines[li];
      return `<div class="rline">
        <div class="rl-head"><img src="${V.img(c, l.vid)}" alt="">
          <div><b>${esc(V.lineLabel(l))}</b><small>${l.qty} given${L.prev[0] ? ` · ${L.prev[0]} already back` : ''}</small></div>
          <button class="btn ghost sm" data-act="retAll" data-li="${li}">${V.art('check')}<span>${V.t('all_in')}</span></button>
        </div>
        <div class="rl-main ${L.pr[0] < l.qty ? 'miss' : ''}"><span class="rlm">${V.art(c.pieces[0].icon)}<span>${V.t('costumes_back')}<small>${esc(c.pieces[0].n)}</small></span></span>${V.stepper('retStep', L.pr[0], l.qty, { li, pi: 0 }, 'lg', L.prev[0])}</div>
        <div class="rl-pieces">${c.pieces.slice(1).map((p, k) => {
          const pi = k + 1; const max = l.qty * p.q; const miss = max - L.pr[pi];
          return `<div class="rp ${miss ? 'miss' : ''}"><span class="rpn">${V.art(p.icon)}<small>${esc(p.n)}</small></span>${V.stepper('retStep', L.pr[pi], max, { li, pi }, '', L.prev[pi])}</div>`;
        }).join('')}</div>
      </div>`;
    }).join('');
    const condHtml = `<div class="cond">
        <div class="label">Condition of what came back</div>
        <div class="seg cond3">${[['good', 'Good', 'check'], ['minor', 'Minor repair', 'needle'], ['damaged', 'Damaged', 'tear']].map(([k, l, a]) => `<button class="${s.cond === k ? 'on' : ''}" data-act="retCond" data-c="${k}">${V.art(a)}${l}</button>`).join('')}</div>
        ${s.cond !== 'good' ? `<div class="dmgrows">${o.lines.map((l, li) => `<div class="rp"><span>${esc(V.lineLabel(l))} — sets affected</span>${V.stepper('retDmg', s.dmg[li], Math.max(0, s.lines[li].pr[0] - s.lines[li].prev[0]), { li })}</div>`).join('')}
          <label class="inline">Charge per set ₹${numInput('retDmgFee', s.dmgFee)}</label>
          <small class="muted">Affected sets get +${set.repairDays} extra days in the repair buffer.</small></div>` : ''}
      </div>`;
    const lateHtml = r.lateDays > 0 && r.newSets > 0 ? `<label class="toggle"><input type="checkbox" data-bind="retLate" ${s.lateOn ? 'checked' : ''}><span>Late by ${V.plural(r.lateDays, 'day')} — late fee ${rs(set.lateFee)} × ${V.plural(r.newSets, "set")} × ${V.plural(r.lateDays, "day")} = <b>${rs(r.lateDays * set.lateFee * r.newSets)}</b></span></label>` : '';
    const summary = `<section class="totals">
        <div><span>Deposit held</span><b>${rs(o.deposit)}</b></div>
        ${r.prevFines ? `<div class="fine"><span>Earlier charges</span><b>− ${rs(r.prevFines)}</b></div>` : ''}
        ${r.charges.map(c => `<div class="fine"><span>${esc(c.note)}</span><b>− ${rs(c.amt)}</b></div>`).join('')}
        ${short && s.choice === 'fine' ? `<div class="fine"><span>Fine for missing items</span><b>− ${rs(r.fine)}</b></div>` : ''}
        ${!short || s.choice === 'fine' ? settle(r.balance) : `<div><span>Deposit balance</span><b>${rs(r.balance)}</b></div>`}
      </section>`;
    let primary;
    if (!short) primary = `<button class="btn primary lg" data-act="retConfirm" data-c="complete">${V.art('check')}<span>Complete return${r.balance >= 0 ? ' · refund ' + rs(r.balance) : ''}</span></button>`;
    else if (s.choice === 'fine') primary = `<button class="btn danger lg" data-act="retConfirm" data-c="fine">${V.art('coin')}<span>Settle with fine ${rs(r.fine)}</span></button>`;
    else if (s.choice === 'remind') primary = `<button class="btn amber lg" data-act="retConfirm" data-c="remind">${V.art('bell')}<span>Save & remind every ${set.reminderEvery} days</span></button>`;
    else primary = `<button class="btn ghost lg" data-act="retScroll">${V.art('coin')}<em class="or">/</em>${V.art('bell')}<span>${V.t('choose')}</span></button>`;
    return {
      size: 'wide',
      title: `${V.art('back')} ${V.t('return_check')} · <span class="mono">${o.code}</span>`,
      body: `<div class="rtop"><div><h2>${esc(o.cust.group || o.cust.name)}</h2><p class="muted">${esc(o.cust.name)} · due ${V.fmtD(o.due)}${r.lateDays ? ` · <b class="red">${V.plural(r.lateDays, 'day')} late</b>` : ''}</p></div>
          <p class="hint">Count what is on the counter. Everything starts as “all back” — tap − for anything missing.</p></div>
        <div class="rgrid">
          <div class="rcol">${studentHtml(s)}${V.scanBox('in')}${lineHtml}<div class="photo-row">${V.photoSlot(s.photoKey, 'What came back')}${V.camBtn(s.photoKey, 'Photo of returned items', 'inPhoto')}</div>${condHtml}${lateHtml}
            <label class="notefield">Note (what the customer said)<input data-bind="retNote" value="${esc(s.note)}" placeholder="e.g. Will bring the last set tomorrow"></label></div>
          <div class="rcol side">${decision}${summary}</div>
        </div>`,
      foot: `<span class="grow"></span>${primary}`
    };
  };
  V.act.retStep = d => {
    const s = V.sheetState; const o = V.order(s.id); const li = +d.li, pi = +d.pi;
    const L = s.lines[li]; const c = V.cost(o.lines[li].cid); const l = o.lines[li];
    const max = l.qty * c.pieces[pi].q; const min = L.prev[pi];
    const nv = Math.min(max, Math.max(min, L.pr[pi] + (+d.d)));
    const delta = nv - L.pr[pi];
    L.pr[pi] = nv;
    if (pi === 0) {
      // Pieces follow the costume count unless staff adjusted them individually.
      c.pieces.forEach((p, k) => { if (k && !L.touched[k]) L.pr[k] = Math.min(l.qty * p.q, Math.max(L.prev[k], L.pr[k] + delta * p.q)); });
      s.dmg[li] = Math.min(s.dmg[li], Math.max(0, L.pr[0] - L.prev[0]));
    } else L.touched[pi] = true;
    s.fine = null;
    V.renderSheet();
  };
  V.act.retAll = d => {
    const s = V.sheetState; const o = V.order(s.id); const li = +d.li; const l = o.lines[li];
    s.lines[li].pr = V.cost(l.cid).pieces.map(p => l.qty * p.q); s.lines[li].touched = {}; s.fine = null; V.renderSheet();
  };
  V.act.retScroll = () => { const el = document.querySelector('#sheet .decide'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  V.act.retChoice = d => { V.sheetState.choice = d.c; V.renderSheet(); };
  V.act.retCond = d => {
    const s = V.sheetState; s.cond = d.c;
    s.dmgFee = d.c === 'damaged' ? V.state.settings.damageFee : d.c === 'minor' ? 0 : s.dmgFee;
    if (d.c !== 'good' && !s.dmg.some(n => n)) { const L = s.lines[0]; s.dmg[0] = Math.min(1, L.pr[0] - L.prev[0]); }
    V.renderSheet();
  };
  V.act.retDmg = d => { const s = V.sheetState; const li = +d.li; const L = s.lines[li]; s.dmg[li] = Math.min(L.pr[0] - L.prev[0], Math.max(0, s.dmg[li] + (+d.d))); V.renderSheet(); };
  V.bind.retDmgFee = (el, type) => { if (type !== 'input') return; V.sheetState.dmgFee = num(el.value); liveRender(el); };
  V.bind.retFine = (el, type) => { if (type !== 'input') return; V.sheetState.fine = num(el.value); liveRender(el); };
  V.bind.retLate = el => { V.sheetState.lateOn = el.checked; V.renderSheet(); };
  V.bind.retNote = el => { V.sheetState.note = el.value; };
  V.act.retConfirm = d => {
    const s = V.sheetState; const r = calcReturn(s);
    const dmg = {}; if (s.cond !== 'good') s.dmg.forEach((n, i) => { if (n) dmg[i] = n; });
    const o = V.recordCheck(s.id, { lines: s.lines.map(L => ({ pr: L.pr })), damaged: dmg, charges: r.charges, note: s.note, photo: s.inPhoto ? s.photoKey : null, students: s.students && s.students.length ? s.students.map(st => ({ now: stuNow(V.order(s.id), st) })) : null }, d.c, r.fine);
    V.render();
    if (d.c === 'remind') { V.closeSheet(); V.celebrate('reminder', `${o.code} · next ${V.fmtD(o.reminder.next)}`); }
    else { V.openSheet('order', { id: o.id }); V.celebrate(d.c === 'fine' ? 'fine' : 'returned', o.balanceDue ? `Collect ${rs(o.balanceDue)}` : `Refund ${rs(o.refund)}`); }
  };
;

  /* ================= DEMO CLOCK ================= */
  V.act.clockMenu = () => V.openSheet('clock');
  SHEETS.clock = () => {
    const s = V.state.settings; const due = V.remindersDue().length;
    return {
      title: 'Date',
      body: `<div class="clockbox"><small>Counter date</small><h2>${V.fmtLong(V.today())}</h2>
        ${s.dayOffset ? `<p class="note amber">${ic('ff')} Demo mode: ${V.plural(s.dayOffset, 'day')} ahead of the real date (${V.fmtD(V.realToday())}).</p>` : '<p class="muted">Matches the tablet’s real date.</p>'}
        <p class="muted small">Use the demo clock to walk the owner through a week: watch returns go overdue and 2-day reminders come due again. ${due ? `<b>${due}</b> reminder(s) due on this date.` : ''}</p></div>`,
      foot: `${s.dayOffset ? V.btn('Back to real date', 'clockReset', {}, 'ghost', 'undo') : ''}<span class="grow"></span>
        ${V.btn('+2 days', 'clockAdd', { n: 2 }, 'ghost', 'ff')}${V.btn('Next day', 'clockAdd', { n: 1 }, 'primary lg', 'ff')}`
    };
  };
  V.act.clockAdd = d => { V.state.settings.dayOffset += +d.n; V.save(); V.render(); V.renderSheet(); V.toast(`Counter date: ${V.fmtD(V.today())}`); };
  V.act.clockReset = () => { V.state.settings.dayOffset = 0; V.save(); V.render(); V.renderSheet(); };
})(window.V);
