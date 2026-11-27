/* Vividham — "More" screens: customers, stock & cleaning, choreography, settings, about;
   plus Showcase mode, printable rental slip, and add/edit costume. */
(function (V) {
  const { esc, ic, rs } = V;
  const SUB = {};
  V.SUB = SUB;

  /* ---------- Customers ---------- */
  SUB.customers = () => {
    const map = new Map();
    V.state.orders.forEach(o => {
      const k = o.cust.phone.replace(/\D/g, '');
      const c = map.get(k) || { ...o.cust, orders: [], sets: 0, spent: 0, open: 0, fines: 0 };
      c.orders.push(o); c.sets += V.orderQty(o);
      if (o.status !== 'cancelled' && o.status !== 'booked') c.spent += V.orderTotal(o);
      if (o.status === 'partial' || V.status(o) === 'overdue') c.open++;
      c.fines += V.fines(o);
      map.set(k, c);
    });
    const list = [...map.values()].sort((a, b) => b.open - a.open || b.spent - a.spent);
    return `<div class="pagehead"><div><h1>Customers</h1><p class="lead">${V.plural(list.length, 'customer')} · schools, troupes and families</p></div></div>
      <div class="list">${list.map(c => `<article class="ccard">
        <div class="avatar">${esc((c.group || c.name).trim()[0] || '?')}</div>
        <div class="obody"><div class="otop"><h3>${esc(c.group || c.name)}</h3>${V.trustChip(c.phone)}${c.open ? `<span class="chip st-partial">${c.open} open</span>` : ''}</div>
          <div class="osub">${esc(c.name)} · ${esc(c.phone)}</div>
          <div class="ometa">${V.plural(c.orders.length, 'order')} · ${V.plural(c.sets, 'set')} · ${rs(c.spent)} business${c.fines ? ` · fines ${rs(c.fines)}` : ''}</div>
          <details class="idwrap"><summary>${V.art('cat-mask')} ID, photos & measurements</summary>${V.idCard(c.phone)}${(() => { const m = (V.customer(c.phone).measure) || {}; return Object.keys(m).length ? `<p class="muted small">Measurements: ${Object.entries(m).filter(([, x]) => x).map(([k, x]) => `${k} ${esc(x)}"`).join(' · ')}</p>` : ''; })()}</details>
          <div class="chips">${c.orders.map(o => `<button class="pick" data-act="openOrder" data-id="${o.id}"><span class="mono">${o.code}</span> ${V.fmtD(o.pickup)}</button>`).join('')}</div>
        </div>
        <a class="iconbtn wa" href="${V.waLink(c.phone, `Namaste ${c.name.split(' ')[0]} 🙏 — ${V.state.settings.shopName}`)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('wa')}</a>
      </article>`).join('')}</div>`;
  };

  /* ---------- Stock & cleaning ---------- */
  SUB.stock = () => {
    const t = V.today();
    const batches = V.state.cleaning.filter(b => !b.done && b.ready > t).sort((a, b) => a.ready.localeCompare(b.ready));
    return `<div class="pagehead"><div><h1>Stock & cleaning</h1><p class="lead">Returned sets rest in the dry-cleaning / repair buffer before they can go out again.</p></div>
        ${V.btn('Add costume', 'addCostume', {}, 'primary', 'plus')}</div>
      <h2 class="sec">${ic('drop')} In cleaning & repair · ${batches.reduce((a, b) => a + b.qty, 0)} sets</h2>
      ${batches.length ? `<div class="list">${batches.map(b => { const c = V.cost(b.cid); return `<div class="cbatch ${b.kind}">
          <img src="${V.img(c, b.vid)}" alt="">
          <div><b>${b.qty} × ${esc(V.lineLabel(b))}</b><small>${b.kind === 'alter' ? `Alteration to revert: ${esc(b.note || '')} · from ${esc(b.from)} · blocked until done` : `${b.kind === 'repair' ? 'Repair' : 'Dry-clean'} · from ${esc(b.from)} · ready ${V.relDay(b.ready)} (${V.fmtD(b.ready)})`}</small></div>
          <div class="bact">${V.vendorBatchActions(b)}</div></div>`; }).join('')}</div>` : `<div class="note ok">${ic('check')} Nothing in the buffer.</div>`}
      <h2 class="sec">${ic('package')} Stock by costume</h2>
      <div class="stocktable">
        <div class="sthead"><span>Costume</span><span>Total</span><span>Out</span><span>Cleaning</span><span>Ready</span><span></span></div>
        ${V.state.costumes.map(c => c.variants.map((v, i) => {
          const out = V.state.orders.filter(o => ['out', 'partial'].includes(o.status)).reduce((s, o) => s + o.lines.filter(l => l.cid === c.id && l.vid === v.id).reduce((a, l) => a + l.qty - (l.pr[0] || 0), 0), 0);
          return `<div class="strow ${i ? 'sub' : ''}">
            <span class="stname">${i === 0 ? `<img src="${V.img(c, v.id)}" alt="">` : '<i></i>'}<span><b>${i === 0 ? esc(c.name) : ''}</b>${c.variants.length > 1 ? `<small>${esc(v.label)}</small>` : ''}</span></span>
            <span>${v.stock}</span><span>${out || '–'}</span><span>${V.inCleaning(c.id, v.id) || '–'}</span><span class="rd">${V.readyNow(c.id, v.id)}</span>
            <span><button class="iconbtn" data-act="editStock" data-id="${c.id}" data-vid="${v.id}" aria-label="Edit">${ic('edit')}</button></span></div>`;
        }).join('')).join('')}
      </div>`;
  };
  V.act.cleanReady = d => { V.cleanReady(d.id); V.render(); V.toast('Marked ready for rental'); };

  V.act.editStock = d => V.openSheet('editStock', { id: d.id, vid: d.vid });
  V.SHEETS.editStock = s => {
    const c = V.cost(s.id); const v = V.variant(c, s.vid);
    const f = (label, key, val) => `<label>${label}<input inputmode="numeric" data-bind="stk" data-k="${key}" value="${val}"></label>`;
    return {
      title: `Edit · ${esc(V.lineLabel({ cid: c.id, vid: v.id }))}`,
      body: `<div class="editgrid"><img src="${V.img(c, v.id)}" alt="">
        <div class="form">
          <div class="row2">${f('Sets in stock (this ' + (c.variants.length > 1 ? 'option' : 'costume') + ')', 'stock', v.stock)}${f('Cleaning days after return', 'turnaround', c.turnaround)}</div>
          <div class="row3">${f('Rent / set ₹', 'rate', c.rate)}${f('Extra day ₹', 'extraDay', c.extraDay)}${f('Deposit / set ₹', 'deposit', c.deposit)}</div>
          <div class="row-actions">${V.btn('Print QR tags for these sets', 'printTags', { id: c.id, vid: v.id }, 'ghost sm', null, 'receipt')}${V.btn('Calendar', 'openCalendar', { id: c.id, vid: v.id }, 'ghost sm', null, 'booked')}</div>
          <div class="label">Lost-piece charges</div>
          <div class="row3">${c.pieces.map((p, i) => `<label>${esc(p.n)} ₹<input inputmode="numeric" data-bind="stkFee" data-k="${i}" value="${p.fee}"></label>`).join('')}</div>
        </div></div>`,
      foot: `<span class="grow"></span>${V.btn('Done', 'closeSheet', {}, 'primary lg', 'check')}`
    };
  };
  V.bind.stk = (el, type) => {
    if (type !== 'change') return;
    const s = V.sheetState; const c = V.cost(s.id); const n = Math.max(0, parseInt(el.value, 10) || 0);
    if (el.dataset.k === 'stock') V.variant(c, s.vid).stock = n; else c[el.dataset.k] = n;
    V.save(); V.render();
  };
  V.bind.stkFee = (el, type) => { if (type !== 'change') return; V.cost(V.sheetState.id).pieces[+el.dataset.k].fee = Math.max(0, parseInt(el.value, 10) || 0); V.save(); };

  /* ---------- Render studio: garment photo + basic info → Codex mockup ---------- */
  V.studio = { online: null };
  V.checkStudio = () => fetch('api/health', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => { V.studio.online = !!(j && j.ok); return V.studio.online; }).catch(() => (V.studio.online = false));
  const PIECE_ICONS = { necklace: 'necklace', jewellery: 'necklace', haram: 'necklace', jhumka: 'jhumka', earring: 'jhumka', belt: 'belt', oddiyanam: 'belt', kamarbandh: 'belt', ghungroo: 'ghungroo', bells: 'ghungroo',
    crown: 'crown', mukut: 'crown', kirita: 'kireeta', head: 'headset', jada: 'headset', turban: 'turban', pagg: 'turban', pheta: 'turban', cap: 'cap', hat: 'cap', flower: 'flower', veni: 'flower',
    bangle: 'bangles', armlet: 'armlet', flute: 'flute', dupatta: 'dupatta', stole: 'dupatta', odhni: 'dupatta', skirt: 'skirt', lehenga: 'skirt', top: 'top', jacket: 'top', trouser: 'trousers', pant: 'trousers',
    sticks: 'sticks', dandiya: 'sticks', sword: 'sword', mala: 'mala', pot: 'pot', wings: 'wings', shoe: 'shoe', mojari: 'shoe' };
  const iconFor = n => { const k = Object.keys(PIECE_ICONS).find(k => n.toLowerCase().includes(k)); return k ? PIECE_ICONS[k] : 'costume'; };

  SUB.studio = () => {
    const items = V.state.costumes; const total = items.reduce((s, c) => s + c.variants.length, 0);
    const done = items.reduce((s, c) => s + c.variants.filter(v => V.hasRender(c, v.id)).length, 0);
    const waiting = items.flatMap(c => c.variants.filter(v => !V.hasRender(c, v.id)).map(v => ({ c, v }))).slice(0, 24);
    if (V.studio.online === null) V.checkStudio().then(() => { if (V.ui.sub === 'studio') V.render(); });
    return `<section class="studio-hero">
        <div class="sh-steps">${[['camera', 'Phone photo'], ['receipt', 'Basic info'], ['studio', 'Codex studio'], ['sparkle', 'Catalogue image']].map(([a, l], i) => `${i ? '<i class="sh-line"></i>' : ''}<span>${V.art(a === 'camera' ? 'studio' : a, 'draw')}<small>${l}</small></span>`).join('')}</div>
        <div><p class="eyebrow">Render studio</p><h1>One shoot, every costume</h1>
          <p class="lead">Snap any garment on a hanger or table. The studio re-shoots it on the Vividham grey backdrop with a model, the same light and the same framing, so the whole catalogue looks like one photoshoot.</p>
          <div class="row-actions">${V.btn('Add a garment', 'addCostume', {}, 'primary lg', null, 'studio')}
            <span class="studio-state ${V.studio.online ? 'on' : V.studio.online === false ? 'off' : ''}">${V.studio.online ? '● Studio connected' : V.studio.online === false ? '○ Studio offline — jobs download for the inbox' : '… checking studio'}</span></div></div>
      </section>
      <div class="meter"><div><b>${done}</b> of ${total} colourways shot in studio</div>${V.progress(done, total)}</div>
      <h2 class="sec">${V.art('studio')} Waiting for a studio photo</h2>
      <div class="pgrid sm">${waiting.map(({ c, v }) => V.productTile(c, { vid: v.id })).join('')}</div>
      <p class="muted small">Run <code>node render-engine/render.mjs --list</code> on the shop laptop for the full queue. Style rules: <code>render-engine/style.md</code>.</p>`;
  };

  V.act.addCostume = () => V.openSheet('addCostume', { f: { name: '', cat: 'classical', age: 'adult', model: 'adult-f', rate: 500, deposit: 1000, stock: 10, variant: '', colours: '', pieces: 'Stitched costume, Jewellery set, Ghungroo (pair)', notes: '', img: null } });
  V.SHEETS.addCostume = s => {
    const f = s.f;
    if (s.busy) return { size: 'wide', title: `${V.art('studio')} Render studio`, body: studioLoader(s), foot: s.done ? `<span class="grow"></span>${V.btn('Open costume', 'openNew', { id: s.newId }, 'primary lg', null, 'hanger')}` : `<span class="grow"></span>${V.btn('Keep working — it finishes in the background', 'closeSheet', {}, 'ghost')}` };
    return {
      size: 'wide', title: `${V.art('studio')} Add a garment`,
      body: `<div class="editgrid">
        <label class="photo-drop ${f.img ? 'has' : ''}">${f.img ? `<img src="${f.img}" alt="">` : `${V.art('studio', 'draw big')}<span>Photo of the garment</span><small>On a hanger, mannequin or table. Any background, any light — the studio fixes it.</small>`}
          <input type="file" accept="image/*" data-bind="acPhoto" hidden></label>
        <div class="form">
          <label>Costume name<input data-bind="ac" data-k="name" value="${esc(f.name)}" placeholder="e.g. Yakshagana Kids Set"></label>
          <div class="label">Category</div>
          <div class="chips catpick">${V.CATS.filter(k => k.id !== 'all').map(k => `<button class="pick ${f.cat === k.id ? 'on' : ''}" data-act="acCat" data-cat="${k.id}">${V.art(k.icon)}${esc(k.label)}</button>`).join('')}</div>
          <div class="label">Who wears it</div>
          <div class="chips">${[['kids', 'kids', 'Child'], ['adult-f', 'adult', 'Woman'], ['adult-m', 'adult', 'Man'], ['unisex-pair', 'adult', 'Couple'], ['flat', 'all', 'No model (accessory)']].map(([m, a, l]) => `<button class="pick ${f.model === m ? 'on' : ''}" data-act="acModel" data-model="${m}" data-age="${a}">${l}</button>`).join('')}</div>
          <div class="row2"><label>Colour name<input data-bind="ac" data-k="variant" value="${esc(f.variant)}" placeholder="e.g. Red & gold"></label>
            <label>Colours (comma)<input data-bind="ac" data-k="colours" value="${esc(f.colours)}" placeholder="red, gold"></label></div>
          <div class="row3">
            <label>Rent / set ₹<input inputmode="numeric" data-bind="ac" data-k="rate" value="${f.rate}"></label>
            <label>Deposit ₹<input inputmode="numeric" data-bind="ac" data-k="deposit" value="${f.deposit}"></label>
            <label>Sets in stock<input inputmode="numeric" data-bind="ac" data-k="stock" value="${f.stock}"></label>
          </div>
          <label>Pieces in each set <small>(first = main costume)</small><textarea data-bind="ac" data-k="pieces" rows="2">${esc(f.pieces)}</textarea></label>
          <div class="setrow sm">${f.pieces.split(',').map(x => x.trim()).filter(Boolean).map(n => `<span class="setp">${V.art(iconFor(n))}<small>${esc(n)}</small></span>`).join('')}</div>
          <label>Notes for the studio <small>(fabric, borders, how it is worn)</small><input data-bind="ac" data-k="notes" value="${esc(f.notes)}" placeholder="full flare, gota border, net dupatta"></label>
        </div></div>`,
      foot: `<span class="muted small">${V.studio.online ? 'Sends to Codex on the shop laptop' : 'Studio offline: saves the costume and downloads a job file for render-engine/inbox'}</span><span class="grow"></span>${V.btn('Save & send to studio', 'saveCostume', {}, 'primary lg', null, 'sparkle')}`
    };
  };
  function studioLoader(s) {
    const steps = [['studio', 'Backdrop & light'], ['cat-classical', 'Model & pose'], ['hanger', 'Garment fitting'], ['sparkle', 'Final touches']];
    const el = s.done ? 4 : Math.min(3, Math.floor((Date.now() - s.started) / 30000));
    return `<div class="studio-load ${s.done ? 'done' : ''} ${s.error ? 'err' : ''}">
      <div class="sl-stage">${s.done && s.src ? `<img class="sl-result" src="${s.src}" alt="">` : `${V.dancer('draw loop')}<span class="flash"></span>`}</div>
      <div class="sl-steps">${steps.map(([a, l], i) => `<span class="${i < el ? 'ok' : i === el ? 'now' : ''}">${V.art(i < el ? 'check' : a)}<small>${l}</small></span>`).join('<i></i>')}</div>
      <p>${s.error ? `Studio problem: ${esc(s.error)}` : s.done ? 'Shot! Added to the catalogue.' : `Codex is shooting “${esc(s.f.name)}” · about 2 minutes`}</p>
      ${s.done || s.error ? '' : V.loader()}
    </div>`;
  }
  V.act.acCat = d => { V.sheetState.f.cat = d.cat; V.renderSheet(); };
  V.act.acModel = d => { Object.assign(V.sheetState.f, { model: d.model, age: d.age }); V.renderSheet(); };
  V.bind.ac = (el, type) => { V.sheetState.f[el.dataset.k] = el.value; if (el.dataset.k === 'pieces' && type === 'change') V.renderSheet(); };
  V.bind.acPhoto = (el, type) => {
    if (type !== 'change' || !el.files[0]) return;
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 1400 / Math.max(im.width, im.height));
        const cv = document.createElement('canvas'); cv.width = im.width * k; cv.height = im.height * k;
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        V.sheetState.f.img = cv.toDataURL('image/jpeg', 0.85); V.renderSheet();
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(el.files[0]);
  };
  V.act.saveCostume = async () => {
    const s = V.sheetState; const f = s.f;
    if (!f.name.trim()) { V.toast('Give the costume a name'); return; }
    if (!f.img) { V.toast('Add a photo of the garment'); return; }
    const parts = f.pieces.split(',').map(x => x.trim()).filter(Boolean);
    const rate = +f.rate || 0; const vid = (f.variant.trim() || 'std').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const colours = f.colours.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    const cat = V.CATS.find(k => k.id === f.cat) || {};
    const sku = 'NEW-' + Date.now().toString(36).toUpperCase().slice(-5);
    const c = {
      id: sku, kind: f.model === 'flat' ? 'accessory' : 'costume', name: f.name.trim(), cat: f.cat, catLabel: cat.label, catKn: cat.kn, icon: f.model === 'flat' ? iconFor(f.name) : cat.icon,
      age: f.age, rate, extraDay: Math.round(rate * 0.2), deposit: +f.deposit || 0, turnaround: 2, desc: f.notes || f.name, keywords: tokensOf(f.name + ' ' + f.notes), usage: [], dance: [], theme: null,
      sizes: f.age === 'kids' ? V.SIZES.kids : f.model === 'adult-m' ? V.SIZES.men : V.SIZES.women, model: f.model, source: 'shop', renders: {},
      pieces: (parts.length ? parts : ['Costume']).map((n, i) => ({ n, q: 1, fee: i === 0 ? (+f.deposit || rate * 3) : Math.round(rate * 0.5), icon: iconFor(n), a: null })),
      variants: [{ id: vid, label: f.variant.trim() || 'Standard', stock: +f.stock || 0, colours }]
    };
    V.state.costumes.push(c); V.save(); V.render();
    const meta = { sku, name: c.name, category: c.cat, age: c.age, model: f.model, variant: vid, variant_label: c.variants[0].label, colours, accessories: parts.slice(1), notes: f.notes || c.name };
    const online = await V.checkStudio();
    if (!online) {
      const dl = (name, href) => { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); };
      dl(`${sku}.json`, URL.createObjectURL(new Blob([JSON.stringify(meta, null, 1)], { type: 'application/json' })));
      setTimeout(() => dl(`${sku}.jpg`, f.img), 300);
      V.closeSheet(); V.celebrate('booked', 'Saved · drop both files into render-engine/inbox');
      return;
    }
    Object.assign(s, { busy: true, started: Date.now(), newId: sku }); V.renderSheet(true);
    try {
      const r = await fetch('api/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ meta, photo: f.img }) }).then(r => r.json());
      const tick = setInterval(async () => {
        const jobs = await fetch('api/jobs', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
        const j = jobs[r.id];
        if (V.sheetState === s) V.renderSheet();
        if (!j || j.status === 'queued' || j.status === 'rendering') return;
        clearInterval(tick);
        if (j.status === 'done') { c.renders[`${vid}/front`] = j.src; V.save(); s.done = true; s.src = j.src; V.celebrate('render', 'New studio photo'); }
        else s.error = j.error || 'failed';
        V.render(); if (V.sheetState === s) V.renderSheet();
      }, 4000);
    } catch (e) { s.error = e.message; V.renderSheet(); }
  };
  V.act.openNew = d => { V.closeSheet(); V.act.openCostume({ id: d.id }); };
  const tokensOf = s => [...new Set(String(s).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2))];

  /* ---------- Choreography ---------- */
  SUB.choreo = () => `
    <section class="choreo-hero">
      <img src="assets/img/workshop-navratri.jpg" alt="Navratri dance workshop">
      <div><p class="eyebrow">Costumes + choreography</p><h1>From costume to curtain call</h1>
        <p class="lead">Vividham also choreographs — solo competition pieces, troupes and full school Annual Days. Add a package to any rental from the bag.</p>
        ${V.btn('Start a rental with choreography', 'newRental', {}, 'primary', 'plus')}</div>
    </section>
    <div class="pkgs">${V.CHOREO.map(p => `<div class="pkg">${ic(p.id === 'garba' ? 'sparkle' : p.id === 'annual' ? 'star' : 'music')}<b>${esc(p.label)}</b><span class="price">${rs(p.price)}</span><small>${esc(p.note)}</small></div>`).join('')}</div>
    <p class="muted small">Package prices are sample values — set yours before sharing with customers.</p>
    <div class="gallery2"><img src="assets/img/workshop-team.jpg" alt="Workshop team"><img src="assets/img/poster-annual-day.jpg" alt="Annual day poster"><img src="assets/img/kids-hiphop-group.jpg" alt="Kids troupe"></div>`;

  /* ---------- Settings ---------- */
  SUB.settings = () => {
    const s = V.state.settings;
    const n = (label, k, suf = '') => `<label>${label}<input inputmode="numeric" data-bind="set" data-k="${k}" value="${s[k]}">${suf ? `<small>${suf}</small>` : ''}</label>`;
    return `<div class="pagehead"><h1>Settings</h1></div>
      <section class="panel"><h2>Shop</h2>
        <div class="form">
          <label>Shop name<input data-bind="setTxt" data-k="shopName" value="${esc(s.shopName)}"></label>
          <label>Address<input data-bind="setTxt" data-k="address" value="${esc(s.address)}"></label>
          <div class="row2"><label>Shop phone / WhatsApp<input data-bind="setTxt" data-k="phone" value="${esc(s.phone)}"></label>
          <label>Hours<input data-bind="setTxt" data-k="hours" value="${esc(s.hours)}"></label></div>
        </div></section>
      <section class="panel"><h2>Payments, ID & approvals</h2>
        <div class="form"><div class="row3">
          <label>Shop UPI ID<input data-bind="setTxt" data-k="vpa" value="${esc(s.vpa)}" placeholder="shopname@bank"></label>
          <label>Name on UPI<input data-bind="setTxt" data-k="payeeName" value="${esc(s.payeeName)}"></label>
          <label>Owner PIN<input data-bind="setTxt" data-k="ownerPin" value="${esc(s.ownerPin)}" inputmode="numeric" maxlength="6"><small>Waives ID rule, approves risky customers</small></label></div>
          <label class="toggle"><input type="checkbox" data-bind="setBool" data-k="requireId" ${s.requireId ? 'checked' : ''}><span>Face + ID photo required before hand-over</span></label>
          <label class="toggle"><input type="checkbox" data-bind="setBool" data-k="autoSend" ${s.autoSend ? 'checked' : ''}><span>Auto-send today's WhatsApp messages at 9:30 AM (needs WhatsApp Business API on the studio server — ${V.waStatus.configured ? '<b class="green">connected</b>' : 'not connected'})</span></label></div></section>
      <section class="panel"><h2>Dry-cleaning vendors</h2>
        <div class="form">${s.vendors.map((v, i) => `<div class="row3"><label>Name<input data-bind="vendF" data-i="${i}" data-k="name" value="${esc(v.name)}"></label><label>Phone<input data-bind="vendF" data-i="${i}" data-k="phone" value="${esc(v.phone || '')}"></label><label>₹ per set<input inputmode="numeric" data-bind="vendF" data-i="${i}" data-k="rate" value="${v.rate}"></label></div>`).join('')}
          ${V.btn('Add vendor', 'vendAdd', {}, 'ghost sm', 'plus')}<p class="muted small">Spent this month: <b>${rs(V.vendorSpend())}</b></p></div></section>
      <section class="panel"><h2>Rental rules</h2>
        <div class="form"><div class="row3">
          ${n('Standard rental cycle (days)', 'cycleDays')}
          ${n('Reminder every (days)', 'reminderEvery', 'From the meeting: every 2 days')}
          ${n('Late fee ₹ / set / day', 'lateFee')}
          ${n('Damage charge ₹ / set', 'damageFee', 'Default; editable on each return')}
          ${n('Extra repair days', 'repairDays', 'Added to cleaning for damaged sets')}
        </div></div></section>
      <section class="panel"><h2>WhatsApp messages</h2>
        <p class="muted small">Placeholders: {name} {group} {order} {items} {missing} {pickup} {due} {deposit} {refund} {total} {shop} {phone} {hours}</p>
        <div class="form">
          ${[['booking', 'Booking confirmation & quote'], ['reminder', 'Return reminder'], ['closed', 'Return receipt']].map(([k, l]) => `<label>${l}<textarea rows="6" data-bind="tpl" data-k="${k}">${esc(s.tpl[k])}</textarea></label>`).join('')}
        </div></section>
      <section class="panel"><h2>Icon style</h2>
        <div class="chips">
          <button class="pick ${s.iconSet !== 'line' ? 'on' : ''}" data-act="iconSet" data-v="codex">${V.art('ghungroo')} Illustrated (Codex)</button>
          <button class="pick ${s.iconSet === 'line' ? 'on' : ''}" data-act="iconSet" data-v="line">${V.artSvg('ghungroo')} Line (animated)</button>
        </div>
        <p class="muted small">Illustrated icons are drawn by Codex from design/prompts (tools/icon-sheets.mjs). The line set draws itself on screen and is used wherever an illustrated icon is missing.</p></section>
      <section class="panel"><h2>Data on this tablet</h2>
        <p class="muted small">This concept keeps everything on this device. Export a backup regularly; import it on another tablet to move data.</p>
        <div class="row-actions">
          ${V.btn('Export backup', 'exportData', {}, 'ghost', 'download')}
          <label class="btn ghost">${ic('upload')}<span>Import backup</span><input type="file" accept="application/json" data-bind="importData" hidden></label>
          ${V.btn('Reset demo data', 'resetData', {}, 'ghost danger', 'undo')}
        </div></section>`;
  };
  V.act.iconSet = d => { V.state.settings.iconSet = d.v; V.save(); V.render(); };
  V.bind.set = (el, type) => { if (type !== 'change') return; V.state.settings[el.dataset.k] = Math.max(0, parseInt(el.value, 10) || 0); V.save(); V.toast('Saved'); };
  V.bind.setBool = el => { V.state.settings[el.dataset.k] = el.checked; V.save(); };
  V.bind.vendF = el => { const v = V.state.settings.vendors[+el.dataset.i]; v[el.dataset.k] = el.dataset.k === 'rate' ? (+el.value || 0) : el.value; V.save(); };
  V.act.vendAdd = () => { V.state.settings.vendors.push({ id: 'v' + V.uid(), name: 'New vendor', phone: '', rate: 50 }); V.save(); V.render(); };
  V.bind.setTxt = (el, type) => { V.state.settings[el.dataset.k] = el.value; V.save(); };
  V.bind.tpl = el => { V.state.settings.tpl[el.dataset.k] = el.value; V.save(); };
  V.act.exportData = () => {
    const blob = new Blob([JSON.stringify(V.state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `vividham-backup-${V.today()}.json`; a.click();
  };
  V.bind.importData = (el, type) => {
    if (type !== 'change' || !el.files[0]) return;
    el.files[0].text().then(t => {
      try { const s = JSON.parse(t); if (!s.costumes || !s.orders) throw 0; if (!confirm('Replace all data on this tablet with the backup?')) return; V.state = s; V.save(); V.render(); V.toast('Backup imported'); }
      catch (e) { V.toast('That file is not a Vividham backup'); }
    });
  };
  V.act.resetData = () => { if (!confirm('Reset to the sample demo data? All changes on this tablet will be lost.')) return; V.reset(); V.go('today'); V.toast('Demo data restored'); };

  /* ---------- About / roadmap ---------- */
  SUB.roadmap = () => `
    <div class="pagehead"><div><p class="eyebrow">Concept build · for review with the owner</p><h1>About this app</h1></div></div>
    <section class="panel"><h2>Built from the consultation</h2>
      <ol class="flow">
        <li><b>Return order → Check</b><span>Count costumes and every loose piece (ghungroo, crown, belt…) on the counter.</span></li>
        <li><b>Short? Two choices</b><span><em class="tag red">Add fine</em> deducts from the deposit and closes the order — or <em class="tag amber">2-day reminder</em> keeps it open.</span></li>
        <li><b>Reminder every 2 days</b><span>Due reminders surface on Today and Reminders with a one-tap pre-filled WhatsApp, until everything is back or fined.</span></li>
        <li><b>Cleaning buffer</b><span>Returned sets rest 2–3 days before they can be booked again, so nothing is double-booked.</span></li>
      </ol></section>
    <section class="panel"><h2>Phased plan</h2>
      <div class="phases">
        <div><span class="tag">Phase 1 · weeks 1–3</span><b>Counter app</b><p>Orders, hand-over, Return & Check, fines, 2-day reminders with WhatsApp links, stock & cleaning buffer. <em>This concept.</em></p></div>
        <div><span class="tag">Phase 2 · weeks 4–6</span><b>Cloud & public catalogue</b><p>Shared database for several tablets/phones, staff logins, public catalogue website with quote requests from schools & troupes.</p></div>
        <div><span class="tag">Phase 3 · weeks 7–8</span><b>Automation</b><p>Automatic WhatsApp Business reminders at 9:30 AM, QR tags on high-value sets & jewellery boxes, choreography bookings.</p></div>
      </div></section>
    <section class="panel"><h2>Notes for this concept</h2>
      <ul class="bullets">
        <li>Photos are from @vividham.costumes on Instagram. Rates, deposits, stock and customers are <b>sample data</b>.</li>
        <li>Data stays on this tablet (browser storage). Use Settings → Export backup.</li>
        <li>The date chip at the top is a demo clock to show reminders coming due.</li>
      </ul></section>`;

  /* ---------- Showcase (customer-facing) ---------- */
  V.act.showcase = () => { document.body.classList.add('showcase'); V.showcaseCat = 'all'; renderShowcase(); };
  function renderShowcase() {
    const el = document.getElementById('showcase');
    const cats = V.CATS.filter(k => k.id === 'all' || V.state.costumes.some(c => c.cat === k.id));
    const list = V.state.costumes.filter(c => V.showcaseCat === 'all' || c.cat === V.showcaseCat);
    const tiles = list.filter(c => c.kind !== 'accessory').flatMap(c => { const r = c.variants.filter(v => V.hasRender(c, v.id)); return (r.length ? r : [c.variants[0]]).map(v => ({ c, v })); }).sort((a, b) => V.hasRender(b.c, b.v.id) - V.hasRender(a.c, a.v.id));
    el.innerHTML = `<header class="sc-head"><img src="assets/img/logo.jpg" alt=""><div><b>Vividham</b><small>The Costume Wardrobe · Kudroli, Mangalore</small></div>
        <button class="iconbtn" data-act="exitShowcase" aria-label="Exit showcase">${ic('x')}</button></header>
      <nav class="sc-cats">${cats.map(k => `<button class="${V.showcaseCat === k.id ? 'on' : ''}" data-act="scCat" data-cat="${k.id}">${k.label}</button>`).join('')}</nav>
      <div class="sc-grid">${tiles.map(({ c, v }) => `<button class="sc-tile" data-act="scZoom" data-src="${esc(V.img(c, v.id))}" data-name="${esc(c.name)}" data-sub="${esc(c.variants.length > 1 ? v.label : c.age)}" data-price="${rs(c.rate)} / set">
        <img loading="lazy" src="${V.img(c, v.id)}" alt="${esc(c.name)}"><span><b>${esc(c.name)}</b>${c.variants.length > 1 ? `<small>${esc(v.label)}</small>` : ''}</span></button>`).join('')}</div>
      <footer class="sc-foot">${ic('phone')} ${esc(V.state.settings.phone)} · ${esc(V.state.settings.hours)} · Fancy dress · Classical · Navratri · Western · Choreography</footer>
      <div id="sc-zoom" hidden></div>`;
    el.hidden = false; el.scrollTop = 0;
  }
  V.act.scCat = d => { V.showcaseCat = d.cat; renderShowcase(); };
  V.act.scZoom = d => {
    const z = document.getElementById('sc-zoom');
    z.innerHTML = `<div class="zoomwrap" data-act="scClose"><img src="${d.src}" alt=""><div class="zcap"><b>${d.name}</b><span>${d.sub}</span><em>${d.price}</em></div></div>`;
    z.hidden = false;
  };
  V.act.scClose = () => { document.getElementById('sc-zoom').hidden = true; };
  V.act.exitShowcase = () => { document.body.classList.remove('showcase'); document.getElementById('showcase').hidden = true; };

  /* ---------- Printable rental slip ---------- */
  V.act.printSlip = d => {
    const o = V.order(d.id); const s = V.state.settings;
    document.getElementById('print').innerHTML = `
      <div class="slip">
        <header><img src="assets/img/logo.jpg" alt=""><div><h1>${esc(s.shopName)}</h1><p>${esc(s.address)}</p><p>${esc(s.phone)} · ${esc(s.hours)}</p></div>
          <div class="sno"><b>${o.code}</b><span>${V.fmtD(o.created || o.pickup)}</span></div></header>
        <table class="kv"><tr><td>Customer</td><td><b>${esc(o.cust.name)}</b> · ${esc(o.cust.phone)}</td></tr>
          <tr><td>School / troupe</td><td>${esc(o.cust.group)}</td></tr><tr><td>Event</td><td>${esc(o.event)}</td></tr>
          <tr><td>Pickup</td><td>${V.fmtD(o.pickup)}</td></tr><tr><td>Return by</td><td><b>${V.fmtD(o.due)}</b> before 6 PM</td></tr></table>
        <table class="items"><thead><tr><th>Item</th><th>Qty</th><th>Pieces per set (check on return)</th><th>Out</th><th>Back</th></tr></thead><tbody>
          ${o.lines.map(l => { const c = V.cost(l.cid); return c.pieces.map((p, i) => `<tr>${i === 0 ? `<td rowspan="${c.pieces.length}"><b>${esc(V.lineLabel(l))}</b></td><td rowspan="${c.pieces.length}">${l.qty}</td>` : ''}<td>${esc(p.n)}</td><td>${l.qty * p.q}</td><td>${l.pr[i] || ''}</td></tr>`).join(''); }).join('')}
        </tbody></table>
        <table class="kv money"><tr><td>Rent</td><td>${rs(o.rent)}</td></tr>${o.choreo ? `<tr><td>Choreography (${esc(o.choreo.label)})</td><td>${rs(o.choreo.price)}</td></tr>` : ''}
          ${o.discount ? `<tr><td>Discount</td><td>− ${rs(o.discount)}</td></tr>` : ''}<tr><td><b>Total</b></td><td><b>${rs(V.orderTotal(o))}</b></td></tr>
          <tr><td>Refundable deposit</td><td>${rs(o.deposit)}</td></tr>${(o.fines || []).map(f => `<tr><td>${esc(f.note)}</td><td>− ${rs(f.amt)}</td></tr>`).join('')}</table>
        <p class="terms">Late return: ${rs(s.lateFee)} per set per day. Missing or damaged pieces are charged at replacement value from the deposit. Please return costumes unwashed — we dry-clean them.</p>
        <div class="sign"><span>Customer signature</span><span>For Vividham</span></div>
      </div>`;
    setTimeout(() => window.print(), 60);
  };
})(window.V);
