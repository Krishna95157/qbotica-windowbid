'use strict';
/* contact form */
function initContact() {
  const f = $('#ctForm'), done = $('#ctDone'), E = f.elements;
  // the qBotica cube as a construction detail: guides, outlined sides, orange top face
  const art = $('#ctArt'), S2 = 2.4, TX = 200 - 46 * S2, TY = 90, cx = 200, cy = TY + 50 * S2, k = Math.tan(Math.PI / 6);
  const T = d => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, x, y) => `${(+x * S2 + TX).toFixed(2)} ${(+y * S2 + TY).toFixed(2)}`);
  [[0, TY, 400, TY], [0, cy, 400, cy], [0, TY + 240, 400, TY + 240], [cx, 20, cx, 400], [TX, 40, TX, 380], [400 - TX, 40, 400 - TX, 380],
   [cx - 190, cy + 190 * k, cx + 190, cy - 190 * k], [cx - 190, cy - 190 * k, cx + 190, cy + 190 * k]]
    .forEach(([x1, y1, x2, y2]) => el('line', {x1, y1, x2, y2, class:'cx-g'}, art));
  el('circle', {cx, cy, r:150, class:'cx-c'}, art);
  $('#qmark path').getAttribute('d').split(/(?=M)/).map(x => x.trim()).filter(Boolean)
    .forEach((d, i) => el('path', {d:T(d), class: i === 0 ? 'cx-top' : 'cx-o'}, art));
  const dy = TY + 240 + 34;
  el('path', {d:`M${TX} ${dy}H${400 - TX}M${TX} ${dy - 5}V${dy + 5}M${400 - TX} ${dy - 5}V${dy + 5}`, class:'cx-d'}, art);
  el('text', {x:cx, y:dy - 8, 'text-anchor':'middle', class:'cx-t'}, art).textContent = 'DETAIL A · ISO 30°';
  const okEmail = v => /^\S+@\S+\.\S+$/.test(v);
  // size each blank to its text, measured in the field's own font
  const ctx = document.createElement('canvas').getContext('2d');
  const fit = c => {
    const t = c.tagName === 'SELECT' ? c.options[c.selectedIndex].text : (c.value || c.placeholder || '');
    const cs = getComputedStyle(c); ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const fs = parseFloat(cs.fontSize) || 40;
    c.style.width = Math.ceil(ctx.measureText(t).width + fs * (c.tagName === 'SELECT' ? 1.15 : .3)) + 'px';
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => $$('.blank input, .blank select', f).forEach(fit));
  addEventListener('resize', () => { if (PAGE === 'contact') $$('.blank input, .blank select', f).forEach(fit); });
  const mark = c => c.closest('.blank').classList.toggle('ok', c.name === 'email' ? okEmail(c.value.trim()) : c.tagName === 'SELECT' ? c.dataset.touched === '1' : !!c.value.trim());
  $$('.blank input, .blank select', f).forEach(c => {
    fit(c); c.addEventListener('fit', () => fit(c));
    c.addEventListener('input', () => { if (c.tagName === 'SELECT') c.dataset.touched = '1'; fit(c); mark(c); });
    c.addEventListener('change', () => { if (c.tagName === 'SELECT') c.dataset.touched = '1'; fit(c); mark(c); });
  });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const name = E['name'].value.trim(), email = E['email'].value.trim();
    if (!name) { toast('Add your name.'); E['name'].focus(); return; }
    if (!okEmail(email)) { toast('Add a valid email address.'); E['email'].focus(); return; }
    $('#ctName').textContent = name.split(' ')[0];
    f.hidden = true; done.hidden = false;
  });
  $('#ctAgain').addEventListener('click', () => {
    f.reset(); $$('.blank', f).forEach(b => b.classList.remove('ok'));
    $$('.blank input, .blank select', f).forEach(c => { delete c.dataset.touched; fit(c); });
    done.hidden = true; f.hidden = false; E['name'].focus();
  });
}

