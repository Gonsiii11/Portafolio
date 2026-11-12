/* Input: drag to look around (or spin the bike when seen from outside), tap or click a control to open its section,
   hover to make it glow; arrow keys turn the view and Home recentres it. */
import * as T from 'three';
import { reduce, clamp } from '../config.js';

export function createControls(canvas, cam, bike, page) {
  var camera = cam.camera, view = cam.view;
  var ray = new T.Raycaster(), ndc = new T.Vector2(), hoverMesh = null;

  function pick(cx, cy) {
    if (view.ext) return null;
    var r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(bike.hot, false);
    return hits.length ? hits[0].object : null;
  }
  function setHover(mesh) {
    if (mesh === hoverMesh) return;
    hoverMesh = mesh;
    var gid = mesh ? mesh.userData.gid : null;
    for (var id in bike.groups) bike.groups[id].t = (id === gid) ? 1 : 0;
    canvas.style.cursor = view.drag ? 'grabbing' : (mesh ? 'pointer' : 'grab');
  }
  function activate(mesh) {
    if (!mesh) return;
    var u = mesh.userData;
    if (u.isExt) { page.toggleExt(true); return; }
    if (u.isStart) {  /* the start button: the needle revs, then Contact opens */
      page.state.boot = true; bike.dash.revT = 0.98; bike.dash.dirty = true;
      setTimeout(function () { page.state.boot = false; page.setSection('contact'); }, reduce ? 0 : 650);
      return;
    }
    page.setSection(u.section, { view: u.view });
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
    canvas.style.cursor = hoverMesh ? 'pointer' : 'grab';
    if (!moved && !cancelled) activate(pick(e.clientX, e.clientY));
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
