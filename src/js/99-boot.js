'use strict';
/* ------------------------------------------------------------------
   Boot
------------------------------------------------------------------ */
function initNav() { const nav = $('#nav'); SCENES.push(() => nav.classList.toggle('solid', scrollY > 10)); }
initNav(); initTheme(); initCursor(); initRouter(); initReveals(); initHero(); initStages(); initReviewScene(); initProcureScene(); initFulfillScene(); initHandoffs(); initMetrics(); initContact();
initUpload(); initViewer(); initReview(); initAI(); initDownloads();
renderSteps();
showPage(pageFromHash(), false);
if (location.hash === '#takeoff') openApp();
runScenes();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { LAYOUT_DIRTY = true; runScenes(); });
