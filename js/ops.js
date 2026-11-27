/* Vividham — counter operations (Tier 1 & 2):
   photo store · customer ID & trust score · photo check-out/in · UPI ledger · WhatsApp auto-queue
   · school student lists · fitting & alterations · QR set tags · cleaning vendors · booking calendar. */
(function (V) {
  const { esc, ic, rs } = V;
  const S = () => V.state.settings;

  /* ================= photo store (IndexedDB; photos are too big for localStorage) ================= */
  const DB = 'vividham_photos', STORE = 'p';
  const idb = () => new Promise((ok, bad) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
  const urlCache = {};
  V.photos = {
    put: (key, dataUrl) => idb().then(db => new Promise(ok => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(dataUrl, key); t.oncomplete = () => { urlCache[key] = dataUrl; ok(); }; })),
    get: key => urlCache[key] ? Promise.resolve(urlCache[key]) : idb().then(db => new Promise(ok => { const r = db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => { if (r.result) urlCache[key] = r.result; ok(r.result || null); }; r.onerror = () => ok(null); }))
  };
  // <img data-photo="key"> placeholders get filled after each render.
  V.hydratePhotos = () => document.querySelectorAll('img[data-photo]:not([src])').forEach(img => V.photos.get(img.dataset.photo).then(u => { if (u) img.src = u; else img.closest('.ph-slot') && img.closest('.ph-slot').classList.add('empty'); }));
  new MutationObserver(() => V.hydratePhotos()).observe(document.documentElement, { childList: true, subtree: true });
  const shrink = (file, max = 1100, q = .72) => new Promise(ok => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', q)); }; im.src = fr.result; }; fr.readAsDataURL(file); });
  // A camera button: <label> with hidden file input. On change → stores photo under key, then calls V.act[after](data)
  V.camBtn = (key, label, after = '', d = {}, cls = '') => `<label class="btn ghost cam ${cls}">${V.art('studio')}<span>${label}</span>
      <input type="file" accept="image/*" capture="environment" hidden data-bind="camPhoto" data-key="${esc(key)}" data-after="${after}" ${Object.entries(d).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}></label>`;
  V.bind.camPhoto = async (el, type) => {
    if (type !== 'change' || !el.files[0]) return;
    const url = await shrink(el.files[0]); await V.photos.put(el.dataset.key, url);
    if (el.dataset.after && V.act[el.dataset.after]) V.act[el.dataset.after]({ ...el.dataset, url });
    V.toast('Photo saved'); if (V.sheetState) V.renderSheet(); else V.render();
  };
  V.act.inPhoto = () => { if (V.sheetState) V.sheetState.inPhoto = true; };
  V.photoSlot = (key, label) => `<figure class="ph-slot"><img data-photo="${esc(key)}" alt="${esc(label)}"><figcaption>${esc(label)}</figcaption></figure>`;

  /* ================= customers, ID & trust score ================= */
  V.ckey = phone => String(phone || '').replace(/\D/g, '').slice(-10);
  V.customer = (phone, seed) => {
    const k = V.ckey(phone); if (!k) return null;
    const C = V.state.customers || (V.state.customers = {});
    if (!C[k]) C[k] = { phone: k, name: '', group: '', idType: '', idNo: '', idPhoto: null, face: null, measure: {}, upi: '', notes: '', since: V.today() };
    if (seed) Object.entries(seed).forEach(([a, b]) => { if (b && !C[k][a]) C[k][a] = b; });
    return C[k];
  };
  // Explainable score 0–100 from this customer's own history.
  V.trust = phone => {
    const k = V.ckey(phone); const os = V.state.orders.filter(o => V.ckey(o.cust.phone) === k && o.status !== 'cancelled' && o.status !== 'booked');
    if (!os.length) return { score: null, tier: 'new', label: 'New customer', mult: 1, facts: ['No rentals yet — take ID'] };
    let s = 70; const facts = []; let onTime = 0, late = 0, lateDays = 0, partial = 0, writeOff = 0, owes = 0;
    for (const o of os) {
      const lastBack = (o.returns || []).length ? o.returns[o.returns.length - 1].d : null;
      const ld = o.status === 'closed' ? Math.max(0, V.diff(o.due, o.closedOn || lastBack || o.due)) : V.lateDays(o);
      if (o.status === 'closed' && ld === 0 && !o.writtenOff) onTime++;
      if (ld > 0) { late++; lateDays += ld; }
      if (o.reminder) partial++;
      if (o.writtenOff) writeOff++;
      if (o.balanceDue) owes += o.balanceDue;
    }
    s += Math.min(25, onTime * 5) - late * 6 - Math.min(20, lateDays * 2) - partial * 8 - writeOff * 15 - (owes ? 20 : 0);
    s = Math.max(0, Math.min(100, s));
    if (onTime) facts.push(`${onTime} on-time ${onTime === 1 ? 'return' : 'returns'}`);
    if (late) facts.push(`${late} late (${lateDays} days total)`);
    if (partial) facts.push(`${partial} partial ${partial === 1 ? 'return' : 'returns'}`);
    if (writeOff) facts.push(`${writeOff} with items never returned`);
    if (owes) facts.push(`owes ${rs(owes)}`);
    const tier = s >= 75 ? 'trusted' : s >= 50 ? 'watch' : 'risky';
    return { score: s, tier, label: { trusted: 'Trusted', watch: 'Watch', risky: 'Risky' }[tier], mult: { trusted: 1, watch: 1.5, risky: 2 }[tier], facts };
  };
  V.trustChip = (phone, big) => {
    const t = V.trust(phone);
    return `<span class="trust t-${t.tier} ${big ? 'big' : ''}" title="${esc(t.facts.join(' · '))}">${V.art(t.tier === 'risky' ? 'hourglass' : t.tier === 'new' ? 'sparkle' : 'check')}<b>${t.score == null ? 'New' : t.score}</b><span>${t.label}${t.mult > 1 ? ` · deposit ×${t.mult}` : ''}</span></span>`;
  };
  V.idCard = (phone, compact) => {
    const c = V.customer(phone); if (!c) return '';
    const k = c.phone;
    return `<div class="idcard ${compact ? 'compact' : ''}">
      <div class="idph">${c.face ? V.photoSlot(c.face, 'Face') : `<div class="ph-empty">${V.art('cat-mask')}</div>`}${c.idPhoto ? V.photoSlot(c.idPhoto, 'ID') : ''}</div>
      <div class="idinfo">${V.trustChip(phone, true)}
        <div class="idrow">${V.camBtn(`cust/${k}/face`, c.face ? 'Retake face' : 'Face photo', 'custPhoto', { phone: k, field: 'face' }, 'sm')}
          ${V.camBtn(`cust/${k}/id`, c.idPhoto ? 'Retake ID' : 'ID photo', 'custPhoto', { phone: k, field: 'idPhoto' }, 'sm')}</div>
        <div class="row2"><label>ID type<select data-bind="custF" data-phone="${k}" data-k="idType">${['', 'Aadhaar', 'Driving licence', 'Voter ID', 'School letter', 'PAN', 'Other'].map(x => `<option ${c.idType === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label>Last 4 digits<input data-bind="custF" data-phone="${k}" data-k="idNo" value="${esc(c.idNo)}" maxlength="4" inputmode="numeric" placeholder="1234"></label></div>
        ${compact ? '' : `<label>Customer UPI ID (for refunds)<input data-bind="custF" data-phone="${k}" data-k="upi" value="${esc(c.upi)}" placeholder="name@bank"></label>`}
      </div></div>`;
  };
  V.act.custPhoto = d => { const c = V.customer(d.phone); c[d.field] = d.key; V.save(); };
  V.bind.custF = el => { const c = V.customer(el.dataset.phone); c[el.dataset.k] = el.value; V.save(); };
  V.needsId = phone => { const c = V.customer(phone); return S().requireId && (!c || !c.idPhoto || !c.face); };
  V.ownerOk = why => { const pin = prompt(`Owner approval needed: ${why}\nEnter owner PIN`); if (pin === null) return false; if (pin === String(S().ownerPin)) return true; alert('Wrong PIN'); return false; };

  /* ================= payments & UPI ================= */
  V.pay = (o, p) => { (o.payments = o.payments || []).push({ d: V.today(), ...p }); (o.timeline = o.timeline || []).push({ d: V.today(), t: `${p.dir === 'out' ? 'Paid out' : 'Received'} ${rs(p.amt)} · ${p.kind} · ${p.method.toUpperCase()}${p.ref ? ' · ' + p.ref : ''}` }); V.save(); };
  V.upiLink = ({ pa, pn, am, tn }) => `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn || '')}&am=${Math.round(am)}.00&cu=INR&tn=${encodeURIComponent((tn || '').slice(0, 60))}`;
  // Collect panel: shop UPI QR the customer scans with any UPI app, + "Received" buttons.
  V.collectPanel = (o, amt, kind) => {
    if (amt <= 0) return '';
    const vpa = S().vpa;
    return `<section class="paybox"><div class="pb-qr">${vpa ? `<img src="${V.qr.dataUrl(V.upiLink({ pa: vpa, pn: S().payeeName, am: amt, tn: `${o.code} ${kind}` }), { margin: 2 })}" alt="UPI QR">` : `<div class="ph-empty">${V.art('coin')}</div>`}</div>
      <div class="pb-info"><small>${V.art('coin')} Collect ${kind}</small><b>${rs(amt)}</b>
        <p class="muted small">${vpa ? `Customer scans with GPay / PhonePe / Paytm → pays <b>${esc(vpa)}</b>` : 'Add the shop UPI ID in Settings to show a payment QR here.'}</p>
        <div class="row-actions"><button class="btn primary sm" data-act="payIn" data-id="${o.id}" data-amt="${amt}" data-kind="${kind}" data-m="upi">${V.art('check')}<span>Received by UPI</span></button>
          <button class="btn ghost sm" data-act="payIn" data-id="${o.id}" data-amt="${amt}" data-kind="${kind}" data-m="cash">${V.art('coin')}<span>Cash</span></button></div></div></section>`;
  };
  V.act.payIn = d => { const o = V.order(d.id); const ref = d.m === 'upi' ? (prompt('UPI reference / UTR (optional)') || '') : ''; V.pay(o, { amt: +d.amt, dir: 'in', kind: d.kind, method: d.m, ref }); if (V.sheetState) { V.sheetState.paidNow = true; V.renderSheet(); } V.toast(`${rs(+d.amt)} recorded`); };
  // Refund panel after closing: opens the shop's UPI app with the customer's UPI ID and amount pre-filled.
  V.refundPanel = o => {
    if (!(o.refund > 0) || (o.payments || []).some(p => p.kind === 'deposit refund')) return '';
    const c = V.customer(o.cust.phone);
    return `<section class="paybox out"><div class="pb-info"><small>${V.art('coin')} Deposit refund</small><b>${rs(o.refund)}</b>
        <label class="inline">Customer UPI ID <input data-bind="custF" data-phone="${c.phone}" data-k="upi" value="${esc(c.upi)}" placeholder="name@bank"></label>
        <div class="row-actions">${c.upi ? `<a class="btn primary sm" href="${V.upiLink({ pa: c.upi, pn: o.cust.name, am: o.refund, tn: `${o.code} deposit refund` })}" data-act="refundOpen" data-id="${o.id}">${V.art('coin')}<span>Pay refund in UPI app</span></a>` : ''}
          <button class="btn ghost sm" data-act="refundDone" data-id="${o.id}" data-m="${c.upi ? 'upi' : 'cash'}">${V.art('check')}<span>Mark refunded${c.upi ? '' : ' (cash)'}</span></button></div>
        <p class="muted small">The UPI app asks for your PIN — the money moves only when staff confirm there.</p></div></section>`;
  };
  V.act.refundOpen = () => 'allow';
  V.act.refundDone = d => { const o = V.order(d.id); V.pay(o, { amt: o.refund, dir: 'out', kind: 'deposit refund', method: d.m }); V.renderSheet(); V.celebrate('returned', `Refund ${rs(o.refund)} recorded`); };
  V.ledger = o => (o.payments || []).length ? `<h3>${V.art('receipt')} Payments</h3><div class="ledger">${o.payments.map(p => `<div class="${p.dir}"><span>${V.fmtD(p.d)} · ${esc(p.kind)} · ${p.method.toUpperCase()}${p.ref ? ` · ${esc(p.ref)}` : ''}</span><b>${p.dir === 'out' ? '−' : '+'} ${rs(p.amt)}</b></div>`).join('')}</div>` : '';

  /* ================= WhatsApp auto-queue ================= */
  // Builds today's outgoing messages; each is sent once per order per kind per day.
  V.waQueue = () => {
    const t = V.today(), tm = V.addDays(t, 1), tpl = S().tpl; const q = [];
    const sent = (o, kind) => (o.waLog || []).some(x => x.kind === kind && x.d === t);
    for (const o of V.state.orders) {
      let kind = null, text = null;
      if (o.status === 'booked' && o.pickup === tm) { kind = 'pickup-tomorrow'; text = tpl.pickupTomorrow; }
      else if (o.status === 'out' && o.due === tm) { kind = 'due-tomorrow'; text = tpl.dueTomorrow; }
      else if (o.status === 'out' && o.due === t) { kind = 'due-today'; text = tpl.dueToday; }
      else if (o.status === 'out' && o.due < t) { kind = 'overdue'; text = tpl.overdue; }
      else if (o.status === 'partial' && o.reminder && o.reminder.on && o.reminder.next <= t) { kind = 'reminder'; text = tpl.reminder; }
      if (kind && text && !sent(o, kind)) q.push({ id: o.id, kind, to: o.cust.phone, name: o.cust.name, group: o.cust.group, text: V.fill(text, o) });
    }
    return q;
  };
  const markSent = (m, how) => { const o = V.order(m.id); (o.waLog = o.waLog || []).push({ d: V.today(), kind: m.kind, how }); if (m.kind === 'reminder') V.followUp(o.id, how === 'api' ? 'WhatsApp (auto)' : 'WhatsApp'); else (o.timeline = o.timeline || []).push({ d: V.today(), t: `WhatsApp: ${m.kind.replace('-', ' ')} (${how})` }); V.save(); };
  V.waStatus = { checked: false, configured: false };
  V.checkWa = () => fetch('api/wa/status', { cache: 'no-store' }).then(r => r.json()).then(j => Object.assign(V.waStatus, { checked: true, configured: !!j.configured })).catch(() => Object.assign(V.waStatus, { checked: true, configured: false }));
  V.waPanel = () => {
    const q = V.waQueue(); if (!q.length) return '';
    const kinds = { 'pickup-tomorrow': ['handover', 'Pickup tomorrow'], 'due-tomorrow': ['booked', 'Due tomorrow'], 'due-today': ['back', 'Due today'], overdue: ['hourglass', 'Overdue'], reminder: ['bell', '2-day reminder'] };
    return `<section class="wapanel"><div class="wa-h">${V.art('whatsapp')}<div><b>${q.length} WhatsApp ${q.length === 1 ? 'message' : 'messages'} for today</b><small>${V.waStatus.configured ? (S().autoSend ? 'Auto-send is ON — goes out at 9:30 AM' : 'WhatsApp Business connected') : 'Send one by one from this tablet (WhatsApp Business API not connected)'}</small></div>
        <button class="btn wa" data-act="waSendAll">${V.art('whatsapp')}<span>${V.waStatus.configured ? 'Send all now' : 'Start sending'}</span></button></div>
      <div class="wa-list">${q.map(m => `<span class="wa-item">${V.art(kinds[m.kind][0])}<b>${esc(m.group || m.name)}</b><small>${kinds[m.kind][1]}</small></span>`).join('')}</div></section>`;
  };
  V.act.waSendAll = async () => {
    const q = V.waQueue(); if (!q.length) return;
    if (V.waStatus.configured) {
      const r = await fetch('api/wa/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: q.map(m => ({ to: m.to, text: m.text, kind: m.kind, name: m.name })) }) }).then(r => r.json()).catch(e => ({ error: e.message }));
      if (r.error) { V.toast('WhatsApp send failed: ' + r.error); return; }
      q.forEach((m, i) => { if (!r.results || r.results[i].ok) markSent(m, 'api'); });
      V.render(); V.celebrate('reminder', `${(r.results || q).filter(x => x.ok !== false).length} sent`);
      return;
    }
    V.openSheet('waStep', { q, i: 0 });
  };
  V.SHEETS.waStep = s => {
    const m = s.q[s.i]; if (!m) return { title: 'WhatsApp', body: `<div class="note ok big allback">${V.art('check', 'draw')} All ${s.q.length} messages done.</div>`, foot: `<span class="grow"></span>${V.btn('Close', 'closeSheet', {}, 'primary lg')}` };
    return {
      title: `${V.art('whatsapp')} Message ${s.i + 1} of ${s.q.length}`,
      body: `<div class="wa-step"><h2>${esc(m.group || m.name)}</h2><p class="muted">${esc(m.name)} · ${esc(m.to)}</p><pre class="wa-bubble">${esc(m.text)}</pre></div>`,
      foot: `${V.btn('Skip', 'waSkip', {}, 'ghost')}<span class="grow"></span><a class="btn wa lg" href="${V.waLink(m.to, m.text)}" target="_blank" rel="noopener" data-act="waStepSent">${V.art('whatsapp')}<span>Open WhatsApp & next</span></a>`
    };
  };
  V.act.waStepSent = () => { const s = V.sheetState; markSent(s.q[s.i], 'manual'); s.i++; setTimeout(() => { V.renderSheet(); V.render(); }, 60); return 'allow'; };
  V.act.waSkip = () => { V.sheetState.i++; V.renderSheet(); };
  // 9:30 AM auto-send while the app is open on the counter tablet (server must be configured).
  setInterval(() => { const n = new Date(); if (!V.state || !S().autoSend || !V.waStatus.configured) return; if (n.getHours() > 9 || (n.getHours() === 9 && n.getMinutes() >= 30)) { if (V.waQueue().length) V.act.waSendAll(); } }, 5 * 60000);

  /* ================= school orders: student lists ================= */
  // age → size label from the size guide; adults by height if given
  V.sizeFor = (st, c) => {
    const sizes = (c && c.sizes) || []; if (!sizes.length) return '';
    const age = +st.age || 0, h = +st.height || 0;
    if (c.age === 'kids') { const i = age <= 3 ? 0 : age <= 5 ? 1 : age <= 8 ? 2 : 3; return (sizes[Math.min(i, sizes.length - 1)] || [])[0] || ''; }
    const i = h ? (h < 155 ? 0 : h < 165 ? 1 : h < 175 ? 2 : 3) : 1; return (sizes[Math.min(i, sizes.length - 1)] || [])[0] || '';
  };
  V.parseStudents = text => text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !/^name\b/i.test(l)).map((l, i) => {
    const p = l.split(/\t|,|;/).map(x => x.trim());
    const age = (p.find((x, k) => k > 0 && /^\d{1,2}(\s*y(ea)?rs?)?$/i.test(x)) || '').replace(/\D/g, '');
    const height = (p.find((x, k) => k > 0 && /^\d{2,3}\s*cm$/i.test(x)) || '').replace(/\D/g, '');
    const cls = p.find((x, k) => k > 0 && /(std|class|grade|^\d+[a-z]$|^[ivx]+$)/i.test(x)) || '';
    return { id: 'S' + (i + 1), name: p[0], age, height, cls };
  });
  // assign students to bag lines in order, filling each line's quantity
  V.assignStudents = (students, lines) => { let li = 0, used = 0; return students.map(st => { while (lines[li] && used >= lines[li].qty) { li++; used = 0; } const L = lines[li] || lines[lines.length - 1]; used++; const c = V.cost(L.cid); return { ...st, li: lines.indexOf(L), size: st.size || V.sizeFor(st, c) }; }); };
  V.studentSection = dr => {
    const st = dr.students || [];
    return `<section class="students"><div class="label">${V.art('cat-classical')} Student list <small>(school & troupe orders)</small></div>
      ${st.length ? `<div class="stu-grid">${st.map((x, i) => { const L = V.state.bag[x.li]; return `<span class="stu"><b>${esc(x.name)}</b><small>${x.age ? x.age + ' yrs' : ''}${x.cls ? ' · ' + esc(x.cls) : ''}</small><em>${esc(x.size || '')}</em><small class="muted">${L ? esc(V.lineLabel(L)) : ''}</small></span>`; }).join('')}</div>
        <div class="row-actions">${V.btn('Edit list', 'stuEdit', {}, 'ghost sm', null, 'receipt')}${V.btn('Clear', 'stuClear', {}, 'ghost sm')}</div>`
        : `<p class="muted small">Paste names from the school's list — one per line: <code>Aarav, 7, 2B</code>. Sizes come from the size guide; each child gets a labelled bag and is checked on return.</p>${V.btn('Add student list', 'stuEdit', {}, 'ghost sm', null, 'receipt')}`}</section>`;
  };
  V.act.stuEdit = () => { const dr = V.state.draft; const cur = (dr.students || []).map(s => [s.name, s.age, s.cls].filter(Boolean).join(', ')).join('\n'); V.openSheet('stuList', { text: cur }); };
  V.act.stuClear = () => { V.state.draft.students = []; V.save(); V.renderSheet(); };
  V.SHEETS.stuList = s => {
    const parsed = V.parseStudents(s.text || ''); const total = V.state.bag.reduce((a, b) => a + b.qty, 0);
    return {
      title: `${V.art('receipt')} Student list`,
      body: `<p class="muted">Paste from WhatsApp, Excel or type. One child per line: <b>name, age, class</b> (height in cm optional for adults).</p>
        <textarea rows="12" data-bind="stuText" placeholder="Aarav Shetty, 7, 2B&#10;Diya Rao, 8, 3A&#10;…">${esc(s.text || '')}</textarea>
        <p class="hint">${parsed.length} children · ${total} sets in the bag ${parsed.length > total ? `<b class="red">— ${parsed.length - total} more children than sets</b>` : ''}</p>`,
      foot: `<span class="grow"></span>${V.btn('Assign sizes & save', 'stuSave', {}, 'primary lg', null, 'check')}`
    };
  };
  V.bind.stuText = el => { V.sheetState.text = el.value; };
  V.act.stuSave = () => { const st = V.parseStudents(V.sheetState.text || ''); V.state.draft.students = V.assignStudents(st, V.state.bag); V.save(); V.openSheet('bag'); V.toast(`${st.length} students sized & assigned`); };
  // per-child bag labels with QR (opens a WhatsApp chat to the shop quoting order + child)
  V.act.printLabels = d => {
    const o = V.order(d.id); const s = S(); const kids = o.students || [];
    const qrFor = txt => V.qr.dataUrl(`https://wa.me/91${V.ckey(s.phone)}?text=${encodeURIComponent(txt)}`, { margin: 1 });
    document.getElementById('print').innerHTML = `<div class="labels">${(kids.length ? kids : o.lines.flatMap((l, li) => Array.from({ length: l.qty }, (_, k) => ({ id: `${li + 1}-${k + 1}`, name: '', li })))).map(k => { const l = o.lines[k.li] || o.lines[0]; const c = V.cost(l.cid);
      return `<div class="lbl-card"><img class="lq" src="${qrFor(`Vividham ${o.code} · ${k.name || 'set ' + k.id}`)}" alt=""><div><b>${esc(k.name || 'Set ' + k.id)}</b><span>${esc(k.cls || '')} ${esc(k.size || '')}</span><span>${esc(V.lineLabel(l))}</span><small>${o.code} · return by ${V.fmtD(o.due)}</small><small>${c.pieces.map(p => p.n).join(' · ')}</small></div></div>`; }).join('')}</div>`;
    setTimeout(() => window.print(), 80);
  };

  /* ================= fitting & alterations ================= */
  V.altSection = o => {
    const al = o.alterations || [];
    return `<h3>${V.art('needle')} Fitting & alterations</h3>
      ${al.length ? `<div class="alts">${al.map((a, i) => `<div class="alt ${a.done ? 'done' : ''}">${V.art('needle')}<div><b>${a.qty} × ${esc(V.lineLabel(o.lines[a.li]))}</b><small>${esc(a.note)}${a.revert ? ' · revert after return' : ''}</small></div>${a.revert && a.done ? '<em>reverted</em>' : ''}</div>`).join('')}</div>` : '<p class="muted small">No alterations.</p>'}
      ${o.status === 'booked' || o.status === 'out' ? V.btn('Add alteration', 'altAdd', { id: o.id }, 'ghost sm', null, 'needle') : ''}`;
  };
  V.act.altAdd = d => V.openSheet('altAdd', { id: d.id, li: 0, qty: 1, note: '', revert: true });
  V.SHEETS.altAdd = s => {
    const o = V.order(s.id); const c = V.customer(o.cust.phone) || { measure: {} }; const m = c.measure || {};
    return {
      title: `${V.art('needle')} Alteration · ${o.code}`,
      body: `<div class="form">
        <label>Costume<select data-bind="altF" data-k="li">${o.lines.map((l, i) => `<option value="${i}" ${+s.li === i ? 'selected' : ''}>${esc(V.lineLabel(l))}</option>`).join('')}</select></label>
        <div class="row2"><label>Sets altered<input inputmode="numeric" data-bind="altF" data-k="qty" value="${s.qty}"></label>
          <label class="toggle"><input type="checkbox" data-bind="altF" data-k="revert" ${s.revert ? 'checked' : ''}><span>Revert after return (blocks the sets until done)</span></label></div>
        <label>What was changed<input data-bind="altF" data-k="note" value="${esc(s.note)}" placeholder="Blouse taken in 1&quot;, hem up 2&quot;"></label>
        <div class="label">${V.art('top')} Customer measurements (inches)</div>
        <div class="row3">${['chest', 'waist', 'length', 'height'].map(k => `<label>${k}<input inputmode="decimal" data-bind="measF" data-phone="${V.ckey(o.cust.phone)}" data-k="${k}" value="${esc(m[k] || '')}"></label>`).join('')}</div></div>`,
      foot: `<span class="grow"></span>${V.btn('Save alteration', 'altSave', {}, 'primary lg', null, 'check')}`
    };
  };
  V.bind.altF = el => { V.sheetState[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; };
  V.bind.measF = el => { const c = V.customer(el.dataset.phone); c.measure = c.measure || {}; c.measure[el.dataset.k] = el.value; V.save(); };
  V.act.altSave = () => { const s = V.sheetState; const o = V.order(s.id); (o.alterations = o.alterations || []).push({ li: +s.li, qty: Math.max(1, +s.qty || 1), note: s.note || 'Alteration', revert: !!s.revert, done: false, d: V.today() }); (o.timeline = o.timeline || []).push({ d: V.today(), t: `Alteration: ${s.note || ''}` }); V.save(); V.openSheet('order', { id: o.id }); };
  // called from recordCheck: altered sets that came back need reverting before next rental
  V.altOnReturn = (o, deltaByLine) => (o.alterations || []).forEach(a => {
    if (!a.revert || a.done || a.queued) return; const back = Math.min(a.qty, deltaByLine[a.li] || 0); if (!back) return;
    a.queued = true; const l = o.lines[a.li];
    // move these sets out of the normal cleaning batch so they are not blocked twice
    const cb = [...V.state.cleaning].reverse().find(b => b.from === o.code && b.cid === l.cid && b.vid === l.vid && b.kind === 'clean' && !b.done);
    if (cb) { cb.qty -= back; if (cb.qty <= 0) V.state.cleaning.splice(V.state.cleaning.indexOf(cb), 1); }
    V.state.cleaning.push({ id: V.uid(), cid: l.cid, vid: l.vid, qty: back, ready: '9999-12-31', from: o.code, kind: 'alter', note: a.note, altOf: o.id });
  });

  /* ================= QR set tags ================= */
  V.tagCode = (cid, vid, n) => `VVT:${cid}:${vid}:${String(n).padStart(2, '0')}`;
  V.parseTag = t => { const m = /VVT:([A-Z0-9-]+):([a-z0-9-]+):(\d+)/i.exec(t || ''); return m ? { cid: m[1], vid: m[2], n: +m[3] } : null; };
  V.act.printTags = d => {
    const c = V.cost(d.id); const vs = d.vid ? [V.variant(c, d.vid)] : c.variants;
    document.getElementById('print').innerHTML = `<div class="tags">${vs.flatMap(v => Array.from({ length: v.stock }, (_, i) => { const code = V.tagCode(c.id, v.id, i + 1); return `<div class="tag-card"><img src="${V.qr.dataUrl(code, { margin: 1 })}" alt=""><b>${esc(c.name)}</b><span>${esc(v.label)} · #${i + 1}</span><small>${code}</small></div>`; })).join('')}</div>`;
    setTimeout(() => window.print(), 80);
  };
  // Scanner input: works with USB/Bluetooth barcode scanners (they type + Enter) and the tablet camera where supported.
  V.scanBox = ctx => `<div class="scanbox">${V.art('studio')}<input data-bind="scan" data-ctx="${ctx}" placeholder="Scan set tag (or type VVT:…)" autocomplete="off">
      ${'BarcodeDetector' in window ? `<button class="btn ghost sm" data-act="camScan" data-ctx="${ctx}">${V.art('studio')}<span>Camera</span></button>` : ''}</div>`;
  V.bind.scan = (el, type, ev) => { if (type !== 'change') return; const t = V.parseTag(el.value); el.value = ''; if (!t) { V.toast('Not a Vividham tag'); return; } V.onScan(t, el.dataset.ctx);
    // keep the cursor in the scan box so a USB/Bluetooth scanner can fire the next tag straight away
    setTimeout(() => { const n = document.querySelector('#sheet [data-bind="scan"]'); if (n) n.focus(); }, 30); };
  V.act.camScan = async d => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const vid = Object.assign(document.createElement('video'), { srcObject: stream, playsInline: true, muted: true }); await vid.play();
      const det = new BarcodeDetector({ formats: ['qr_code'] }); const t0 = Date.now();
      const loop = async () => { const r = await det.detect(vid).catch(() => []); const hit = r.map(x => V.parseTag(x.rawValue)).find(Boolean); if (hit || Date.now() - t0 > 15000) { stream.getTracks().forEach(t => t.stop()); if (hit) V.onScan(hit, d.ctx); else V.toast('No tag seen'); } else requestAnimationFrame(loop); };
      loop();
    } catch (e) { V.toast('Camera not available'); }
  };
  V.onScan = (t, ctx) => {
    const s = V.sheetState; if (!s) return;
    const o = V.order(s.id); const li = o.lines.findIndex(l => l.cid === t.cid && l.vid === t.vid);
    if (li < 0) { V.toast('This set is not on this order'); return; }
    const code = V.tagCode(t.cid, t.vid, t.n);
    if (ctx === 'out') { o.tags = o.tags || []; if (o.tags.includes(code)) return V.toast('Already scanned'); o.tags.push(code); V.save(); V.renderSheet(); V.toast(`Tag #${t.n} packed (${o.tags.filter(x => x.startsWith(`VVT:${t.cid}:${t.vid}`)).length}/${o.lines[li].qty})`); return; }
    s.scanned = s.scanned || []; if (s.scanned.includes(code)) return V.toast('Already scanned');
    if (!s.scanMode) { s.scanMode = true; s.lines.forEach((L, i) => { L.pr = L.prev.slice(); L.touched = {}; }); }
    s.scanned.push(code); V.act.retStep({ li, pi: 0, d: 1 });
    V.toast(`Tag #${t.n} back · ${V.lineLabel(o.lines[li])}`);
  };

  /* ================= cleaning vendors ================= */
  V.vendorBatchActions = b => b.kind === 'alter' ? V.btn('Reverted', 'cleanReady', { id: b.id }, 'ghost sm', null, 'check')
    : b.vendor ? `<small class="vend">${V.art('clean')} ${esc((S().vendors.find(v => v.id === b.vendor) || {}).name || '')} · sent ${V.fmtD(b.sentOn)}${b.cost ? ' · ' + rs(b.cost) : ''}</small>${V.btn('Back from cleaner', 'cleanReady', { id: b.id }, 'ghost sm', null, 'check')}`
      : `${V.btn('Send to cleaner', 'vendSend', { id: b.id }, 'ghost sm', null, 'handover')}${V.btn('Ready now', 'cleanReady', { id: b.id }, 'ghost sm', null, 'check')}`;
  V.act.vendSend = d => V.openSheet('vendSend', { bid: d.id, vendor: (S().vendors[0] || {}).id, cost: '' });
  V.SHEETS.vendSend = s => {
    const b = V.state.cleaning.find(x => x.id === s.bid); const c = V.cost(b.cid);
    return {
      title: `${V.art('clean')} Send to cleaner`,
      body: `<p><b>${b.qty} × ${esc(V.lineLabel(b))}</b> from ${esc(b.from)}</p>
        <div class="chips">${S().vendors.map(v => `<button class="pick ${s.vendor === v.id ? 'on' : ''}" data-act="vendPick" data-v="${v.id}">${V.art('clean')}${esc(v.name)} <small>${rs(v.rate)}/set</small></button>`).join('')}</div>
        <label>Cost ₹<input inputmode="numeric" data-bind="vendCost" value="${s.cost || ((S().vendors.find(v => v.id === s.vendor) || {}).rate || 0) * b.qty}"></label>
        <p class="muted small">Expected back in ${c.turnaround} days. Vendors are edited in Settings.</p>`,
      foot: `<span class="grow"></span>${V.btn('Sent', 'vendDo', {}, 'primary lg', null, 'handover')}`
    };
  };
  V.act.vendPick = d => { V.sheetState.vendor = d.v; V.sheetState.cost = ''; V.renderSheet(); };
  V.bind.vendCost = el => { V.sheetState.cost = el.value; };
  V.act.vendDo = () => { const s = V.sheetState; const b = V.state.cleaning.find(x => x.id === s.bid); const v = S().vendors.find(x => x.id === s.vendor); b.vendor = s.vendor; b.sentOn = V.today(); b.cost = +s.cost || (v ? v.rate * b.qty : 0); V.save(); V.closeSheet(); V.render(); V.toast('Sent to ' + (v ? v.name : 'cleaner')); };
  V.vendorSpend = () => { const m = V.today().slice(0, 7); return V.state.cleaning.filter(b => b.cost && (b.sentOn || '').startsWith(m)).reduce((a, b) => a + b.cost, 0); };

  /* ================= booking calendar ================= */
  V.SUB.calendar = () => {
    const ui = V.ui.cal || (V.ui.cal = { month: V.today().slice(0, 7), cid: 'all', vid: null });
    const [y, mo] = ui.month.split('-').map(Number); const first = new Date(y, mo - 1, 1); const days = new Date(y, mo, 0).getDate();
    const lead = (first.getDay() + 6) % 7; const t = V.today();
    const c = ui.cid !== 'all' ? V.cost(ui.cid) : null; const v = c ? V.variant(c, ui.vid) : null;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<i class="cal-pad"></i>');
    for (let d = 1; d <= days; d++) {
      const iso = `${ui.month}-${String(d).padStart(2, '0')}`;
      let inner = '';
      if (c) { const free = Math.max(0, V.avail(c.id, v.id, iso, iso)); const pct = v.stock ? free / v.stock : 0; inner = `<b class="free ${pct === 0 ? 'none' : pct < .3 ? 'low' : 'ok'}">${free}</b><small>/${v.stock} free</small>`; }
      else {
        const go = V.state.orders.filter(o => o.status === 'booked' && o.pickup === iso), back = V.state.orders.filter(o => (o.status === 'out' || o.status === 'booked') && o.due === iso);
        inner = `${go.map(o => `<span class="ev go" data-act="openOrder" data-id="${o.id}">${V.art('handover')}${esc((o.cust.group || o.cust.name).slice(0, 14))}</span>`).join('')}${back.map(o => `<span class="ev back" data-act="openOrder" data-id="${o.id}">${V.art('back')}${esc((o.cust.group || o.cust.name).slice(0, 14))}</span>`).join('')}`;
      }
      const dow = new Date(y, mo - 1, d).getDay();
      cells.push(`<div class="cal-d ${iso === t ? 'today' : ''} ${iso < t ? 'past' : ''} ${dow === 0 ? 'sun' : ''}"><span class="dn">${d}</span>${inner}</div>`);
    }
    const opts = V.state.costumes.filter(x => x.kind !== 'accessory').map(x => `<option value="${x.id}" ${ui.cid === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    return `<div class="pagehead"><div><p class="eyebrow">Booking calendar</p><h1>${first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h1></div>
        <div class="row-actions" style="margin:0">${V.btn('', 'calMove', { n: -1 }, 'ghost', 'left')}${V.btn('Today', 'calMove', { n: 0 }, 'ghost')}${V.btn('', 'calMove', { n: 1 }, 'ghost', 'right')}</div></div>
      <div class="toolbar"><label class="search">${V.art('hanger')}<select data-bind="calCost"><option value="all">All pickups & returns</option>${opts}</select></label>
        ${c && c.variants.length > 1 ? `<div class="seg scroll">${c.variants.map(x => `<button class="${x.id === v.id ? 'on' : ''}" data-act="calVar" data-vid="${x.id}">${esc(x.label)}</button>`).join('')}</div>` : ''}</div>
      <div class="cal"><div class="cal-h">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${x}</span>`).join('')}</div><div class="cal-g">${cells.join('')}</div></div>
      <p class="muted small">${c ? 'Free sets per day after bookings, rentals out and the cleaning buffer.' : `${V.art('handover')} pickups · ${V.art('back')} returns. Sunday is shaded (shop closed).`}</p>`;
  };
  V.act.calMove = d => { const ui = V.ui.cal; if (+d.n === 0) ui.month = V.today().slice(0, 7); else { const [y, m] = ui.month.split('-').map(Number); const dt = new Date(y, m - 1 + (+d.n), 1); ui.month = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; } V.render(); };
  V.bind.calCost = el => { V.ui.cal.cid = el.value; V.ui.cal.vid = null; V.render(); };
  V.act.calVar = d => { V.ui.cal.vid = d.vid; V.render(); };
  V.act.openCalendar = d => { V.ui.cal = { month: V.today().slice(0, 7), cid: d.id, vid: d.vid }; V.closeSheet(); V.act.sub({ sub: 'calendar' }); };
})(window.V);
