/* Which key presses turn the 3D view (tested in tests/teclas.test.js). Arrows turn, Home recentres; but never while a
   section page is open (the keys scroll the page then), inside a form field, or with a modifier held. */
var VIEW_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Home: 1 };

export function takesViewKeys(e) {
  if (!VIEW_KEYS[e.key] || e.sectionOpen) return false;
  if (e.targetTag === 'INPUT' || e.targetTag === 'TEXTAREA' || e.targetTag === 'SELECT') return false;
  return !(e.altKey || e.ctrlKey || e.metaKey);
}
