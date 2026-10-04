'use strict';
/* ------------------------------------------------------------------
   Pricing model (shared by the story and the demo)
   Calibrated so the sample plan, once W02 is corrected to 24 × 36,
   prices at exactly the figures used on the homepage.
------------------------------------------------------------------ */
const BASE = {'Single hung':412,'Double hung':470,'Casement':560,'Awning':450,'Picture':1400,'Sliding':510,'Hinged door':3600,'Sliding door':7500,'French door':7800,'Unknown':520};
function rawUnit(g) {
  const door = g.cat === 'door';
  const w = g.w || 36, h = g.h || (door ? 80 : 60);
  return (BASE[g.type] || 520) * Math.pow((w * h) / (door ? 36*80 : 36*60), .55);
}
const SAMPLE_RAW = SEED.reduce((s, o) => s + rawUnit(o.mark === 'W02' ? {...o, h:36} : o), 0);
const SCALE = 27800 / SAMPLE_RAW;
const unitPrice = g => rawUnit(g) * SCALE;
const MFRS = [
  {name:'Northline Window Co.', short:'Northline', note:'Vinyl & clad · Denver, CO', mult:1, freight:1600, lead:7, warranty:'20 years'},
  {name:'Cascade Fenestration', short:'Cascade', note:'Aluminum-clad · Tacoma, WA', mult:29100/27800, freight:1200, lead:5, warranty:'20 years'},
  {name:'Mesa Ridge Windows', short:'Mesa Ridge', note:'Vinyl · Tucson, AZ', mult:26900/27800, freight:2100, lead:9, warranty:'15 years', dev:true},
];
const INSTALL_PER = 5500 / 12;
// landed cost of the whole sample package per manufacturer (product + freight): 29,400 · 30,300 · 29,000
const PKG_LANDED = MFRS.map(m => Math.round(27800 * m.mult) + m.freight);
const SH_UNIT = unitPrice({cat:'window', type:'Single hung', w:36, h:60});

