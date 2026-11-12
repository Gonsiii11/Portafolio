/* Camera: the views (the rider's eyes, close to the TFT, the bike from outside), how each is framed in the
   part of the screen the page leaves free. The shared `view` state is also driven by controles.js. */
import * as T from 'three';
import { reduce, clamp } from '../config.js';
import { W3 } from '../moto/moto.js';

/* home = rider's eyes (also behind the section pages, blurred); tft = close to the screen to use its menu;
   ext = the bike from outside.
   t = look-at point, w/h = world size to fit, d = view direction */
var VIEWS = {
  home: { fp: true, eye: W3([0, 0.92, 0.22]), tgt: W3([0, 0.52, -0.8]), eyeP: W3([0, 1.05, 0.5]), tgtP: W3([0, 0.45, -0.7]) },
  /* step 1 of the TFT menu: the camera comes close and faces the screen (centre and normal measured from the model) */
  tft: { t: W3([0.001, 0.415, -0.553]), w: 0.2, h: 0.12, d: [0, 0.563, 0.826] },  /* the dash glass, framed whole */
  ext: { t: W3([0, 0.32, 0.01]), w: 2.5, h: 1.3, d: [0.55, 0.3, 0.8] }
};

export function createCamera(renderer, rig) {
  var app = document.getElementById('app');
  var camera = new T.PerspectiveCamera(55, 1, 0.02, 700);
  /* shared with the controls: which view, where the rider is looking, whether the bike is shown from outside */
  var view = { cur: 'home', ext: false, yaw: 0, pitch: 0, yawT: 0, pitchT: 0, spinT: 0, lastInteract: 0, speedT: 16, drag: null };
  var size = { w: 1, h: 1 }, portraitMix = 0;
  var offX = 0, offY = 0, first = true;
  var camTgt = new T.Vector3(), camPos = new T.Vector3(), desTgt = new T.Vector3(), desPos = new T.Vector3();
  var eye = new T.Vector3(), tg = new T.Vector3(), fwd = new T.Vector3(), rightV = new T.Vector3(), O = new T.Vector3();
  var X_AXIS = new T.Vector3(1, 0, 0), Y_AXIS = new T.Vector3(0, 1, 0);

  /* the part of the screen the scene should frame its subject in (the hero text and the section panel take the rest) */
  function region(W, H) {
    if (W >= 900) return { l: 380, t: 70, r: W - 16, b: H - 24 };
    return { l: 0, t: Math.min(250, H * 0.34), r: W, b: H - 56 };
  }
  function resize() {
    size.w = app.clientWidth || 1; size.h = app.clientHeight || 1;
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    portraitMix = clamp((1 - camera.aspect) / 0.5, 0, 1);
    camera.fov = 58 + 20 * portraitMix;
    camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(app); else window.addEventListener('resize', resize);
  resize();

  /* camera for this frame; the speed sets a faint vibration */
  function update(now, dt, speed) {
    var k = reduce ? 1 : 1 - Math.exp(-dt * 4.5), k2 = reduce ? 1 : 1 - Math.exp(-dt * 10);
    var swayYaw = (!reduce && view.cur === 'home' && now - view.lastInteract > 2500) ? Math.sin(now * 0.0004) * 0.005 : 0;  /* idle sway, kept tiny so the background stays calm */
    view.yaw += (view.yawT + swayYaw - view.yaw) * k2; view.pitch += (view.pitchT - view.pitch) * k2;
    if (view.ext && !reduce && now - view.lastInteract > 2500 && !view.drag) view.spinT += dt * 0.35;
    rig.rotation.y += ((view.ext ? view.spinT : 0) - rig.rotation.y) * (reduce ? 1 : 1 - Math.exp(-dt * 7));
    var v = VIEWS[view.cur], W = size.w, H = size.h, rg = region(W, H), ox, oy;
    if (v.fp) {
      var mix = portraitMix;
      eye.set(v.eye[0] + (v.eyeP[0] - v.eye[0]) * mix, v.eye[1] + (v.eyeP[1] - v.eye[1]) * mix, v.eye[2] + (v.eyeP[2] - v.eye[2]) * mix);
      tg.set(v.tgt[0] + (v.tgtP[0] - v.tgt[0]) * mix, v.tgt[1] + (v.tgtP[1] - v.tgt[1]) * mix, v.tgt[2] + (v.tgtP[2] - v.tgt[2]) * mix);
      fwd.copy(tg).sub(eye).normalize().applyAxisAngle(Y_AXIS, view.yaw);
      rightV.crossVectors(fwd, Y_AXIS).normalize();
      fwd.applyAxisAngle(rightV, view.pitch);
      desTgt.copy(eye).addScaledVector(fwd, 2); desPos.copy(eye);
      ox = W >= 900 ? W / 2 - (380 + W - 16) / 2 : 0; oy = 0;
    } else {
      var tanV = Math.tan(camera.fov * Math.PI / 360);
      var fw = Math.max(0.2, (rg.r - rg.l) / W), fh = Math.max(0.2, (rg.b - rg.t) / H);
      var dist = Math.max(v.h / (2 * tanV * fh), v.w / (2 * tanV * (W / H) * fw));
      O.set(v.d[0], v.d[1], v.d[2]).normalize().multiplyScalar(dist);
      O.applyAxisAngle(X_AXIS, -view.pitch).applyAxisAngle(Y_AXIS, view.ext ? 0 : -view.yaw);
      desTgt.set(v.t[0], v.t[1], v.t[2]); desPos.copy(desTgt).add(O);
      ox = W / 2 - (rg.l + rg.r) / 2; oy = H / 2 - (rg.t + rg.b) / 2;
    }
    if (first) { camTgt.copy(desTgt); camPos.copy(desPos); offX = ox; offY = oy; first = false; }
    camTgt.lerp(desTgt, k); camPos.lerp(desPos, k);
    offX += (ox - offX) * k; offY += (oy - offY) * k;
    var sh = reduce ? 0 : Math.min(1, speed / 20) * 0.0006;
    var breath = reduce ? 0 : Math.sin(now * 0.0021) * 0.0012 * (v.fp ? 1 : 0.3);
    camera.position.set(camPos.x + Math.sin(now * 0.031) * sh, camPos.y + Math.sin(now * 0.047 + 1) * sh * 1.3 + breath, camPos.z);
    camera.lookAt(camTgt);
    if (v.fp) camera.rotateZ(-view.yaw * 0.12);
    camera.setViewOffset(W, H, offX, offY, W, H);
  }

  return {
    camera: camera,
    view: view,
    update: update,
    setExt: function (on) {
      view.ext = !!on; view.yawT = 0; view.pitchT = view.ext ? 0.08 : 0; view.lastInteract = performance.now();
      if (view.ext) { view.cur = 'ext'; view.speedT = 0; view.spinT = -0.5; } else { view.cur = 'home'; view.speedT = 16; view.spinT = rig.rotation.y = 0; }
    },
    /* sections no longer zoom to a control: the rider's view stays, blurred behind the page */
    /* the TFT menu, step 1: come close to the screen; back(): return to the rider's view */
    focusTft: function () { view.cur = 'tft'; view.yawT = 0; view.pitchT = 0; view.speedT = 8; view.lastInteract = performance.now(); },
    back: function () { view.cur = 'home'; view.yawT = 0; view.pitchT = 0; view.speedT = 16; },
    setView: function (id) {
      if (view.ext) { view.ext = false; view.spinT = rig.rotation.y = 0; }
      view.cur = 'home';
      view.yawT = 0; view.pitchT = 0; view.speedT = id === 'home' ? 16 : 5;
    }
  };
}
