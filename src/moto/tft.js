/* The TFT's pure logic (no three.js, tested in tests/tft.test.js): where the menu rows sit on the 1024×512 canvas,
   which row a touch lands on, a believable gear and rev count for a speed, and the text formats it shows. */

export var TFT_W = 1024, TFT_H = 512;

export var MENU = [{ id: 'about', label: 'SOBRE MÍ' }, { id: 'projects', label: 'PROYECTOS' }, { id: 'contact', label: 'CONTACTO' }];

/* menu rows in canvas pixels (origin top-left): right half of the screen, 84 px tall, 6 px apart */
var ROW_X = 560, ROW_W = 420, ROW_Y = 132, ROW_H = 84, ROW_GAP = 6;
export function menuRows() {
  return MENU.map(function (m, i) { return { id: m.id, label: m.label, x: ROW_X, y: ROW_Y + i * (ROW_H + ROW_GAP), w: ROW_W, h: ROW_H }; });
}

/* u, v are the screen plane's three.js UVs (v = 0 at the bottom) */
export function tftHit(u, v) {
  var x = u * TFT_W, y = (1 - v) * TFT_H, rows = menuRows();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
  }
  return null;
}

/* gear bands in km/h; within each band the revs climb from 4000 to 11500 */
var GEARS = [0, 20, 38, 58, 80, 105, 150];
export function gearAndRpm(speedMs) {
  if (speedMs < 0.5) return { gear: 1, rpm: 1200 };
  var kmh = speedMs * 3.6, g = 1;
  while (g < 6 && kmh >= GEARS[g]) g++;
  var t = (kmh - GEARS[g - 1]) / (GEARS[g] - GEARS[g - 1]);
  return { gear: g, rpm: Math.min(14000, Math.round(4000 + t * 7500)) };
}

export function formatTrip(meters) { return (meters / 1000).toFixed(1).replace('.', ',') + ' KM'; }

export function formatClock(date) {
  function two(n) { return (n < 10 ? '0' : '') + n; }
  return two(date.getHours()) + ':' + two(date.getMinutes());
}
