/* Tests for the TFT's pure logic: which menu row a touch lands on, gear and revs from the speed, and text formats.
   Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TFT_W, TFT_H, MENU, menuRows, tftHit, gearAndRpm, formatTrip, formatClock } from '../src/moto/tft.js';

/* three.js plane UVs: v = 0 at the bottom, so canvas y = (1 - v) * TFT_H */
function uvAt(x, y) { return [x / TFT_W, 1 - y / TFT_H]; }

test('the menu has exactly the three sections, in order', () => {
  assert.deepEqual(MENU.map((m) => m.id), ['about', 'projects', 'contact']);
  assert.deepEqual(MENU.map((m) => m.label), ['SOBRE MÍ', 'PROYECTOS', 'CONTACTO']);
});

test('touching the centre of each row opens that row', () => {
  menuRows().forEach((r) => {
    var uv = uvAt(r.x + r.w / 2, r.y + r.h / 2);
    assert.equal(tftHit(uv[0], uv[1]), r.id);
  });
});

test('touching the gauge, the top bar or the gap between rows opens nothing', () => {
  assert.equal(tftHit(0.1, 0.5), null);
  assert.equal(tftHit(0.75, 0.97), null);
  var rows = menuRows(), gapY = rows[0].y + rows[0].h + 3, uv = uvAt(rows[0].x + rows[0].w / 2, gapY);
  assert.equal(tftHit(uv[0], uv[1]), null);
});

test('standing still idles in first gear', () => {
  assert.deepEqual(gearAndRpm(0), { gear: 1, rpm: 1200 });
});

test('57.6 km/h is the top of third gear', () => {
  var r = gearAndRpm(16);
  assert.equal(r.gear, 3);
  assert.ok(r.rpm >= 11000 && r.rpm <= 11500, 'rpm ' + r.rpm);
});

test('just past 58 km/h shifts up to fourth with low revs', () => {
  var r = gearAndRpm(16.2);
  assert.equal(r.gear, 4);
  assert.ok(r.rpm < 4300, 'rpm ' + r.rpm);
});

test('very fast stays in sixth and never passes 14000 rpm', () => {
  var r = gearAndRpm(60);
  assert.equal(r.gear, 6);
  assert.ok(r.rpm <= 14000, 'rpm ' + r.rpm);
});

test('trip shows kilometres with one decimal and a comma', () => {
  assert.equal(formatTrip(2430), '2,4 KM');
  assert.equal(formatTrip(0), '0,0 KM');
  assert.equal(formatTrip(12960), '13,0 KM');
});

test('clock shows HH:MM with leading zeros', () => {
  assert.equal(formatClock(new Date(2026, 10, 12, 9, 5)), '09:05');
});
