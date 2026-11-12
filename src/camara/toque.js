/* What a tap does, in two steps (tested in tests/toque.test.js). view = 'home' (rider's view), 'tft' (camera close to
   the screen) or 'ext' (bike from outside); onScreen = the tap hit the TFT; row = the menu row it hit, or null.
   Returns { focus: true } (bring the camera to the screen), { open: id } (open that section), { back: true }
   (return to the rider's view) or null (nothing). */
export function tftTap(view, onScreen, row) {
  if (view === 'home') return onScreen ? { focus: true } : null;
  if (view === 'tft') {
    if (!onScreen) return { back: true };
    return row ? { open: row } : null;
  }
  return null;
}
