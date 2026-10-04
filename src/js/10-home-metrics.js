'use strict';
/* ------------------------------------------------------------------
   07 Metrics
------------------------------------------------------------------ */
const NUMS = {windows:10, doors:2, products:7, openings:12, src:'From sheet A1.0 · Demo Residence'};
function countUp() {
  $$('#metrics [data-n]').forEach(b => {
    const to = NUMS[b.dataset.n];
    tween(850, t => { b.textContent = pad2(Math.round(to * t)); }, easeOutQuart);
  });
  $('#msrc').textContent = NUMS.src;
}
function initMetrics() {
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) countUp(); }), {threshold:.45}).observe($('#metrics .mgrid'));
}

