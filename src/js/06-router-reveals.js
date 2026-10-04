'use strict';
/* ------------------------------------------------------------------
   Router + aperture transition
------------------------------------------------------------------ */
let PAGE = 'home';
function pageFromHash() { const h = location.hash.replace('#', ''); return h === 'about' || h === 'contact' ? h : 'home'; }
async function aperture(swap) {
  const v = $('#view'), L = $('#apLines');
  if (REDUCED || !v.animate) { swap(); return; }
  const H = innerHeight, W = innerWidth, top = pinTop();
  const mid = (top + H) / 2;
  const opts = {duration:420, easing:'cubic-bezier(.7,0,.3,1)', fill:'forwards'};
  L.classList.add('on');
  const [t, b, l, r] = $$('i', L);
  const lineAnim = (dir) => [
    t.animate([{transform:`translateY(${top}px)`}, {transform:`translateY(${mid}px)`}].map(f => f), Object.assign({}, opts, dir)),
    b.animate([{transform:'translateY(0)'}, {transform:`translateY(${mid - H}px)`}], Object.assign({}, opts, dir)),
    l.animate([{transform:'translateX(0)'}, {transform:`translateX(${W/2}px)`}], Object.assign({}, opts, dir)),
    r.animate([{transform:'translateX(0)'}, {transform:`translateX(${-W/2}px)`}], Object.assign({}, opts, dir)),
  ];
  lineAnim({});
  await v.animate([{clipPath:'inset(0% 0% 0% 0%)'}, {clipPath:'inset(50% 50% 50% 50%)'}], opts).finished;
  swap();
  const o2 = {duration:560, easing:'cubic-bezier(.2,.75,.2,1)', fill:'forwards'};
  lineAnim({direction:'reverse', duration:560, easing:'cubic-bezier(.2,.75,.2,1)'});
  await v.animate([{clipPath:'inset(50% 50% 50% 50%)'}, {clipPath:'inset(0% 0% 0% 0%)'}], o2).finished;
  v.getAnimations().forEach(a => a.cancel());
  $$('i', L).forEach(i => i.getAnimations().forEach(a => a.cancel()));
  L.classList.remove('on');
}
function showPage(p, animate) {
  if (p === PAGE && animate) { scrollTo(0, 0); return; }
  const prev = PAGE;
  const swap = () => {
    if (prev === 'about' && p !== 'about') About.leave();
    PAGE = p;
    $$('#view > main').forEach(m => m.hidden = m.dataset.page !== p);
    if (p === 'about') About.prepare();
    if (p === 'contact') requestAnimationFrame(() => $$('#ctForm .blank input, #ctForm .blank select').forEach(c => c.dispatchEvent(new Event('fit'))));
    $$('.roll').forEach(a => a.classList.toggle('on', a.dataset.route === p));
    scrollTo(0, 0);
    $$(`main[data-page="${p}"] .rv:not([id])`).forEach(h => { h.classList.remove('in'); });
    requestAnimationFrame(() => { revealCheck(); LAYOUT_DIRTY = true; runScenes(); });
  };
  const done = () => { if (p === 'about') About.enter(); };
  if (animate) aperture(swap).then(done); else { swap(); done(); }
}
function initRouter() {
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-route]');
    if (!a) return;
    e.preventDefault();
    $('#navLinks').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    const p = a.dataset.route;
    const hash = p === 'home' ? location.pathname + location.search : '#' + p;
    if (!$('#app').hidden) closeApp(true);
    history.pushState({page:p}, '', hash);
    showPage(p, true);
  });
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-scroll]'); if (!s) return;
    const t = document.getElementById(s.dataset.scroll); if (t) t.scrollIntoView({behavior: REDUCED ? 'auto' : 'smooth'});
  });
  $('#menuBtn').addEventListener('click', () => {
    const o = $('#navLinks').classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', o);
  });
  addEventListener('popstate', () => {
    if (location.hash === '#takeoff') { openApp(true); return; }
    if (!$('#app').hidden) closeApp(true);
    showPage(pageFromHash(), false);
  });
}

/* reveals + drafting lines */
let revealIO;
function revealCheck() {
  $$('.rv:not([id])').forEach(h => revealIO.observe(h));
  $$('.dline').forEach(d => revealIO.observe(d));
}
function initReveals() {
  revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), {threshold:.25});
  revealCheck();
  const cta = $('#cta');
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) cta.classList.add('in'); }), {threshold:.35}).observe(cta);
}

