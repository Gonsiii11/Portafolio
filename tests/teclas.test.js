/* Which key presses turn the 3D view. With a section page open, arrows and Home belong to the page (scrolling). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takesViewKeys } from '../src/camara/teclas.js';

test('arrows turn the view from the seat', () => {
  assert.equal(takesViewKeys({ key: 'ArrowLeft', sectionOpen: false, targetTag: 'BODY' }), true);
});

test('with a page open, arrows and Home scroll the page instead of turning the view', () => {
  assert.equal(takesViewKeys({ key: 'ArrowDown', sectionOpen: true, targetTag: 'H2' }), false);
  assert.equal(takesViewKeys({ key: 'Home', sectionOpen: true, targetTag: 'H2' }), false);
});

test('keys typed in a form field or with a modifier never turn the view', () => {
  assert.equal(takesViewKeys({ key: 'ArrowLeft', sectionOpen: false, targetTag: 'INPUT' }), false);
  assert.equal(takesViewKeys({ key: 'ArrowLeft', sectionOpen: false, targetTag: 'BODY', ctrlKey: true }), false);
});

test('other keys are not the view’s business', () => {
  assert.equal(takesViewKeys({ key: 'a', sectionOpen: false, targetTag: 'BODY' }), false);
});
