/* Credits: a short line always on screen; the button opens the full list
   (closes on Escape, an outside click or the button again). */
export function initCredits() {
  var credits = document.getElementById('credits'), credBtns = document.querySelectorAll('.credbtn'), credFrom = null;
  function setCredits(open, from) {
    credits.hidden = !open;
    credBtns.forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    if (open) credFrom = from || null;
    else if (credFrom && credits.contains(document.activeElement)) credFrom.focus();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.credbtn');
    if (b) { setCredits(credits.hidden, b); return; }
    if (!credits.hidden && !credits.contains(e.target)) setCredits(false);
  }, true);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !credits.hidden) { e.stopPropagation(); setCredits(false); if (credFrom) credFrom.focus(); }
  }, true);
}
