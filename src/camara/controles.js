/* Input: drag to look around (or spin the bike when seen from outside); tap or click a row of the TFT menu to open
   its section, hover it to light it up; arrow keys turn the view and Home recentres it. */
import * as T from 'three';
import { clamp } from '../config.js';
import { tftHit } from '../moto/tft.js';

export function createControls(canvas, cam, bike, page) {
  var camera = cam.camera, view = cam.view;
  var ray = new T.Raycaster(), ndc = new T.Vector2(), hoverId = null, flashTimer = 0;

  /* the TFT menu row under a screen point ('about' | 'projects' | 'contact'), or null */
  function pick(cx, cy) {
    if (view.ext) return null;
    var r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObject(bike.screen, false)[0];
    return hit && hit.uv ? tftHit(hit.uv.x, hit.uv.y) : null;
  }
  function setHover(id) {
    if (id === hoverId) return;
    hoverId = id;
    bike.setHover(id);
    canvas.style.cursor = view.drag ? 'grabbing' : (id ? 'pointer' : 'grab');
  }

  canvas.addEventListener('pointerdown', function (e) {
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
    canvas.style.cursor = hoverId ? 'pointer' : 'grab';
    if (moved || cancelled) return;
    var id = pick(e.clientX, e.clientY);
    if (!id) return;
    if (e.pointerType !== 'mouse') {  /* touch has no hover: light the row for a moment */
      setHover(id); clearTimeout(flashTimer); flashTimer = setTimeout(function () { setHover(null); }, 250);
    }
    page.setSection(id);
  }
  canvas.addEventListener('pointerup', function (e) { endDrag(e, false); });
  canvas.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  canvas.addEventListener('pointerleave', function () { if (!view.drag) setHover(null); });

  /* arrow keys turn the view; Home recentres */
  function nudge(dy, dp) {
    if (view.ext) { view.spinT += dy * 1.5; view.pitchT = clamp(view.pitchT + dp, -0.25, 0.35); view.lastInteract = performance.now(); return; }
    view.yawT = clamp(view.yawT + dy, -1.2, 1.2); view.pitchT = clamp(view.pitchT + dp, -0.45, 0.45); view.lastInteract = performance.now();
  }
  window.addEventListener('keydown', function (e) {
    var tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key, hit = true;
    if (k === 'ArrowLeft') nudge(0.1, 0); else if (k === 'ArrowRight') nudge(-0.1, 0);
    else if (k === 'ArrowUp') nudge(0, 0.06); else if (k === 'ArrowDown') nudge(0, -0.06);
    else if (k === 'Home') { view.yawT = 0; view.pitchT = 0; if (view.ext) view.spinT = -0.5; } else hit = false;
    if (hit) e.preventDefault();
  });
}
