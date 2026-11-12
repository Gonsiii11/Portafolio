/* ---------- loading in phases, so the first view stays light ----------
   1) straight away: the bike (moto.js), the asphalt and a 1k sky (52 KB);
   2) once the bike is on screen: terrain, pines and rocks, textures in small sizes;
   3) when the browser is idle: the large textures swap in.
   TIER 1 (touch screens, data saver, 2g/3g) stops at smaller "large" sizes than TIER 2 (desktop).
   Texture variants are WebP, made by herramientas/variantes_web.py. */
import * as T from 'three';
import { LOW_GPU } from './medidas.js';

export function createLoader(renderer) {
  var conn = navigator.connection || {};
  var TIER = (LOW_GPU || conn.saveData || /2g|3g/.test(conn.effectiveType || '')) ? 1 : 2;
  var whenIdle = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 3000 }); } : function (f) { setTimeout(f, 500); };
  var bikeShown, afterBike = new Promise(function (r) { bikeShown = r; });
  setTimeout(function () { bikeShown(); }, 8000);  /* a very slow bike must not hold the scenery back forever */
  var texLoader = new T.TextureLoader(), MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  function loadTex(url, srgb, cb) {
    texLoader.load(url, function (t) {
      if (srgb) t.encoding = T.sRGBEncoding;
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = MAX_ANISO;
      cb(t);
    });
  }
  /* small (now, or after the bike if `late`) then large (when idle after the bike); a late small never replaces a large */
  function loadTiered(small, large, srgb, apply, late) {
    var cur = null, rank = -1;
    function use(r) { return function (t) { if (r < rank) { t.dispose(); return; } var old = cur; cur = t; rank = r; apply(t); if (old) old.dispose(); }; }
    if (small) { if (late) afterBike.then(function () { loadTex(small, srgb, use(0)); }); else loadTex(small, srgb, use(0)); }
    if (large) afterBike.then(function () { whenIdle(function () { loadTex(large, srgb, use(1)); }); });
  }

  return {
    TIER: TIER,
    MAX_ANISO: MAX_ANISO,
    afterBike: afterBike,          /* resolves when the bike and its textures are in (phase 2 starts) */
    bikeShown: function () { bikeShown(); },
    loadTex: loadTex,
    loadTiered: loadTiered
  };
}
