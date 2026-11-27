/* Vividham — recommendation & pairing engine.
   Works on the inventory (window.VIVIDHAM_INVENTORY) + live availability.

   V.rec.completeLook(cid, vid)  → accessories that finish this costume (not already in the set)
   V.rec.scene(cid)              → companion costumes that make a group / scene (Krishna ↔ Radha…)
   V.rec.forEvent(eventId, age)  → best costumes + key accessories for an occasion
   V.rec.forBag(bag)             → "often forgotten" accessories for what is in the bag
   V.rec.search(q)               → ranked keyword search (names, keywords, events, dances, Kannada)

   Scores are additive and explainable: every suggestion carries `why` chips shown in the UI. */
(function (V) {
  const INV = () => window.VIVIDHAM_INVENTORY;
  const tokens = s => String(s || '').toLowerCase().split(/[^a-z0-9ಀ-೿]+/).filter(Boolean);
  const tagSet = c => new Set([...(c.keywords || []), ...(c.dance || []), c.theme, ...tokens(c.name), c.cat].filter(Boolean).map(x => String(x).toLowerCase()));
  const harmony = (acc, colours) => {
    const tone = (acc.colours || [])[0]; const H = INV().colourHarmony[tone];
    return H ? (colours || []).some(c => H.includes(c)) : false;
  };
  const ageOk = (acc, c) => acc.age === 'all' || !acc.age || acc.age === (c.age === 'teen' ? 'adult' : c.age) || (acc.age === 'adult' && c.age === 'teen');
  const avail = (sku, vid) => { const c = V.cost(sku); if (!c) return 0; return V.readyNow(sku, vid || c.variants[0].id); };

  function completeLook(cid, vid) {
    const c = V.cost(cid); if (!c || c.kind === 'accessory') return [];
    const v = V.variant(c, vid); const tags = tagSet(c);
    const included = new Set(c.pieces.map(p => p.a).filter(Boolean));
    const out = [];
    for (const a of INV().accessories) {
      if (!ageOk(a, c)) continue;
      const why = []; let s = 0;
      if (a.goesWith.categories.includes(c.cat)) { s += 3; why.push(c.catLabel || 'Category match'); }
      const hits = a.goesWith.tags.filter(t => tags.has(t)); if (hits.length) { s += 2 * hits.length; why.push('For ' + hits[0]); }
      else if (a.goesWith.tags.length) s -= 2; // specific accessory (e.g. Hanuman gada) needs a story match, not just the category
      if (harmony(a, v.colours)) { s += 1; why.push(`Suits ${v.colours.slice(0, 2).join(' & ')}`); }
      if (s < 3) continue;
      const inSet = included.has(a.sku);
      out.push({ sku: a.sku, item: V.cost(a.sku), score: s + (inSet ? -2 : 0), why, inSet, ready: avail(a.sku) });
    }
    return out.sort((x, y) => (x.inSet - y.inSet) || y.score - x.score).slice(0, 10);
  }

  const COMPANION = { // explicit story pairs on top of shared themes
    'MK-KR-020': ['MK-RD-022', 'MK-KR-021'], 'MK-RD-022': ['MK-KR-020'], 'MA-KR-034': ['MK-RD-022'],
    'MA-RM-032': ['MA-ST-033', 'MK-HN-024'], 'MA-ST-033': ['MA-RM-032'], 'MK-RM-025': ['MK-HN-024'],
    'MA-SH-030': ['MA-PV-031', 'MK-GN-023'], 'MA-PV-031': ['MA-SH-030'], 'ST-PB-040': ['NV-CC-010'], 'WM-BR-101': ['WM-SW-102'], 'WM-SW-102': ['WM-BR-101']
  };
  function scene(cid) {
    const c = V.cost(cid); if (!c || c.kind === 'accessory') return [];
    const res = [];
    for (const o of V.state.costumes) {
      if (o.id === c.id || o.kind === 'accessory') continue;
      let s = 0; const why = [];
      if ((COMPANION[c.id] || []).includes(o.id)) { s += 5; why.push('Story pair'); }
      if (o.theme && o.theme === c.theme) { s += 3; const th = INV().themes[o.theme]; why.push(th ? th.label : 'Same theme'); }
      const ev = (o.usage || []).filter(u => (c.usage || []).includes(u)); if (ev.length && s) s += Math.min(2, ev.length);
      if (o.age === c.age) s += 0.5;
      if (s >= 3) res.push({ sku: o.id, item: o, score: s, why, ready: V.readyAll(o) });
    }
    return res.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  function forEvent(eventId, age) {
    const list = V.state.costumes.filter(c => c.kind !== 'accessory' && (c.usage || []).includes(eventId) && (!age || age === 'All' || c.age === age.toLowerCase().replace('adults', 'adult') || (age === 'Adults' && c.age === 'teen')));
    const ranked = list.map(c => ({ item: c, score: ((c.usage || []).indexOf(eventId) === 0 ? 3 : 1) + Math.min(3, V.readyAll(c) / 5) })).sort((a, b) => b.score - a.score);
    const accScore = {};
    ranked.slice(0, 8).forEach(r => completeLook(r.item.id).filter(x => !x.inSet).forEach(x => { accScore[x.sku] = (accScore[x.sku] || 0) + x.score; }));
    return { costumes: ranked.map(r => r.item), accessories: Object.entries(accScore).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([sku]) => V.cost(sku)) };
  }

  function forBag(bag) {
    const inBag = new Set(bag.map(b => b.cid)); const sets = {};
    bag.forEach(b => { const c = V.cost(b.cid); if (!c || c.kind === 'accessory') return;
      completeLook(b.cid, b.vid).filter(x => !x.inSet && !inBag.has(x.sku) && x.score >= 5).forEach(x => {
        const s = sets[x.sku] || (sets[x.sku] = { sku: x.sku, item: x.item, qty: 0, for: [], why: x.why });
        s.qty += b.qty; s.for.push(c.name);
      }); });
    return Object.values(sets).sort((a, b) => b.qty - a.qty).slice(0, 4);
  }

  function search(q) {
    const words = tokens(q); if (!words.length) return null;
    const ev = INV().events;
    return V.state.costumes.map(c => {
      const hay = [c.name, c.desc, ...(c.keywords || []), ...(c.dance || []), c.catLabel, c.catKn, c.age, c.theme, ...c.variants.map(v => v.label + ' ' + (v.colours || []).join(' ')),
        ...(c.usage || []).map(u => { const e = ev.find(x => x.id === u); return e ? e.label + ' ' + e.kn : u; })].join(' ').toLowerCase();
      let s = 0;
      for (const w of words) { if (!hay.includes(w)) return null; s += (c.name.toLowerCase().includes(w) ? 3 : 0) + ((c.keywords || []).some(k => k.startsWith(w)) ? 2 : 1); }
      return { c, s };
    }).filter(Boolean).sort((a, b) => b.s - a.s).map(x => x.c);
  }

  V.rec = { completeLook, scene, forEvent, forBag, search };
})(window.V = window.V || {});
