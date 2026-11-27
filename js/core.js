/* Vividham — core: dates, state, inventory maths, order lifecycle.
   Data shapes mirror the build guide tables:
   costumes      ≈ costume_sets (+ variants & pieces)
   orders        ≈ rental_orders (+ lines ≈ order_items, reminder ≈ reminder_schedules)
   cleaning      ≈ dry-cleaning / repair buffer batches
*/
window.V = window.V || {};
(function (V) {
  const KEY = 'vividham_app_v3';

  /* ---------- small utils ---------- */
  const pad = n => String(n).padStart(2, '0');
  V.iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  V.parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  V.addDays = (s, n) => { const d = V.parse(s); d.setDate(d.getDate() + n); return V.iso(d); };
  V.diff = (a, b) => Math.round((V.parse(b) - V.parse(a)) / 86400000); // b − a, in days
  V.realToday = () => V.iso(new Date());
  V.today = () => V.addDays(V.realToday(), (V.state && V.state.settings.dayOffset) || 0);
  V.fmtD = s => s ? V.parse(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
  V.fmtLong = s => V.parse(s).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  V.rs = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  V.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  V.uid = () => Math.random().toString(36).slice(2, 9);
  V.plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;
  V.relDay = s => {
    const d = V.diff(V.today(), s);
    if (d === 0) return 'today';
    if (d === 1) return 'tomorrow';
    if (d === -1) return 'yesterday';
    return d > 0 ? `in ${d} days` : `${-d} days ago`;
  };

  /* ---------- state ---------- */
  V.load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { V.state = JSON.parse(raw); return; }
    } catch (e) { /* fall through to seed */ }
    V.state = V.seed();
    V.save();
  };
  V.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(V.state)); }
    catch (e) { V.toast('Could not save — storage is full. Export a backup from Settings.'); }
  };
  V.reset = () => { V.state = V.seed(); V.save(); };

  /* ---------- lookups ---------- */
  V.cost = id => V.state.costumes.find(c => c.id === id);
  V.variant = (c, vid) => c.variants.find(v => v.id === vid) || c.variants[0];
  V.order = id => V.state.orders.find(o => o.id === id);
  /* Image for a costume colourway: studio render → placeholder line art (never the raw reference photo). */
  V.renderOf = (c, vid, shot = 'front') => {
    const v = vid ? V.variant(c, vid) : c.variants[0];
    if (c.renders && c.renders[`${v.id}/${shot}`]) return c.renders[`${v.id}/${shot}`];
    const r = window.VIVIDHAM_RENDERS && window.VIVIDHAM_RENDERS[`${c.id}/${v.id}/${shot}`];
    return r ? r.src : null;
  };
  V.img = (c, vid, shot = 'front') => {
    const v = vid ? V.variant(c, vid) : c.variants[0];
    return V.renderOf(c, v.id, shot) || V.placeholder(c.icon || 'costume', v.colours || []);
  };
  V.hasRender = (c, vid) => !!V.renderOf(c, vid);
  // Concept = generated from a description only (no garment photo yet) — always labelled in the UI.
  V.isConcept = (c, vid) => { const v = vid ? V.variant(c, vid) : c.variants[0]; const r = window.VIVIDHAM_RENDERS && window.VIVIDHAM_RENDERS[`${c.id}/${v.id}/front`]; return !!(r && r.concept && !(c.renders && c.renders[`${v.id}/front`])); };
  V.lineLabel = l => {
    const c = V.cost(l.cid); if (!c) return 'Removed item';
    return c.variants.length > 1 ? `${c.name} · ${V.variant(c, l.vid).label}` : c.name;
  };

  /* ---------- piece-level outstanding ----------
     Every costume has pieces[]; piece 0 is the main garment ("the set").
     line.pr[i] = pieces of type i received back so far (cumulative). */
  V.lineOut = l => {
    const c = V.cost(l.cid);
    return c.pieces.map((p, i) => Math.max(0, l.qty * p.q - ((l.pr && l.pr[i]) || 0)));
  };
  V.outstanding = o => {
    const items = []; let sets = 0, pieces = 0, value = 0;
    o.lines.forEach((l, li) => {
      const c = V.cost(l.cid); if (!c) return;
      V.lineOut(l).forEach((n, i) => {
        if (!n) return;
        if (i === 0) sets += n; pieces += n; value += n * c.pieces[i].fee;
        items.push({ li, pi: i, n, name: c.pieces[i].n, line: V.lineLabel(l), fee: c.pieces[i].fee });
      });
    });
    return { items, sets, pieces, value };
  };
  /* Human summary: "1 full set" + loose extras, instead of listing every piece of a missing set. */
  V.outGroups = o => {
    const g = [];
    o.lines.forEach(l => {
      const c = V.cost(l.cid); if (!c) return;
      const out = V.lineOut(l); const sets = out[0];
      const whole = sets > 0 && c.pieces.every((p, i) => out[i] >= sets * p.q);
      const setFee = c.pieces.reduce((s, p) => s + p.q * p.fee, 0);
      if (whole) g.push({ n: sets, name: c.pieces.length > 1 ? `full ${sets === 1 ? 'set' : 'sets'}` : c.pieces[0].n, line: V.lineLabel(l), full: true, value: sets * setFee });
      c.pieces.forEach((p, i) => {
        const n = whole ? out[i] - sets * p.q : out[i];
        if (n > 0 && !(whole && i === 0)) g.push({ n, name: p.n, line: V.lineLabel(l), full: false, value: n * p.fee });
      });
    });
    return g;
  };
  V.outShort = o => V.outGroups(o).map(x => `${x.n}× ${x.name}`).join(' + ');
  V.outText = o => V.outGroups(o).map(x => x.full ? `• ${x.n} ${x.name} — ${x.line} (with all accessories)` : `• ${x.n} × ${x.name}${o.lines.length > 1 ? ` (${x.line})` : ''}`).join('\n');
  V.orderQty = o => o.lines.reduce((s, l) => s + l.qty, 0);
  V.orderBack = o => o.lines.reduce((s, l) => s + ((l.pr && l.pr[0]) || 0), 0);

  V.status = o => {
    if (o.status === 'out' && o.due < V.today()) return 'overdue';
    return o.status;
  };
  V.STATUS = {
    booked: ['Booked', 'st-booked', 'st_booked'], out: ['With customer', 'st-out', 'st_out'], overdue: ['Overdue', 'st-overdue', 'st_overdue'],
    partial: ['Awaiting items', 'st-partial', 'st_partial'], closed: ['Closed', 'st-closed', 'st_closed'], cancelled: ['Cancelled', 'st-closed', 'st_cancelled']
  };

  /* ---------- money ---------- */
  V.rentFor = (lines, pickup, due) => {
    const days = Math.max(1, V.diff(pickup, due));
    const extra = Math.max(0, days - V.state.settings.cycleDays);
    return lines.reduce((s, l) => {
      const c = V.cost(l.cid); if (!c) return s;
      return s + l.qty * (c.rate + extra * c.extraDay);
    }, 0);
  };
  V.depositFor = lines => lines.reduce((s, l) => { const c = V.cost(l.cid); return s + (c ? c.deposit * l.qty : 0); }, 0);
  V.fines = o => (o.fines || []).reduce((s, f) => s + f.amt, 0);
  V.orderTotal = o => o.rent + ((o.choreo && o.choreo.price) || 0) - (o.discount || 0);
  V.lateDays = o => Math.max(0, V.diff(o.due, V.today()));

  /* ---------- availability ----------
     available(variant, from→to) = stock
       − sets on bookings/rentals whose [pickup, due + turnaround] overlaps the range
       − sets still unreturned on partial / overdue orders (open-ended)
       − sets in the cleaning buffer that won't be ready by `from`            */
  V.avail = (cid, vid, from, to, exceptId) => {
    const c = V.cost(cid); const v = V.variant(c, vid); const t = V.today();
    let n = v.stock;
    for (const o of V.state.orders) {
      if (o.id === exceptId || o.status === 'closed' || o.status === 'cancelled') continue;
      for (const l of o.lines) {
        if (l.cid !== cid || l.vid !== v.id) continue;
        const out = l.qty - ((l.pr && l.pr[0]) || 0);
        if (o.status === 'partial' || (o.status === 'out' && o.due < t)) { n -= out; continue; }
        const end = V.addDays(o.due, c.turnaround);
        if (o.pickup <= to && end >= from) n -= out;
      }
    }
    for (const b of V.state.cleaning) if (b.cid === cid && b.vid === v.id && !b.done && b.ready > from) n -= b.qty;
    return n;
  };
  V.readyNow = (cid, vid) => { const t = V.today(); return Math.max(0, V.avail(cid, vid, t, t)); };
  V.readyAll = c => c.variants.reduce((s, v) => s + V.readyNow(c.id, v.id), 0);
  V.stockAll = c => c.variants.reduce((s, v) => s + v.stock, 0);
  V.inCleaning = (cid, vid) => V.state.cleaning.filter(b => !b.done && b.ready > V.today() && (!cid || b.cid === cid) && (!vid || b.vid === vid)).reduce((s, b) => s + b.qty, 0);

  /* ---------- lifecycle actions ---------- */
  const log = (o, t) => { (o.timeline = o.timeline || []).push({ d: V.today(), t }); };
  V.nextCode = () => `VC-${++V.state.seq}`;

  V.createOrder = f => {
    const lines = f.lines.map(l => ({ cid: l.cid, vid: l.vid, qty: l.qty, pr: V.cost(l.cid).pieces.map(() => 0) }));
    const o = {
      id: V.uid(), code: V.nextCode(), created: V.today(),
      cust: { name: f.name.trim(), group: (f.group || '').trim(), phone: f.phone.trim() },
      event: (f.event || '').trim(), pickup: f.pickup, due: f.due, lines,
      rent: V.rentFor(lines, f.pickup, f.due),
      choreo: f.choreo || null, discount: +f.discount || 0, advance: +f.advance || 0,
      deposit: +f.deposit || 0, paid: 0, fines: [], returns: [], reminder: null, notes: f.notes || '',
      status: 'booked', timeline: [], payments: [], students: (f.students || []).map(s => ({ ...s, back: null })), alterations: []
    };
    V.customer && V.customer(o.cust.phone, { name: o.cust.name, group: o.cust.group });
    if (o.advance) o.payments.push({ d: V.today(), amt: o.advance, dir: 'in', kind: 'advance', method: f.advanceMethod || 'cash' });
    log(o, `Booked ${V.plural(V.orderQty(o), 'set')} for ${V.fmtD(o.pickup)} → ${V.fmtD(o.due)}`);
    if (o.advance) log(o, `Advance received ${V.rs(o.advance)}`);
    V.state.orders.unshift(o);
    if (f.handover) V.handOver(o.id, true);
    V.save();
    return o;
  };

  V.handOver = (id, silent) => {
    const o = V.order(id);
    o.status = 'out';
    if (o.pickup > V.today()) o.pickup = V.today();
    o.paid = V.orderTotal(o);
    log(o, `Handed over · rent ${V.rs(V.orderTotal(o) - (o.advance || 0))} + deposit ${V.rs(o.deposit)} collected`);
    if (!silent) V.save();
  };

  V.cancel = id => { const o = V.order(id); o.status = 'cancelled'; log(o, 'Booking cancelled'); V.save(); };

  V.extend = (id, due) => {
    const o = V.order(id); const old = o.due;
    o.due = due; o.rent = V.rentFor(o.lines, o.pickup, due);
    log(o, `Return date moved ${V.fmtD(old)} → ${V.fmtD(due)}`); V.save();
  };

  /* Return & Check.
     chk = { lines:[{ pr:[cumulative received per piece] }], damaged:{li:n}, charges:[{amt,note}], note }
     decision: 'complete' | 'fine' | 'remind'                                      */
  V.recordCheck = (id, chk, decision, fineAmt) => {
    const o = V.order(id); const t = V.today();
    const st = V.state.settings;
    const got = [];
    o.lines.forEach((l, li) => {
      const c = V.cost(l.cid);
      const newPr = chk.lines[li].pr;
      const deltaSets = newPr[0] - (l.pr[0] || 0);
      (chk.deltaSets = chk.deltaSets || {})[li] = deltaSets;
      const deltaPieces = newPr.reduce((s, n, i) => s + n - (l.pr[i] || 0), 0);
      if (deltaSets > 0) {
        const dmg = Math.min(deltaSets, (chk.damaged && chk.damaged[li]) || 0);
        if (deltaSets - dmg > 0) V.state.cleaning.push({ id: V.uid(), cid: l.cid, vid: l.vid, qty: deltaSets - dmg, ready: V.addDays(t, c.turnaround), from: o.code, kind: 'clean' });
        if (dmg > 0) V.state.cleaning.push({ id: V.uid(), cid: l.cid, vid: l.vid, qty: dmg, ready: V.addDays(t, c.turnaround + st.repairDays), from: o.code, kind: 'repair' });
      }
      if (deltaPieces > 0) got.push(`${V.lineLabel(l)}: ${deltaSets > 0 ? V.plural(deltaSets, 'set') : ''}${deltaSets > 0 && deltaPieces - deltaSets > 0 ? ' + ' : ''}${deltaPieces - Math.max(deltaSets, 0) > 0 ? V.plural(deltaPieces - Math.max(deltaSets, 0), 'loose piece') : ''}`);
      l.pr = newPr.slice();
    });
    o.returns.push({ d: t, got, note: chk.note || '', photo: chk.photo || null });
    if (chk.students && o.students) chk.students.forEach((st, i) => { if (o.students[i]) o.students[i].back = st.now.slice(); });
    V.altOnReturn && V.altOnReturn(o, chk.deltaSets || {});
    if (got.length) log(o, `Checked in — ${got.join('; ')}`);
    (chk.charges || []).forEach(ch => { if (ch.amt > 0) { o.fines.push({ d: t, amt: ch.amt, note: ch.note }); if (ch.rent) o.paid = (o.paid || 0) + ch.amt; log(o, `${ch.note} ${V.rs(ch.amt)}`); } });

    const out = V.outstanding(o);
    if (decision === 'remind' && out.pieces > 0) {
      o.status = 'partial';
      const r = o.reminder || { every: st.reminderEvery, log: [] };
      r.on = true; r.every = st.reminderEvery; r.next = V.addDays(t, r.every);
      o.reminder = r;
      log(o, `Waiting for ${V.plural(out.pieces, 'item')} — reminder every ${r.every} days (next ${V.fmtD(r.next)})`);
    } else if (decision === 'fine' && out.pieces > 0) {
      const amt = Math.max(0, Math.round(fineAmt || 0));
      o.fines.push({ d: t, amt, note: `Fine for unreturned items (${V.outGroups(o).map(x => `${x.n}× ${x.name}${x.full && o.lines.length > 1 ? ' of ' + x.line : ''}`).join(', ')})` });
      // Unreturned main garments are written off stock.
      o.writtenOff = out.items;
      out.items.filter(x => x.pi === 0).forEach(x => {
        const l = o.lines[x.li]; const v = V.variant(V.cost(l.cid), l.vid); v.stock = Math.max(0, v.stock - x.n);
      });
      log(o, `Fine ${V.rs(amt)} applied for unreturned items · ${out.sets ? V.plural(out.sets, 'set') + ' written off stock' : 'pieces written off'}`);
      close(o);
    } else {
      close(o);
    }
    V.save();
    return o;
  };

  function close(o) {
    o.status = 'closed'; o.closedOn = V.today();
    if (o.reminder) o.reminder.on = false;
    const bal = o.deposit - V.fines(o);
    o.refund = Math.max(0, bal); o.balanceDue = Math.max(0, -bal);
    (o.timeline = o.timeline || []).push({ d: V.today(), t: bal >= 0 ? `Closed · deposit refund ${V.rs(bal)}` : `Closed · fines exceed deposit, collect ${V.rs(-bal)}` });
  }

  V.followUp = (id, how) => {
    const o = V.order(id); const r = o.reminder;
    r.log.push({ d: V.today(), how });
    r.next = V.addDays(V.today(), r.every);
    log(o, `Follow-up by ${how} · next reminder ${V.fmtD(r.next)}`);
    V.save();
  };

  V.remindersDue = () => V.state.orders.filter(o => o.status === 'partial' && o.reminder && o.reminder.on && o.reminder.next <= V.today());

  V.cleanReady = bid => { const b = V.state.cleaning.find(x => x.id === bid); b.done = true; b.ready = V.today(); V.save(); };

  /* ---------- WhatsApp ---------- */
  V.waLink = (phone, text) => {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.length === 10) d = '91' + d;
    if (d.length === 12 && d.startsWith('0')) d = d.slice(1);
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
  };
  V.fill = (tpl, o) => {
    const s = V.state.settings;
    const items = o.lines.map(l => `• ${l.qty} × ${V.lineLabel(l)}`).join('\n');
    return tpl
      .replace(/\{name\}/g, o.cust.name.split(' ')[0])
      .replace(/\{group\}/g, o.cust.group || o.cust.name)
      .replace(/\{order\}/g, o.code)
      .replace(/\{pickup\}/g, V.fmtD(o.pickup))
      .replace(/\{due\}/g, V.fmtD(o.due))
      .replace(/\{items\}/g, items)
      .replace(/\{missing\}/g, V.outText(o))
      .replace(/\{deposit\}/g, V.rs(o.deposit))
      .replace(/\{refund\}/g, V.rs(o.refund || 0))
      .replace(/\{total\}/g, V.rs(V.orderTotal(o)))
      .replace(/\{shop\}/g, s.shopName)
      .replace(/\{phone\}/g, s.phone)
      .replace(/\{hours\}/g, s.hours);
  };
})(window.V);
