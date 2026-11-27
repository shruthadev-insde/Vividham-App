/* Vividham — boot. */
(function (V) {
  window.VIVIDHAM_RENDERS = window.VIVIDHAM_RENDERS || {};
  V.load();
  // Older saves without newer fields.
  V.state.settings = Object.assign({}, V.DEFAULT_SETTINGS, V.state.settings, { tpl: Object.assign({}, V.DEFAULT_SETTINGS.tpl, V.state.settings.tpl) });
  V.state.bag = V.state.bag || [];
  V.state.customers = V.state.customers || {};
  V.state.orders.forEach(o => V.customer(o.cust.phone, { name: o.cust.name, group: o.cust.group }));
  // Pick up new inventory items added to data/inventory.js since this device was seeded.
  const have = new Set(V.state.costumes.map(c => c.id));
  V.seedCostumes().forEach(c => { if (!have.has(c.id)) V.state.costumes.push(c); });

  const fromHash = () => {
    const [tab, sub] = (location.hash.slice(1) || 'today').split('/');
    if (['today', 'costumes', 'orders', 'reminders', 'more'].includes(tab)) { V.ui.tab = tab; V.ui.sub = sub || null; }
  };
  fromHash();
  V.render();
  V.splash().then(() => {
    document.body.classList.add('ready');
    setTimeout(() => V.hint('.ocard .oact .btn.primary', 'first-action'), 900);
  });
  window.addEventListener('hashchange', () => { fromHash(); V.render(); });

  // Re-check when the tablet wakes up or the date rolls over.
  let lastDay = V.today();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && V.today() !== lastDay) { lastDay = V.today(); V.render(); } });
  setInterval(() => { if (V.today() !== lastDay) { lastDay = V.today(); V.render(); } }, 60000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (location.protocol.startsWith('http')) { V.checkStudio && V.checkStudio(); V.checkWa().then(() => V.render()); }
})(window.V);
