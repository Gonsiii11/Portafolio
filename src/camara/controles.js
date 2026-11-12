/* Input: drag to look around (or spin the bike when seen from outside). The TFT menu works in two steps (toque.js):
   a tap on the screen brings the camera close to it; close up, a tap on a row opens its section (hovering lights the
   row up) and a tap elsewhere, or Escape, goes back. Arrow keys turn the view and Home recentres it. */
import * as T from 'three';
import { clamp } from '../config.js';
import { tftHit } from '../moto/tft.js';
import { takesViewKeys } from './teclas.js';
import { tftTap, countsAsTap } from './toque.js';

export function createControls(canvas, cam, bike, page) {
  var camera = cam.camera, view = cam.view;
  var ray = new T.Raycaster(), ndc = new T.Vector2(), hoverId = null, flashTimer = 0;

  /* what is under a screen point: { onScreen: the TFT was hit, row: its menu row or null } */
  function pick(cx, cy) {
    if (view.ext) return { onScreen: false, row: null };
    var r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObject(bike.screen, false)[0];
    return { onScreen: !!hit, row: hit && hit.uv ? tftHit(hit.uv.x, hit.uv.y) : null };
  }
  /* rows light up only close up; from the rider's view the whole screen is the target */
  var overScreen = false;
  function setHover(p) {
    var id = view.cur === 'tft' ? p.row : null, on = view.cur === 'tft' ? !!p.row : p.onScreen;
    if (id !== hoverId) { hoverId = id; bike.setHover(id); }
    overScreen = on;
    canvas.style.cursor = view.drag ? 'grabbing' : (on ? 'pointer' : 'grab');
  }
  var NONE = { onScreen: false, row: null };
  /* the hint line says what to do in each step */
  var hint = document.getElementById('hint'), HINT_HOME = hint ? hint.textContent : '', HINT_TFT = 'TOCA UNA OPCIÓN · TOCA FUERA PARA VOLVER';
  function focusTft() { cam.focusTft(); setHover(NONE); if (hint) hint.textContent = HINT_TFT; }
  function goBack() { cam.back(); setHover(NONE); if (hint) hint.textContent = HINT_HOME; }

  canvas.addEventListener('pointerdown', function (e) {
    if (!countsAsTap(e.pointerType, e.button)) return;  /* right/middle click: not a look-around, not a tap */
    view.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', function (e) {
    var drag = view.drag;
    if (drag && drag.id === e.pointerId) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved && view.ext) {
        view.spinT += dx * 0.01; view.pitchT = clamp(view.pitchT + dy * 0.003, -0.25, 0.35);
        drag.x = e.clientX; drag.y = e.clientY; view.lastInteract = performance.now();
      } else if (drag.moved) {
        view.yawT = clamp(view.yawT + dx * 0.006, -1.2, 1.2);
        view.pitchT = clamp(view.pitchT + dy * 0.004, -0.45, 0.45);
        drag.x = e.clientX; drag.y = e.clientY; view.lastInteract = performance.now();
      }
    } else if (e.pointerType === 'mouse') {
      setHover(pick(e.clientX, e.clientY));
    }
  });
  function endDrag(e, cancelled) {
    if (!view.drag || view.drag.id !== e.pointerId) return;
    var moved = view.drag.moved; view.drag = null;
    canvas.style.cursor = overScreen ? 'pointer' : 'grab';
    if (moved || cancelled) return;
    var p = pick(e.clientX, e.clientY), act = tftTap(view.cur, p.onScreen, p.row);
    if (!act) return;
    if (act.focus) { focusTft(); return; }
    if (act.back) { goBack(); return; }
    if (e.pointerType !== 'mouse') {  /* touch has no hover: light the row for a moment */
      setHover(p); clearTimeout(flashTimer); flashTimer = setTimeout(function () { setHover(NONE); }, 250);
    } else setHover(NONE);
    if (hint) hint.textContent = HINT_HOME;  /* the page opens over the rider's view */
    page.setSection(act.open);
  }
  canvas.addEventListener('pointerup', function (e) { endDrag(e, false); });
  canvas.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  canvas.addEventListener('pointerleave', function () { if (!view.drag) setHover(NONE); });
  /* Escape close to the screen goes back to the rider's view (a page or the credits, if open, take Escape first) */
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && view.cur === 'tft' && page.state.section === 'home') goBack();
  });

  /* arrow keys turn the view; Home recentres */
  function nudge(dy, dp) {
    if (view.ext) { view.spinT += dy * 1.5; view.pitchT = clamp(view.pitchT + dp, -0.25, 0.35); view.lastInteract = performance.now(); return; }
    view.yawT = clamp(view.yawT + dy, -1.2, 1.2); view.pitchT = clamp(view.pitchT + dp, -0.45, 0.45); view.lastInteract = performance.now();
  }
  window.addEventListener('keydown', function (e) {
    if (!takesViewKeys({ key: e.key, sectionOpen: page.state.section !== 'home', targetTag: e.target && e.target.tagName, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey })) return;
    var k = e.key;
    if (k === 'ArrowLeft') nudge(0.1, 0); else if (k === 'ArrowRight') nudge(-0.1, 0);
    else if (k === 'ArrowUp') nudge(0, 0.06); else if (k === 'ArrowDown') nudge(0, -0.06);
    else { view.yawT = 0; view.pitchT = 0; if (view.ext) view.spinT = -0.5; }  /* Home */
    e.preventDefault();
  });
}
