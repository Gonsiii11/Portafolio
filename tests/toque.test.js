/* The TFT works in two steps: from the rider's view a tap on the screen brings the camera close to it; close up, a tap
   on a row opens that section, and a tap anywhere else goes back to the rider's view. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tftTap } from '../src/camara/toque.js';

test('from the rider’s view, tapping the screen (even on a row) only brings the camera close', () => {
  assert.deepEqual(tftTap('home', true, 'projects'), { focus: true });
  assert.deepEqual(tftTap('home', true, null), { focus: true });
});

test('from the rider’s view, tapping elsewhere does nothing', () => {
  assert.equal(tftTap('home', false, null), null);
});

test('close up, tapping a row opens its section', () => {
  assert.deepEqual(tftTap('tft', true, 'contact'), { open: 'contact' });
});

test('close up, tapping the screen between rows does nothing, tapping off the screen goes back', () => {
  assert.equal(tftTap('tft', true, null), null);
  assert.deepEqual(tftTap('tft', false, null), { back: true });
});

test('with the bike seen from outside, taps never reach the screen', () => {
  assert.equal(tftTap('ext', true, 'about'), null);
});

test('only the main mouse button (or any touch or pen) counts as a tap', async () => {
  const { countsAsTap } = await import('../src/camara/toque.js');
  assert.equal(countsAsTap('mouse', 0), true);
  assert.equal(countsAsTap('mouse', 1), false);  /* middle */
  assert.equal(countsAsTap('mouse', 2), false);  /* right */
  assert.equal(countsAsTap('touch', 0), true);
  assert.equal(countsAsTap('pen', 0), true);
});
