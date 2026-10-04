'use strict';
/* ------------------------------------------------------------------
   Scroll scheduler
------------------------------------------------------------------ */
const SCENES = [];
let ticking = false;
function runScenes() { ticking = false; for (const f of SCENES) f(); }
const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(runScenes); } };
addEventListener('scroll', kick, {passive:true});
addEventListener('resize', () => { LAYOUT_DIRTY = true; kick(); });
let LAYOUT_DIRTY = true;

