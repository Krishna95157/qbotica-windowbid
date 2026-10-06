'use strict';
/* ------------------------------------------------------------------
   APP — state & routing
------------------------------------------------------------------ */
const TYPES = ['Single hung','Double hung','Casement','Awning','Picture','Sliding','Hinged door','Sliding door','French door','Unknown'];
const DOOR_TYPES = new Set(['Hinged door','Sliding door','French door']);
const S = {stage:'upload', src:null, items:[], sel:null, selGroup:null, open:null, leftOut:[], tab:'groups', takeoffOK:false, run:0, adding:false, rfq:null, bids:null, pick:null, margin:6700 / 30300 * 100, pendingMark:null, ms:0, complete:false, price:0};
let uid = 1;
const STAGES = [['upload','Upload'],['work','Extract'],['review','Review'],['rfq','RFQ'],['bids','Bids'],['proposal','Proposal'],['order','Order']];
const STEP_GROUPS = [['Review',['upload','work','review']],['Procure',['rfq','bids','proposal']],['Fulfill',['order']]];
function groups(list = S.items) {
  const m = new Map();
  for (const it of list) {
    const key = `${it.cat}|${it.type}|${it.w ?? '?'}|${it.h ?? '?'}`;
    if (!m.has(key)) m.set(key, {key, cat:it.cat, type:it.type, w:it.w, h:it.h, items:[]});
    m.get(key).items.push(it);
  }
  return [...m.values()].sort((a, b) => (a.cat === b.cat ? b.items.length - a.items.length : a.cat === 'window' ? -1 : 1));
}
// Pre-processing (applied when the review opens): openings with neither a window number nor any size on
// the drawing are left out of the takeoff (kept in S.leftOut, one click puts them back). (No .tag field =
// a reading that doesn't know the plan's tags, like the sample plan, whose marks are drawn: those are kept.)
const inPreprocessed = it => !!it.added || it.w != null || it.h != null || !('tag' in it) || !!it.tag;
const visibleItems = () => S.items;
function openApp() {
  $('#app').hidden = false; document.body.classList.add('app-open');
  if (location.hash !== '#takeoff') history.pushState(null, '', '#takeoff');
  if (S.stage === 'upload') goStage('upload');
}
function closeApp(fromRouter) {
  S.run++;
  if (S.ctl) S.ctl.abort();
  $('#app').hidden = true; document.body.classList.remove('app-open');
  if (!fromRouter && location.hash === '#takeoff') history.pushState(null, '', PAGE === 'home' ? location.pathname + location.search : '#' + PAGE);
  LAYOUT_DIRTY = true; runScenes();
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (!g) return;
  e.preventDefault();
  $('#navLinks').classList.remove('open');
  if (g.dataset.go === 'app') { if (!S.items.length) S.stage = 'upload'; openApp(); }
  else closeApp();
});
function goStage(st) {
  S.stage = st;
  const map = {upload:'upload', work:'work', review:'work', rfq:'rfq', bids:'bids', proposal:'proposal', order:'order'};
  $$('.stage').forEach(s => s.classList.toggle('on', s.dataset.stage === map[st]));
  $('#appBody').scrollTop = 0;
  renderSteps();
}
function renderSteps() {
  const idx = STAGES.findIndex(s => s[0] === S.stage);
  let i = 0;
  $('#steps').innerHTML = STEP_GROUPS.map(([gname, keys]) => {
    const start = i, end = i + keys.length - 1;
    const gcls = idx > end ? 'done' : idx >= start ? 'on' : '';
    const items = keys.map(k => { const j = i++; const n = STAGES[j][1]; return `<span class="st2 ${j < idx ? 'done' : j === idx ? 'cur' : ''}"><i></i>${n}</span>`; }).join('');
    return `<li class="grp ${gcls}"><span class="gl">${gname}</span>${items}</li>`;
  }).join('');
}
// proposal + purchase order: 19-app-procure.js
