'use strict';
/* ------------------------------------------------------------------
   Plan model
------------------------------------------------------------------ */
const EXT = {x0:60, y0:60, x1:940, y1:620};
const U = 1.25;
const SEED = [
  {mark:'W01',cat:'window',type:'Single hung',w:36,h:60,room:'Bedroom 2',wall:'top',c:165,conf:.97},
  {mark:'W02',cat:'window',type:'Awning',w:24,h:null,room:'Bath',wall:'top',c:370,conf:.63,note:'Height is not dimensioned on this sheet. Check the window schedule.'},
  {mark:'W03',cat:'window',type:'Single hung',w:36,h:60,room:'Bedroom 3',wall:'top',c:540,conf:.95},
  {mark:'W04',cat:'window',type:'Single hung',w:36,h:60,room:'Primary bedroom',wall:'top',c:750,conf:.96},
  {mark:'W05',cat:'window',type:'Single hung',w:36,h:60,room:'Primary bedroom',wall:'right',c:200,conf:.93},
  {mark:'W06',cat:'window',type:'Casement',w:30,h:48,room:'Kitchen',wall:'right',c:480,conf:.91},
  {mark:'W07',cat:'window',type:'Single hung',w:36,h:60,room:'Bedroom 2',wall:'left',c:220,conf:.94},
  {mark:'W08',cat:'window',type:'Picture',w:72,h:60,room:'Living room',wall:'bottom',c:200,conf:.92},
  {mark:'W09',cat:'window',type:'Sliding',w:60,h:48,room:'Dining',wall:'bottom',c:580,conf:.81,note:'Operation read from the symbol only. Confirm slider vs. picture.'},
  {mark:'W10',cat:'window',type:'Casement',w:30,h:48,room:'Living room',wall:'left',c:480,conf:.9},
  {mark:'D01',cat:'door',type:'Hinged door',w:36,h:80,room:'Living room',wall:'bottom',c:385,conf:.96,swing:true},
  {mark:'D02',cat:'door',type:'Sliding door',w:72,h:80,room:'Kitchen',wall:'bottom',c:800,conf:.88,slide:true},
];
const BYMARK = Object.fromEntries(SEED.map(o => [o.mark, o]));
const ROOMS = [
  {n:'BEDROOM 2',x0:60,y0:60,x1:300,y1:360,lx:180,ly:140},{n:'BATH',x0:300,y0:60,x1:440,y1:360,lx:370,ly:236},
  {n:'BEDROOM 3',x0:440,y0:60,x1:640,y1:360,lx:540,ly:140},{n:'PRIMARY BEDROOM',x0:640,y0:60,x1:940,y1:360,lx:790,ly:140},
  {n:'LIVING ROOM',x0:60,y0:360,x1:480,y1:620,lx:270,ly:400},{n:'DINING',x0:480,y0:360,x1:680,y1:620,lx:580,ly:400},
  {n:'KITCHEN',x0:680,y0:360,x1:940,y1:620,lx:790,ly:545},
];
const INT_WALLS = [[300,60,300,360],[440,60,440,360],[640,60,640,360],[60,360,940,360],[480,360,480,620],[680,360,680,620]];
const INT_GAPS = [['h',360,240,282],['h',360,346,380],['h',360,452,494],['h',360,660,702],['v',480,398,592],['v',680,420,540]];
// 14 thin wall fragments: [x,y,w,h,dx,dy]
const FRAGS = [
  [55,55,445,10,0,-900],[500,55,445,10,0,-900],[55,615,445,10,0,900],[500,615,445,10,0,900],
  [55,65,10,275,-1500,0],[55,340,10,275,-1500,0],[935,65,10,275,1500,0],[935,340,10,275,1500,0],
  [297,65,6,295,0,-900],[437,65,6,295,0,900],[637,65,6,295,0,-900],
  [65,357,870,6,-1500,0],[477,363,6,252,0,900],[677,363,6,252,1500,0]];
function wallPos(o) {
  const L = o.w * U, a = o.c - L/2, b = o.c + L/2;
  const fixed = {top:EXT.y0, bottom:EXT.y1, left:EXT.x0, right:EXT.x1}[o.wall];
  return {a, b, L, fixed, horiz: o.wall === 'top' || o.wall === 'bottom'};
}
function bboxOf(o) {
  const {a, L, fixed, horiz} = wallPos(o);
  if (o.swing) return [a - 6, fixed - L - 8, L + 12, L + 22];
  return horiz ? [a - 7, fixed - 14, L + 14, 28] : [fixed - 14, a - 7, 28, L + 14];
}
function markerPos(o) {
  const {fixed} = wallPos(o);
  if (o.wall === 'top') return {x:o.c + 30, y:fixed + 50};
  if (o.wall === 'bottom') return {x:o.c + (o.swing ? 46 : 30), y:fixed - 44};
  if (o.wall === 'left') return {x:fixed + 58, y:o.c - 28};
  return {x:fixed - 58, y:o.c - 28};
}
const ftin = units => { const i = Math.round(units / U); return `${Math.floor(i/12)}'-${i%12}"`; };
const sizeTxt = o => `${o.w ?? '?'} × ${o.h ?? '?'}`;

function buildPlanLayers(g) {
  el('rect', {x:0, y:0, width:1000, height:720, class:'plan-bgr'}, g);
  const fragG = el('g', {}, g);
  const frags = FRAGS.map(([x, y, w, h, dx, dy]) => { const fg = el('g', {class:'frag'}, fragG); el('rect', {x, y, width:w, height:h}, fg); return {g:fg, dx, dy, cx:x + w/2, cy:y + h/2}; });
  const walls = el('g', {}, g);
  for (const [x1,y1,x2,y2] of INT_WALLS) el('line', {x1,y1,x2,y2,class:'wall-int'}, walls);
  el('rect', {x:EXT.x0, y:EXT.y0, width:EXT.x1-EXT.x0, height:EXT.y1-EXT.y0, class:'wall-ext'}, walls);
  for (const [o, f, a, b] of INT_GAPS) {
    if (o === 'h') el('rect', {x:a, y:f-5, width:b-a, height:10, class:'cover'}, walls);
    else el('rect', {x:f-5, y:a, width:10, height:b-a, class:'cover'}, walls);
  }
  const detail = el('g', {}, g);
  for (const o of SEED) {
    const {a, b, L, fixed, horiz} = wallPos(o);
    if (horiz) {
      el('rect', {x:a, y:fixed-6, width:L, height:12, class:'cover'}, walls);
      el('path', {d:`M${a} ${fixed-5}V${fixed+5}M${b} ${fixed-5}V${fixed+5}`, class:'sym'}, walls);
      if (o.swing) {
        const y = fixed - 5;
        el('line', {x1:a, y1:y, x2:a, y2:y-L, class:'leaf'}, detail);
        el('path', {d:`M${b} ${y}A${L} ${L} 0 0 0 ${a} ${y-L}`, class:'swing'}, detail);
      } else if (o.slide) {
        const m = (a+b)/2;
        el('line', {x1:a, y1:fixed-2, x2:m+5, y2:fixed-2, class:'leaf'}, detail);
        el('line', {x1:m-5, y1:fixed+3, x2:b, y2:fixed+3, class:'leaf'}, detail);
      } else {
        el('path', {d:`M${a} ${fixed-5}H${b}M${a} ${fixed}H${b}M${a} ${fixed+5}H${b}`, class:'sym'}, detail);
      }
    } else {
      el('rect', {x:fixed-6, y:a, width:12, height:L, class:'cover'}, walls);
      el('path', {d:`M${fixed-5} ${a}H${fixed+5}M${fixed-5} ${b}H${fixed+5}`, class:'sym'}, walls);
      el('path', {d:`M${fixed-5} ${a}V${b}M${fixed} ${a}V${b}M${fixed+5} ${a}V${b}`, class:'sym'}, detail);
    }
  }
  // furniture & fixtures
  const F = (tag, a) => el(tag, Object.assign({class:'furn'}, a), detail);
  const bed = (x, y, w, h) => { F('rect', {x, y, width:w, height:h, rx:3}); F('rect', {x:x+6, y:y+6, width:w/2-9, height:18, rx:2}); F('rect', {x:x+w/2+3, y:y+6, width:w/2-9, height:18, rx:2}); F('path', {d:`M${x} ${y+42}H${x+w}`}); };
  bed(150, 225, 105, 120); F('rect', {x:262, y:228, width:26, height:26});
  F('rect', {x:308, y:298, width:124, height:54, rx:8}); F('rect', {x:316, y:305, width:108, height:40, rx:16});
  F('rect', {x:418, y:118, width:16, height:36, rx:2}); F('ellipse', {cx:404, cy:136, rx:14, ry:12});
  F('rect', {x:306, y:120, width:30, height:60}); F('ellipse', {cx:321, cy:150, rx:9, ry:14});
  bed(500, 225, 95, 120);
  bed(725, 205, 130, 140); F('rect', {x:697, y:208, width:24, height:24}); F('rect', {x:859, y:208, width:24, height:24});
  F('rect', {x:120, y:430, width:170, height:40, rx:4}); F('path', {d:'M134 440H276'}); F('rect', {x:120, y:430, width:14, height:40}); F('rect', {x:276, y:430, width:14, height:40});
  F('rect', {x:170, y:494, width:70, height:36, rx:3}); F('rect', {x:330, y:440, width:40, height:40, rx:4});
  F('rect', {x:535, y:445, width:90, height:70, rx:3});
  [[548,430],[592,430],[548,521],[592,521]].forEach(([x, y]) => F('rect', {x, y, width:20, height:14, rx:2}));
  F('rect', {x:519, y:471, width:14, height:18, rx:2}); F('rect', {x:627, y:471, width:14, height:18, rx:2});
  F('rect', {x:690, y:366, width:245, height:28}); F('rect', {x:907, y:394, width:28, height:200});
  F('rect', {x:911, y:462, width:20, height:36, rx:3}); F('circle', {cx:730, cy:380, r:6}); F('circle', {cx:752, cy:380, r:6});
  F('rect', {x:755, y:445, width:90, height:42, rx:3});
  for (const r of ROOMS) el('text', {x:r.lx, y:r.ly, class:'room'}, detail).textContent = r.n;
  // dimensions + tags + title block
  const dims = el('g', {}, g);
  for (const r of ROOMS) el('text', {x:r.lx, y:r.ly + 15, class:'room-sz'}, dims).textContent = `${ftin(r.x1-r.x0)} × ${ftin(r.y1-r.y0)}`;
  for (const o of SEED) {
    const {fixed} = wallPos(o);
    let tx, ty;
    if (o.wall === 'top') { tx = o.c; ty = fixed + 26; }
    else if (o.wall === 'bottom') { tx = o.c; ty = fixed + 22; }
    else if (o.wall === 'left') { tx = fixed + 30; ty = o.c; }
    else { tx = fixed - 30; ty = o.c; }
    const tg = el('g', {class:'tag'}, dims);
    if (o.cat === 'door') el('circle', {cx:tx, cy:ty, r:12}, tg);
    else el('rect', {x:tx-16, y:ty-8, width:32, height:16, rx:2}, tg);
    el('text', {x:tx, y:ty}, tg).textContent = o.mark;
  }
  const dim = (x1, y1, x2, y2, label, vertical) => {
    el('line', {x1, y1, x2, y2, class:'dimln'}, dims);
    for (const [x, y] of [[x1,y1],[x2,y2]]) el('line', {x1:x-4, y1:y+4, x2:x+4, y2:y-4, class:'dimln'}, dims);
    if (vertical) el('text', {x:x1-6, y:(y1+y2)/2, class:'dimtx', transform:`rotate(-90 ${x1-6} ${(y1+y2)/2})`}, dims).textContent = label;
    else el('text', {x:(x1+x2)/2, y:y1-5, class:'dimtx'}, dims).textContent = label;
  };
  dim(60, 20, 940, 20, ftin(880));
  [[60,300],[300,440],[440,640],[640,940]].forEach(([a,b]) => dim(a, 42, b, 42, ftin(b-a)));
  dim(28, 60, 28, 620, ftin(560), true);
  const tb = el('g', {}, dims);
  el('rect', {x:60, y:660, width:880, height:46, class:'tb-line'}, tb);
  el('path', {d:'M380 660v46M600 660v46M800 660v46', class:'tb-line'}, tb);
  const tt = (x, y, cls, s) => { el('text', {x, y, class:cls}, tb).textContent = s; };
  tt(72, 680, 'tb-t', 'DEMO RESIDENCE'); tt(72, 697, 'tb-s', 'NEW SINGLE-FAMILY · PHOENIX, AZ');
  tt(392, 680, 'tb-t', 'A1.0 FLOOR PLAN'); tt(392, 697, 'tb-s', 'SCALE 1/4" = 1\'-0"');
  tt(612, 680, 'tb-t', 'APPROVED FOR PERMIT'); tt(612, 697, 'tb-s', 'REV 3');
  tt(812, 680, 'tb-t', 'SHEET 1 OF 1');
  el('circle', {cx:910, cy:683, r:13, class:'tb-line'}, tb);
  el('path', {d:'M910 671l6 18-6-4-6 4z', style:'fill:var(--plan)'}, tb);
  return {frags, walls, detail, dims};
}
const buildPlan = g => buildPlanLayers(g);
function setFrag(f, e) {
  f.g.setAttribute('transform', `translate(${(f.dx*(1-e)).toFixed(1)} ${(f.dy*(1-e)).toFixed(1)}) translate(${f.cx} ${f.cy}) scale(${lerp(1.1, 1, e).toFixed(4)}) translate(${-f.cx} ${-f.cy})`);
  f.g.style.opacity = clamp(e * 1.6, 0, 1);
}
function makeDet(parent, box, o, opt = {}) {
  const [x, y, w, h] = box;
  const g = el('g', {class: opt.cls || 'det'}, parent);
  el('rect', {x, y, width:w, height:h, class:'det-box'}, g);
  const k = opt.corner || Math.min(10, w*.35, h*.35);
  el('path', {class:'corner', d:bracketPath(x, y, w, h, k)}, g);
  if (opt.chip) {
    const fs = opt.fs || 11, txt = o.mark;
    const cw = fs * .64 * txt.length + fs * .9, ch = fs * 1.45;
    const cy = y - ch - 2 < 0 ? y + h + 2 : y - ch - 2;
    const c = el('g', {class:'chip'}, g);
    el('rect', {x, y:cy, width:cw, height:ch, rx:fs*.15}, c);
    el('text', {x:x + fs*.45, y:cy + ch/2, 'font-size':fs}, c).textContent = txt;
  }
  return g;
}
function openingStatus(it) {
  if (it.approved) return 'ok';
  if (it.w == null || it.h == null) return 'missing';
  if (it.conf < .85) return 'review';
  return 'ready';
}
const ST_LABEL = {ok:'Verified', missing:'Needs review', review:'Needs review', ready:'AI read'};
const stLabel = it => { const st = openingStatus(it); return st === 'ok' && (it.edited || it.added) ? 'Edited' : ST_LABEL[st]; };
const pname = g => g.cat === 'window' && !/window|unknown/i.test(g.type) ? g.type + ' window' : g.type;

