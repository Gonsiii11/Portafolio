import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import './style.css';

// El código de la escena usa THREE como global (three@0.128.0, fijado en package.json).
window.THREE = THREE;

(function () {
  'use strict';
  var ACCENT = 0xFF5A36, ACCENT_CSS = '#FF5A36', CYAN = 0x5CC8FF, CYAN_CSS = '#5CC8FF';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var app = document.getElementById('app');
  var panel = document.getElementById('panel');
  var pinsEl = document.getElementById('pins');
  var hero = document.getElementById('hero');
  var hint = document.getElementById('hint');
  var state = { section: 'home', mode: 'todo', boot: false };
  var LABELS = { home: 'INICIO', about: 'SOBRE MÍ', projects: 'PROYECTOS', contact: 'CONTACTO' };
  var MODE_LABELS = { todo: 'TODO', auto: 'AUTOMOCIÓN', web: 'SOFTWARE' };
  var REV = { home: 0.26, about: 0.42, projects: 0.5, contact: 0.56 };
  var gl = null;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- page logic (works with or without 3D) ---------- */
  function setMode(m) {
    state.mode = m;
    panel.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.mode === m ? 'true' : 'false'); });
    panel.querySelectorAll('[data-mode-text]').forEach(function (p) { p.hidden = p.dataset.modeText !== m; });
    panel.querySelectorAll('.pcard').forEach(function (c) {
      var ms = c.dataset.modes;
      c.hidden = !(m === 'todo' || !ms || ms.split(' ').indexOf(m) > -1);
    });
    if (gl) gl.setModeVisual(m);
  }

  var extOn = false, extBtn = document.getElementById('extbtn');
  extBtn.addEventListener('click', function () { toggleExt(); });
  function toggleExt(force) {
    var was = extOn;
    setSection('home', { focus: false });
    extOn = (force === undefined) ? !was : force;
    if (gl) gl.setExt(extOn);
    pinsEl.classList.toggle('off', extOn);
    extBtn.textContent = extOn ? 'Volver al asiento' : 'Ver la moto';
    extBtn.setAttribute('aria-current', extOn ? 'true' : 'false');
  }
  function setSection(id, opts) {
    opts = opts || {};
    if (!LABELS[id]) id = 'home';
    state.section = id;
    var open = id !== 'home';
    panel.querySelectorAll('.sec').forEach(function (s) { s.hidden = s.dataset.sec !== id; });
    panel.classList.toggle('open', open);
    panel.toggleAttribute('inert', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.querySelectorAll('#nav .navbtn').forEach(function (b) { b.setAttribute('aria-current', b.dataset.go === id ? 'true' : 'false'); });
    hero.hidden = open;
    hint.hidden = open || !gl;
    document.getElementById('credit').hidden = open;
    extBtn.hidden = !gl;
    pinsEl.classList.toggle('off', open);
    extOn = false; extBtn.textContent = 'Ver la moto';
    if (open) {
      document.getElementById('pbody').scrollTop = 0;
      if (opts.focus !== false) { try { panel.focus({ preventScroll: true }); } catch (e) {} }
    }
    if (gl) gl.setView(id, opts.view);
  }

  /* credits: a short line always on screen; the button opens the full list (closes on Escape, outside click or the button again) */
  var credits = document.getElementById('credits'), credBtns = document.querySelectorAll('.credbtn'), credFrom = null;
  function setCredits(open, from) {
    credits.hidden = !open;
    credBtns.forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    if (open) credFrom = from || null;
    else if (credFrom && credits.contains(document.activeElement)) credFrom.focus();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.credbtn');
    if (b) { setCredits(credits.hidden, b); return; }
    if (!credits.hidden && !credits.contains(e.target)) setCredits(false);
  }, true);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !credits.hidden) { e.stopPropagation(); setCredits(false); if (credFrom) credFrom.focus(); }
  }, true);

  document.addEventListener('click', function (e) {
    var t = e.target;
    var go = t.closest && t.closest('[data-go]');
    if (go) { if (go.dataset.go === 'ext') toggleExt(true); else setSection(go.dataset.go); return; }
    var chip = t.closest && t.closest('.chip');
    if (chip) { setMode(chip.dataset.mode); return; }
    if (t.closest && t.closest('#close')) setSection('home');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.section !== 'home') setSection('home'); });

  /* ---------- dashboard screen drawn on a canvas ---------- */
  function drawDash(ctx, st) {
    var W = 1024, H = 512, i, a, major, r1, r2;
    ctx.fillStyle = '#060A0E'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1C232C'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, W - 20, H - 20);
    var cx = 270, cy = 262, R = 186, a0 = Math.PI * 0.75, sw = Math.PI * 1.5;
    ctx.lineCap = 'butt'; ctx.lineWidth = 8;
    ctx.strokeStyle = '#1C232C'; ctx.beginPath(); ctx.arc(cx, cy, R + 14, a0, a0 + sw); ctx.stroke();
    ctx.strokeStyle = CYAN_CSS; ctx.beginPath(); ctx.arc(cx, cy, R + 14, a0, a0 + sw * st.rev); ctx.stroke();
    ctx.strokeStyle = ACCENT_CSS; ctx.beginPath(); ctx.arc(cx, cy, R + 14, a0 + sw * 0.8, a0 + sw); ctx.stroke();
    for (i = 0; i <= 27; i++) {
      a = a0 + sw * i / 27; major = i % 3 === 0; r1 = R - (major ? 34 : 22); r2 = R - 6;
      ctx.strokeStyle = i >= 22 ? ACCENT_CSS : (major ? '#9AA4B2' : '#3A434F');
      ctx.lineWidth = major ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
    }
    var na = a0 + sw * st.rev;
    ctx.strokeStyle = ACCENT_CSS; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(na) * 26, cy - Math.sin(na) * 26); ctx.lineTo(cx + Math.cos(na) * (R - 46), cy + Math.sin(na) * (R - 46)); ctx.stroke();
    ctx.fillStyle = '#060A0E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ECEEF1'; ctx.font = '700 68px "Space Grotesk", sans-serif'; ctx.fillText('3.º', cx, cy + 118);
    ctx.fillStyle = '#A3ACB8'; ctx.font = '500 20px "JetBrains Mono", monospace'; ctx.fillText('CURSO', cx, cy + 148);

    var x0 = 560;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#A3ACB8'; ctx.font = '500 22px "JetBrains Mono", monospace'; ctx.fillText('IVÁN HERRERA', x0, 78);
    var title = st.boot ? 'ARRANCANDO…' : st.label, size = 64;
    ctx.font = '700 ' + size + 'px "Space Grotesk", sans-serif';
    while (ctx.measureText(title).width > 410 && size > 28) { size -= 2; ctx.font = '700 ' + size + 'px "Space Grotesk", sans-serif'; }
    ctx.fillStyle = '#ECEEF1'; ctx.fillText(title, x0, 160);
    ctx.fillStyle = ACCENT_CSS; ctx.fillRect(x0, 182, 72, 5);
    var rows = [['MODO', MODE_LABELS[st.mode]], ['BASE', 'MADRID'], ['DISP.', '20 H/SEM']];
    ctx.font = '500 22px "JetBrains Mono", monospace';
    rows.forEach(function (r, k) {
      var y = 250 + k * 56;
      ctx.fillStyle = '#A3ACB8'; ctx.fillText(r[0], x0, y);
      ctx.fillStyle = '#ECEEF1'; ctx.fillText(r[1], x0 + 130, y);
      ctx.fillStyle = '#1C232C'; ctx.fillRect(x0, y + 18, 410, 2);
    });
    ctx.fillStyle = CYAN_CSS; ctx.beginPath(); ctx.arc(x0 + 8, 440, 7, 0, Math.PI * 2); ctx.fill();
    ctx.font = '500 24px "JetBrains Mono", monospace'; ctx.fillText('BUSCO PRÁCTICAS', x0 + 28, 448);
  }

  /* ---------- 3D scene: first-person view from the saddle ---------- */
  function initGL() {
    var T = window.THREE;
    if (!T) return null;
    var canvas = document.getElementById('gl'), renderer, i;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    var LOW_GPU = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;  /* refreshed once per frame in frame(), shared by the mirror pass */
    /* everything solid casts and receives the sun's shadow; foliage cuts its shadow by the leaf texture's alpha */
    var depthMats = {};
    function shadowsOn(root) {
      root.traverse(function (o) {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = true;
        var m = o.material;
        if (m && m.alphaTest > 0 && m.map) {
          o.customDepthMaterial = depthMats[m.uuid] = depthMats[m.uuid] || new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: m.map, alphaTest: m.alphaTest, side: T.DoubleSide });
        }
      });
      return root;
    }
    renderer.setClearColor(0x0B0D10, 1);

    /* ---------- loading in phases, so the first view stays light ----------
       1) straight away: the bike (loadBike), the asphalt and a 1k sky (52 KB);
       2) once the bike is on screen: terrain, pines and rocks, textures in small sizes;
       3) when the browser is idle: the large textures swap in.
       TIER 1 (touch screens, data saver, 2g/3g) stops at smaller "large" sizes than TIER 2 (desktop).
       Texture variants are WebP, made by herramientas/variantes_web.py. */
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

    var GROUND = -0.97, HAZE = 0x6a3b3f, HAZE_DAY = 0x8a8170;
    var scene = new T.Scene();
    scene.fog = new T.Fog(HAZE, 30, 260);
    var camera = new T.PerspectiveCamera(55, 1, 0.02, 700);

    function canvasTex(w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
      return t;
    }

    /* sky, sun, mountains */
    var skyTex = canvasTex(8, 512, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#04060d'); g.addColorStop(0.3, '#0f1a35'); g.addColorStop(0.42, '#3b3463');
      g.addColorStop(0.47, '#b0503f'); g.addColorStop(0.497, '#ff8f57'); g.addColorStop(0.5, '#6a3b3f');
      g.addColorStop(0.56, '#1a1216'); g.addColorStop(1, '#0b0d10');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    var sky = new T.Mesh(new T.SphereGeometry(400, 32, 16), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -2; scene.add(sky);

    var sunTex = canvasTex(256, 256, function (x, w, h) {
      var g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,244,205,1)'); g.addColorStop(0.12, 'rgba(255,200,120,0.95)');
      g.addColorStop(0.35, 'rgba(255,128,70,0.45)'); g.addColorStop(1, 'rgba(255,90,54,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    var sun = new T.Sprite(new T.SpriteMaterial({ map: sunTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    sun.position.set(0, GROUND + 9, -280); sun.scale.set(260, 260, 1); scene.add(sun);

    var mtnTex = canvasTex(1024, 128, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#0a0d17'; x.beginPath(); x.moveTo(0, h);
      var y = 70;
      for (var k = 0; k <= w; k += 8) {
        y += (Math.random() - 0.5) * 14; y = Math.max(34, Math.min(104, y));
        x.lineTo(k, y + 14 * Math.sin(k / 90));
      }
      x.lineTo(w, h); x.closePath(); x.fill();
    });
    var mtn = new T.Mesh(new T.CylinderGeometry(300, 300, 36, 64, 1, true), new T.MeshBasicMaterial({ map: mtnTex, transparent: true, side: T.BackSide, fog: false, depthWrite: false }));
    mtn.position.y = GROUND + 14; scene.add(mtn);

    /* real panorama (Poly Haven «Rolling Hills», CC0), pre-rotated so the mountain range lies ahead and the sun sits
       behind on the left (u = 0.85), lighting the landscape from the side; the band above the horizon is stretched ×2.4 so the mountains stand taller
       (master: herramientas/hdr2jpg.py rolling_hills_4k.hdr rolling_hills_4096.png 1.0 4096 0.85 2.4 35, then variantes_web.py).
       Until it loads (or if it fails) the painted sky above stays in place. */
    var pano = null;
    loadTiered('fondo/cielo_1k.webp', TIER > 1 ? 'fondo/cielo_4k.webp' : 'fondo/cielo_2k.webp', true, function (tex) {
      tex.mapping = T.EquirectangularReflectionMapping;
      tex.wrapT = T.ClampToEdgeWrapping;
      if (pano) { pano.material.map = tex; pano.material.needsUpdate = true; return; }  /* the larger sky just swaps in */
      /* drawn on a sphere instead of scene.background so it skips the renderer's ACES tone mapping:
         the image is already tone-mapped, and mapping it twice washed out the mountains.
         scale.x = -1 and the half turn make the sphere's UVs match three.js equirect (u = 0.25 straight ahead) */
      pano = new T.Mesh(new T.SphereGeometry(650, 64, 32), new T.MeshBasicMaterial({ map: tex, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
      pano.scale.x = -1; pano.rotation.y = Math.PI; pano.renderOrder = -2; scene.add(pano);
      scene.remove(sky); scene.remove(mtn); scene.remove(sun);  /* the photo has its own sun */
      scene.fog.color.setHex(HAZE_DAY); scene.fog.near = 60; scene.fog.far = 600;
      ground.material.color.setHex(0xc9c4b4); ground.material.envMapIntensity = 0.3;
      try {  /* reflections come from the small sky: plenty for blurred lighting, and cheap */
        var pmE = new T.PMREMGenerator(renderer);
        scene.environment = pmE.fromEquirectangular(tex).texture;
        pmE.dispose();
      } catch (e) {}
    });

    /* road + ground */
    var ROAD_W = 7, ROAD_LEN = 360, PERIOD = 9;
    var roadTex = canvasTex(256, 512, function (x, w, h) {
      x.fillStyle = '#1b1e23'; x.fillRect(0, 0, w, h);
      for (var k = 0; k < 5000; k++) {
        x.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,' + (Math.random() * 0.06).toFixed(3) + ')' : 'rgba(0,0,0,' + (Math.random() * 0.25).toFixed(3) + ')';
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      x.fillStyle = '#d8d6cf'; x.fillRect(12, 0, 7, h); x.fillRect(w - 19, 0, 7, h);
      x.fillRect(w / 2 - 4, 0, 8, h * (3 / 9));
    });
    roadTex.wrapS = roadTex.wrapT = T.RepeatWrapping;
    roadTex.repeat.set(1, ROAD_LEN / PERIOD);
    roadTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    var road = new T.Mesh(new T.PlaneGeometry(ROAD_W, ROAD_LEN), new T.MeshStandardMaterial({ map: roadTex, roughness: 0.92, metalness: 0 }));
    road.rotation.x = -Math.PI / 2; road.position.set(-1.75, GROUND + 0.002, 10 - ROAD_LEN / 2); road.receiveShadow = true; scene.add(road);

    /* real asphalt: texture from «Street road» by saifurrehman (CC BY 4.0), rotated so the lanes run along v.
       One tile = 28 m of road. Swaps in when loaded; the painted road stays if it fails. */
    loadTex('carretera/asfalto.webp', true, function (tex) {
      PERIOD = 28;
      tex.repeat.set(1, ROAD_LEN / PERIOD);
      tex.offset.y = roadTex.offset.y;
      road.material.map = tex; road.material.needsUpdate = true;
      roadTex.dispose(); roadTex = tex;
    });
    /* fine relief (phase 3): «Clean Asphalt» normal map (Poly Haven, CC0), sampled at its real size (~2.1 m a tile)
       on top of the UVs the colour map scrolls with: 7 m / 2.1 = 3.33 across, 28 m / 2.1 = 13.3 along one tile */
    loadTiered(null, 'carretera/asfalto_normal.webp', false, function (nt) {
      road.material.normalMap = nt; road.material.normalScale.set(0.9, 0.9);
      road.material.onBeforeCompile = function (sh) {
        sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>',
          T.ShaderChunk.normal_fragment_maps.replace(/texture2D\( normalMap, vUv \)/g, 'texture2D( normalMap, vUv * vec2( 3.33, 13.3 ) )'));
      };
      road.material.needsUpdate = true;
    });
    /* terrain: a flat shoulder beside the road, then banks and rolling ground rising to both sides.
       Heights repeat every TER_P metres along z, so the mesh slides with the road and jumps back one period.
       Texture: «Aerial Grass Rock» from Poly Haven (CC0), one tile = 15 m. */
    var TER_P = 60, TER_W = 440, TER_L = 480, TER_SEG = 160, ROAD_CX = -1.75, TER_Z0 = 24 - TER_L / 2;
    function terH(x, z) {
      var d = Math.abs(x - ROAD_CX) - ROAD_W / 2 - 2.5;
      if (d <= 0) return 0;
      var s = Math.min(1, d / 16); s = s * s * (3 - 2 * s);
      var w = Math.PI * 2 / TER_P;
      var n = Math.sin(z * w + x * 0.07) * 1.6 + Math.sin(z * w * 2 - x * 0.19 + 1.3) * 0.7 + Math.sin(z * w * 3 + x * 0.41 + 2.1) * 0.3;
      return s * (d * 0.05 + n * (0.35 + Math.min(1.4, d / 40)));
    }
    var terGeo = new T.PlaneGeometry(TER_W, TER_L, TER_SEG, TER_SEG);
    terGeo.rotateX(-Math.PI / 2);
    (function () {
      var p = terGeo.attributes.position, uv = terGeo.attributes.uv, k, u, x, z;
      for (k = 0; k < p.count; k++) {
        u = p.getX(k) / (TER_W / 2);  /* columns bunch up near the road, spread out far away */
        x = ROAD_CX + (u < 0 ? -1 : 1) * Math.pow(Math.abs(u), 1.8) * TER_W / 2;
        z = p.getZ(k);
        p.setXYZ(k, x, terH(x, z), z);
        uv.setXY(k, x / 15, -z / 15);
      }
      terGeo.computeVertexNormals();
    })();
    var ground = new T.Mesh(terGeo, new T.MeshStandardMaterial({ color: 0x0e1511, roughness: 1, metalness: 0 }));
    ground.position.set(0, GROUND, TER_Z0); ground.receiveShadow = true; scene.add(ground);
    loadTiered('terreno/hierba_512.webp', TIER > 1 ? 'terreno/hierba_2k.webp' : 'terreno/hierba_1k.webp', true, function (tex) {
      ground.material.map = tex; ground.material.needsUpdate = true;
    }, true);
    /* relief (phase 3 only): the texture's own normal map (Poly Haven, CC0) */
    loadTiered(null, TIER > 1 ? 'terreno/hierba_normal_2k.webp' : 'terreno/hierba_normal_1k.webp', false, function (tex) {
      ground.material.normalMap = tex; ground.material.normalScale.set(1.2, 1.2); ground.material.needsUpdate = true;
    });
    /* terrain shading:
       - anti-tiling: the grass colour is mixed with itself at ~6x the scale and an offset, so the 15 m repeat stops showing;
       - shoulder: within ~1.5 m of the asphalt the grass gives way to dusty dirt with stones («Stony Dirt Path», Poly Haven, CC0),
         with a ragged edge driven by the grass texture itself. Terrain x is world x (the mesh only moves along z). */
    var gravelU = { value: new T.DataTexture(new Uint8Array([120, 100, 80, 255]), 1, 1) };
    loadTiered('terreno/grava_512.webp', TIER > 1 ? 'terreno/grava_1k.webp' : null, true, function (tex) { gravelU.value = tex; }, true);
    ground.material.onBeforeCompile = function (sh) {
      sh.uniforms.uGravel = gravelU;
      sh.vertexShader = 'varying float vTerX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vTerX = position.x;');
      sh.fragmentShader = 'uniform sampler2D uGravel;\nvarying float vTerX;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
        '#ifdef USE_MAP',
        '  vec4 texelColor = mix( texture2D( map, vUv ), texture2D( map, vUv * 0.163 + vec2( 0.31, 0.57 ) ), 0.45 );',
        '  texelColor = mapTexelToLinear( texelColor );',
        '  float dEdge = abs( vTerX - ( ' + ROAD_CX.toFixed(2) + ' ) ) - ' + (ROAD_W / 2).toFixed(2) + ';',
        '  float rag = ( dot( texelColor.rgb, vec3( 0.6 ) ) - 0.25 ) * 2.2 + sin( vUv.y * 40.0 + vUv.x * 7.0 ) * 0.18 + sin( vUv.y * 9.0 + 1.3 ) * 0.3;',
        '  float wGrav = 1.0 - smoothstep( 0.35, 1.25, dEdge + rag );',
        '  vec4 grav = sRGBToLinear( texture2D( uGravel, vUv * 6.9 ) );',
        '  grav.rgb = mix( vec3( dot( grav.rgb, vec3( 0.3, 0.59, 0.11 ) ) ), grav.rgb, 0.4 ) * vec3( 1.75, 1.62, 1.45 );  /* dusty: less red, lighter */',
        '  texelColor = mix( texelColor, grav, wGrav );',
        '  diffuseColor *= texelColor;',
        '#endif'
      ].join('\n'));
    };
    function groundY(x, zWorld) { return GROUND + terH(x, zWorld - ground.position.z); }

    /* grass tufts: my own geometry (no third-party asset). One tuft = 28 thin curved blades, dark olive at the root to straw at
       the tip, all normals pointing up so a tuft is lit like the ground under it. Thousands of copies in one InstancedMesh,
       parented to the terrain so they slide and wrap with it: the layout repeats every TER_P metres, like the terrain. */
    var grassTime = { value: 0 };
    (function () {
      var BL = 28, pos = [], col = [], nor = [], idx = [], k, j, vi = 0;
      var cRoot = new T.Color(0.1, 0.085, 0.035), cMid = new T.Color(0.34, 0.28, 0.12), cTip = new T.Color(0.72, 0.6, 0.33), cGreen = new T.Color(0.2, 0.22, 0.08), c = new T.Color();
      for (k = 0; k < BL; k++) {
        var a = Math.random() * Math.PI * 2, r = Math.random() * 0.1, bx = Math.cos(a) * r, bz = Math.sin(a) * r;
        var h = 0.1 + Math.random() * Math.random() * 0.38, w = 0.004 + Math.random() * 0.004, face = Math.random() * Math.PI;
        var lean = 0.25 + Math.random() * 0.45, lx = Math.cos(a) * lean * h, lz = Math.sin(a) * lean * h;  /* blades lean outward */
        var px = Math.cos(face) * w, pz = Math.sin(face) * w, green = Math.random() < 0.18;
        var rows = [[0, 1], [0.55, 0.7], [1, 0]];  /* height fraction, width fraction */
        for (j = 0; j < 3; j++) {
          var t = rows[j][0], ww = rows[j][1], y = t * h, ox = bx + lx * t * t, oz = bz + lz * t * t;
          pos.push(ox - px * ww, y, oz - pz * ww, ox + px * ww, y, oz + pz * ww);
          c.copy(t < 0.5 ? cRoot : cMid).lerp(t < 0.5 ? cMid : cTip, t < 0.5 ? t * 2 : (t - 0.5) * 2);
          if (green) c.lerp(cGreen, 0.55);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
          nor.push(0, 1, 0, 0, 1, 0);
        }
        idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2, vi + 2, vi + 3, vi + 4);
        vi += 6;
      }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      var mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: T.DoubleSide, envMapIntensity: 0.35 });
      /* wind: tips sway, roots stay put; the phase follows the tuft's place so gusts roll across the field */
      mat.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = grassTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          '  vec4 gp = instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
          '  float bend = transformed.y * transformed.y * 2.2;',
          '  float gust = sin( uTime * 1.6 + gp.x * 0.31 + gp.z * 0.17 ) + 0.5 * sin( uTime * 3.1 + gp.z * 0.53 );',
          '  transformed.x += gust * 0.045 * bend;',
          '  transformed.z += gust * 0.025 * bend;'
        ].join('\n'));
      };
      /* placement inside one TER_P block, then copied to fill local z 0..240 (the stretch that can be on screen) */
      var perBlock = LOW_GPU ? 1400 : 5200, blocks = 4, n = perBlock * blocks;
      var UP3 = new T.Vector3(0, 1, 0), im = new T.InstancedMesh(g, mat, n), m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), p3 = new T.Vector3(), b, n0 = 0;
      var spots = [];
      for (k = 0; k < perBlock; k++) {
        var side = Math.random() < 0.5 ? -1 : 1, rr = Math.random();
        var d = ROAD_W / 2 + 1.1 + 34 * rr * rr * rr;  /* dense along the verge, thinning out up the slope */
        spots.push([ROAD_CX + side * d, Math.random() * TER_P, Math.random() * Math.PI * 2, 0.6 + Math.random() * 0.7]);
      }
      for (b = 0; b < blocks; b++) {
        for (k = 0; k < perBlock; k++) {
          var sp = spots[k], lz = sp[1] + b * TER_P;
          q.setFromAxisAngle(UP3, sp[2]); sc.set(sp[3], sp[3] * (0.85 + (k % 7) * 0.05), sp[3]);
          p3.set(sp[0], terH(sp[0], lz) - 0.02, lz);
          im.setMatrixAt(n0++, m4.compose(p3, q, sc));
        }
      }
      im.frustumCulled = false;  /* r128 culls instanced meshes by the single tuft's bounds */
      im.receiveShadow = true;
      ground.add(im);
    })();

    /* mountain-road furniture that slides past: guardrail («bionda») on some stretches, delineator posts («hitos de arista») elsewhere.
       All built here, no third-party models. Everything wraps every SPAN metres; x > 0 side is the right-hand side. */
    var props = [], SPAN = 336, EDGE_R = ROAD_CX + ROAD_W / 2, EDGE_L = ROAD_CX - ROAD_W / 2;
    function edgeX(side, off) { return side > 0 ? EDGE_R + off : EDGE_L - off; }
    /* guardrail: [side, rear z, length]. Built from its rear end toward +z so it only wraps once fully behind the rider */
    var RAILS = [[1, -150, 72], [1, -310, 48], [-1, -66, 60], [-1, -250, 36]];
    var steelMat = new T.MeshStandardMaterial({ color: 0x7c838a, metalness: 0.85, roughness: 0.5, envMapIntensity: 0.55, side: T.DoubleSide });
    var postMat = new T.MeshStandardMaterial({ color: 0x50555a, metalness: 0.7, roughness: 0.6, envMapIntensity: 0.4 });
    var wShape = (function () {  /* W-beam cross-section: x = toward the road, y = up (metres) */
      var c = [[0, -0.155], [0.07, -0.11], [0.07, -0.04], [0.02, 0], [0.07, 0.04], [0.07, 0.11], [0, 0.155]], s = new T.Shape(), k;
      s.moveTo(c[0][0], c[0][1]);
      for (k = 1; k < c.length; k++) s.lineTo(c[k][0], c[k][1]);
      for (k = c.length - 1; k >= 0; k--) s.lineTo(c[k][0] - 0.012, c[k][1]);
      return s;
    })();
    var railPostGeo = new T.BoxGeometry(0.05, 0.75, 0.1), spacerGeo = new T.BoxGeometry(0.12, 0.2, 0.08);
    RAILS.forEach(function (r) {
      var g = new T.Group(), len = r[2];
      var rail = new T.Mesh(new T.ExtrudeGeometry(wShape, { depth: len, bevelEnabled: false }), steelMat);
      rail.position.set(0, GROUND + 0.6, 0); g.add(rail);
      for (var z = 1; z < len; z += 4) {
        var p = new T.Mesh(railPostGeo, postMat); p.position.set(-0.2, GROUND + 0.375, z); g.add(p);
        var sp = new T.Mesh(spacerGeo, postMat); sp.position.set(-0.08, GROUND + 0.6, z); g.add(sp);
      }
      g.position.set(edgeX(r[0], 0.9), 0, r[1]);
      if (r[0] > 0) g.scale.x = -1;  /* local +x must point at the road */
      shadowsOn(g); scene.add(g); props.push({ obj: g, zMax: 8, span: SPAN });
    });
    /* delineator posts: white, black band, a reflector facing the rider; every 24 m where there is no guardrail */
    var hitoGeo = new T.BoxGeometry(0.1, 1.05, 0.12), bandGeo = new T.BoxGeometry(0.104, 0.24, 0.124), reflGeo = new T.PlaneGeometry(0.05, 0.14);
    var hitoMat = new T.MeshStandardMaterial({ color: 0xe9e7e1, roughness: 0.6 }), bandMat = new T.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.85, envMapIntensity: 0.15 });
    var reflMat = new T.MeshBasicMaterial({ color: 0xfff2d8 });
    function underRail(side, z) {
      return RAILS.some(function (r) { return r[0] === side && z > r[1] - 3 && z < r[1] + r[2] + 3; });
    }
    [1, -1].forEach(function (side) {
      for (var z = side > 0 ? 4 : -8; z > 8 - SPAN; z -= 24) {
        if (underRail(side, z)) continue;
        var g = new T.Group();
        var post = new T.Mesh(hitoGeo, hitoMat); post.position.y = GROUND + 0.525; g.add(post);
        var band = new T.Mesh(bandGeo, bandMat); band.position.y = GROUND + 0.84; g.add(band);
        var refl = new T.Mesh(reflGeo, reflMat); refl.position.set(0, GROUND + 0.84, 0.063); g.add(refl);
        g.position.set(edgeX(side, 0.8), 0, z);
        shadowsOn(g); scene.add(g); props.push({ obj: g, zMax: 8, span: SPAN });
      }
    });
    var treeGeo = new T.ConeGeometry(1.5, 5.5, 7), treeMat = new T.MeshBasicMaterial({ color: 0x0b1210 }), treeProps = [];
    for (i = 0; i < 52; i++) {
      var tr = new T.Mesh(treeGeo, treeMat), sc = 0.7 + Math.random() * 1.1, sd0 = i % 2 ? 1 : -1;
      tr.scale.set(sc, sc, sc);
      tr.position.set(sd0 * (6 + Math.random() * 40) + (sd0 > 0 ? 0 : -3), GROUND + 2.75 * sc, 8 - Math.random() * 340);
      scene.add(tr); props.push({ obj: tr, zMax: 8, span: 348, lift: 2.75 * sc }); treeProps.push(props[props.length - 1]);
      tr.position.y = groundY(tr.position.x, tr.position.z) + 2.75 * sc;
    }

    /* Scots pines («Scots Pine Trees Set» by Maksim Batyrev, CC BY 4.0). The set has 9 trees laid out on a grid;
       each one is baked to its own geometry (one per material), stood on y = 0 and scaled to 1 m tall,
       then every placeholder cone is swapped for a random pine. If loading fails, the cones stay. */
    afterBike.then(function () { new GLTFLoader().load('pinos/scene.gltf', function (gltf) {  /* phase 2 */
      gltf.scene.updateMatrixWorld(true);
      var parts = {}, mats = {};
      gltf.scene.traverse(function (o) {
        if (!o.isMesh || /Box001/.test(o.name)) return;
        var id = (o.name.match(/^(\d+)_/) || [])[1];
        if (!id) return;
        var m = o.material;
        if (!mats[m.name]) {
          if (m.map && m.transparent) { m.transparent = false; m.alphaTest = 0.2; m.alphaToCoverage = true; m.depthWrite = true; }
          m.side = T.DoubleSide; m.envMapIntensity = 0.35; m.needsUpdate = true; mats[m.name] = m;
        }
        var g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
        parts[id] = parts[id] || {};
        (parts[id][m.name] = parts[id][m.name] || []).push(g);
      });
      var types = Object.keys(parts).map(function (id) {
        var list = [], box = new T.Box3();
        Object.keys(parts[id]).forEach(function (mn) {
          var geos = parts[id][mn], merged = geos.length > 1 ? BufferGeometryUtils.mergeBufferGeometries(geos) : geos[0];
          if (merged) list.push([merged, mats[mn]]); else geos.forEach(function (g) { list.push([g, mats[mn]]); });
        });
        list.forEach(function (p) { p[0].computeBoundingBox(); box.union(p[0].boundingBox); });
        var c = box.getCenter(new T.Vector3()), s = 1 / (box.max.y - box.min.y);
        var mtx = new T.Matrix4().makeScale(s, s, s).multiply(new T.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
        list.forEach(function (p) { p[0].applyMatrix4(mtx); p[0].computeBoundingSphere(); });
        return list;
      });
      if (!types.length) return;
      treeProps.forEach(function (pr) {
        var t = types[Math.floor(Math.random() * types.length)], g = new T.Group();
        t.forEach(function (p) {
          g.add(new T.Mesh(p[0], p[1]));
          if (p[1].alphaTest > 0) {  /* foliage: a second copy, turned and a touch wider, fills out the sparse crown */
            var f = new T.Mesh(p[0], p[1]); f.rotation.y = 1.2 + Math.random() * 0.6; f.scale.set(1.12, 0.94, 1.12); g.add(f);
          }
        });
        g.scale.setScalar(6 + Math.random() * 4);
        g.rotation.y = Math.random() * Math.PI * 2;
        g.position.set(pr.obj.position.x, groundY(pr.obj.position.x, pr.obj.position.z) - 0.15, pr.obj.position.z);
        scene.remove(pr.obj); shadowsOn(g); scene.add(g); pr.obj = g; pr.lift = -0.15;
      });
    }); });

    /* granite boulders («Namaqualand Boulder 04/05», Poly Haven, CC0), simplified with herramientas/reducir_rocas.sh.
       Scattered past the shoulder, half sunk into the ground, sliding past like the pines. */
    (function () {
      var files = ['rocas/granito_a.glb', 'rocas/granito_b.glb'], kinds = [], left = files.length;
      afterBike.then(function () { files.forEach(function (f, n) {  /* phase 2 */
        new GLTFLoader().load(f, function (gltf) {
          gltf.scene.traverse(function (o) {
            if (o.isMesh && !kinds[n]) { o.material.envMapIntensity = 0.4; o.material.color.setHex(0xa8a196); kinds[n] = { geo: o.geometry, mat: o.material }; }
          });
          if (--left === 0) place();
        }, undefined, function () { if (--left === 0) place(); });
      }); });
      function place() {
        kinds = kinds.filter(Boolean);
        if (!kinds.length) return;
        /* small clusters, like a granite «berrocal»: one big boulder with a few smaller ones around it */
        for (var c = 0; c < 30; c++) {
          var sd = c % 2 ? 1 : -1, near = c % 3 === 0;
          var cx = ROAD_CX + sd * (ROAD_W / 2 + (near ? 7 + Math.random() * 6 : 14 + Math.random() * 50));
          var cz = 8 - Math.random() * 348, count = 1 + Math.floor(Math.random() * 4);
          for (var r = 0; r < count; r++) {
            var kd = kinds[Math.floor(Math.random() * kinds.length)];
            var sc = (r === 0 ? 0.8 + Math.random() * 0.9 : 0.3 + Math.random() * 0.45) * (near ? 0.7 : 1.2) * (kd === kinds[1] ? 1.8 : 1);
            var m = new T.Mesh(kd.geo, kd.mat);
            m.scale.set(sc, sc * (0.8 + Math.random() * 0.4), sc);
            m.rotation.y = Math.random() * Math.PI * 2;
            m.position.set(cx + (r ? (Math.random() - 0.5) * 6 : 0), 0, cz + (r ? (Math.random() - 0.5) * 6 : 0));
            if (Math.abs(m.position.x - ROAD_CX) < ROAD_W / 2 + 5) m.position.x = ROAD_CX + sd * (ROAD_W / 2 + 5);
            m.position.y = groundY(m.position.x, m.position.z) - 0.12 * sc;
            shadowsOn(m); scene.add(m); props.push({ obj: m, zMax: 8, span: 348, lift: -0.12 * sc });
          }
        }
      }
    })();

    /* reflections: the sunset sky, so paint and metal pick up warm light */
    try {
      var pm = new T.PMREMGenerator(renderer);
      var envScene = new T.Scene();
      envScene.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide })));
      var strip = function (w, h, p, r, g, b) {
        var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ side: T.DoubleSide }));
        m.material.color.setRGB(r, g, b); m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); envScene.add(m);
      };
      strip(18, 4, [0, 3, -40], 9, 4.6, 2.4);
      strip(30, 8, [0, 40, 0], 1.2, 1.5, 2.4);
      strip(8, 14, [-30, 6, 20], 0.9, 1.1, 1.8);
      strip(8, 14, [30, 6, 20], 0.9, 1.1, 1.8);
      scene.environment = pm.fromScene(envScene, 0.02).texture;
      pm.dispose();
    } catch (e) {}

    scene.add(new T.HemisphereLight(0x9db4e0, 0x4a4030, 0.38));  /* sky light: soft and bluish, fills the shadows */
    /* the sun, from the photo's sun (behind on the left, low). Its shadow box (70 m square) is re-centred on the
       rider every frame, a little ahead, so near objects always get crisp shadows. */
    var SUN_DIR = new T.Vector3(-12, 8, 16).normalize();
    var sunLight = new T.DirectionalLight(0xffb37e, 3.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(LOW_GPU ? 1024 : 4096, LOW_GPU ? 1024 : 4096);
    var sc0 = sunLight.shadow.camera; sc0.left = -35; sc0.right = 35; sc0.top = 35; sc0.bottom = -35; sc0.near = 1; sc0.far = 160;
    sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.03; sunLight.shadow.radius = 3;
    scene.add(sunLight); scene.add(sunLight.target);
    var fill = new T.DirectionalLight(0xa8bcff, 0.22); fill.position.set(1.5, 6, 6); scene.add(fill);
    var dashLight = new T.PointLight(CYAN, 0.5, 0.9); dashLight.position.set(0, GROUND + 1.05, -0.35); scene.add(dashLight);

    var M = {
      alu: new T.MeshStandardMaterial({ color: 0xaab3bf, metalness: 1, roughness: 0.32, envMapIntensity: 1.2 }),
      black: new T.MeshStandardMaterial({ color: 0x14171c, metalness: 0.85, roughness: 0.42, envMapIntensity: 1.1 }),
      plastic: new T.MeshStandardMaterial({ color: 0x101318, metalness: 0.1, roughness: 0.55 }),
      rubber: new T.MeshStandardMaterial({ color: 0x0c0e11, metalness: 0, roughness: 0.95 }),
      line: new T.MeshStandardMaterial({ color: 0x20242a, metalness: 0.8, roughness: 0.5 }),
      accent: new T.MeshStandardMaterial({ color: ACCENT, metalness: 0.3, roughness: 0.4 }),
      glass: new T.MeshPhysicalMaterial({ color: 0x7f93a8, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.2, envMapIntensity: 1.6, side: T.DoubleSide, depthWrite: false })
    };
    function btnMat(hex) { return new T.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.3, metalness: 0.2, roughness: 0.4 }); }

    var UPV = new T.Vector3(0, 1, 0);
    function cylBetween(a, b, r, mat, seg) {
      var A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]);
      var dir = B.clone().sub(A), len = dir.length();
      var m = new T.Mesh(new T.CylinderGeometry(r, r, len, seg || 14), mat);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(UPV, dir.normalize());
      return m;
    }
    function roundedRect(w, h, r) {
      var s = new T.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    function roundBox(w, d, h, r, bev) {
      bev = bev || 0.003;
      var depth = h - 2 * bev;
      var g = new T.ExtrudeGeometry(roundedRect(w - 2 * bev, d - 2 * bev, Math.max(0.001, r - bev)), { depth: depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 8 });
      g.translate(0, 0, -depth / 2); g.rotateX(-Math.PI / 2);
      return g;
    }
    function tubeAlong(pts, r, mat, seg) {
      var curve = new T.CatmullRomCurve3(pts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); }));
      return new T.Mesh(new T.TubeGeometry(curve, seg || 40, r, 8, false), mat);
    }

    /* (hot spots are defined with the bike below) */
    function mark(mesh, section, extra) {
      var u = mesh.userData; u.section = section;
      for (var k in extra) u[k] = extra[k];
      hot.push(mesh);
      if (u.noGlow) return mesh;
      mesh.material = mesh.material.clone();
      var em = mesh.material.emissive;
      if (em.r + em.g + em.b === 0) { em.setHex(ACCENT); u.baseE = 0; } else { u.baseE = mesh.material.emissiveIntensity; }
      mesh.material.emissiveIntensity = u.baseE;
      if (!u.hoverAmp) u.hoverAmp = 0.2;
      (groups[u.gid] = groups[u.gid] || { meshes: [], h: 0, t: 0 }).meshes.push(mesh);
      if (u.pressable) { u.press = 0; pressables.push(mesh); }
      return mesh;
    }

    /* ---------- the bike: BMW S1000RR 2019 (VTX, CC BY-NC-SA 4.0), baked to a light binary. Model space: front = -z, wheels touch y = -0.482 ---------- */
    var BY = GROUND + 0.482;
    function W3(p) { return [p[0], p[1] + BY, p[2]]; }
    var rig = new T.Group(); scene.add(rig);
    var bike = new T.Group(); bike.position.y = BY; rig.add(bike);
    var texCache = {};
    var bikeMgr = new T.LoadingManager(function () { bikeShown(); });  /* phase 2 starts when the bike's textures are in too */
    function bikeTex(f) {
      if (!f) return null;
      if (texCache[f]) return texCache[f];
      var t = new T.TextureLoader(bikeMgr).load('bike/tx/' + f);
      t.encoding = T.sRGBEncoding; t.flipY = false; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
      return (texCache[f] = t);
    }
    function bikeMat(d) {
      var o = {
        color: new T.Color(d.color[0], d.color[1], d.color[2]), map: bikeTex(d.map), metalness: d.metal, roughness: d.rough,
        side: T.DoubleSide, envMapIntensity: 1.1
      };
      if (d.emap) { o.emissive = new T.Color(1, 1, 1); o.emissiveMap = bikeTex(d.emap); o.emissiveIntensity = 1.4; }
      else if (d.emissive[0] + d.emissive[1] + d.emissive[2] > 0) o.emissive = new T.Color(d.emissive[0], d.emissive[1], d.emissive[2]);
      if (d.blend) { o.transparent = true; o.opacity = d.color[3]; o.depthWrite = false; }
      var m = d.cc > 0 ? new T.MeshPhysicalMaterial(o) : new T.MeshStandardMaterial(o);
      if (d.cc > 0) { m.clearcoat = d.cc; m.clearcoatRoughness = 0.12; }
      return m;
    }
    /* rear-view mirrors: a camera on the bike looks backwards and renders into a small texture shown on both mirror
       glasses (one primitive in the model). Each glass gets its own side of that picture, flipped like a real mirror:
       the rear camera's right half is the rider's left, so the left glass maps to u 0.95 → 0.6 from its outer edge in. */
    var MIRROR_PRIM = 'Object_79', mirrorMesh = null, mirrorTick = 0;
    var mirrorEvery = LOW_GPU ? 2 : 1;  /* phones: every other frame */
    var mirrorRT = new T.WebGLRenderTarget(512, 256);
    mirrorRT.texture.encoding = T.sRGBEncoding;
    var mirrorMat = new T.MeshBasicMaterial({ map: mirrorRT.texture, color: 0xd5dbe2, toneMapped: false });
    var rearCam = new T.PerspectiveCamera(46, 2, 0.05, 700);
    rearCam.position.set(0, 0.66, -0.4); rearCam.rotation.set(-0.05, Math.PI, 0, 'YXZ'); bike.add(rearCam);
    function mirrorUVs(geo) {
      var pos = geo.attributes.position, uv = geo.attributes.uv, k, b = { '-1': [9, -9, 9, -9], '1': [9, -9, 9, -9] };
      for (k = 0; k < pos.count; k++) {  /* per side: |x| and y ranges */
        var s = pos.getX(k) < 0 ? '-1' : '1', ax = Math.abs(pos.getX(k)), y = pos.getY(k);
        b[s][0] = Math.min(b[s][0], ax); b[s][1] = Math.max(b[s][1], ax); b[s][2] = Math.min(b[s][2], y); b[s][3] = Math.max(b[s][3], y);
      }
      for (k = 0; k < pos.count; k++) {
        var sd = pos.getX(k) < 0 ? '-1' : '1', r = b[sd];
        var t = (r[1] - Math.abs(pos.getX(k))) / Math.max(1e-4, r[1] - r[0]);   /* 0 at the outer edge, 1 at the inner edge */
        var u = sd === '-1' ? 0.95 - 0.35 * t : 0.05 + 0.35 * t;
        uv.setXY(k, u, 0.25 + 0.5 * (pos.getY(k) - r[2]) / Math.max(1e-4, r[3] - r[2]));
      }
      uv.needsUpdate = true;
    }
    function buildBike(meta, buf) {
      var mats = meta.materials.map(bikeMat);
      /* bike.bin is meshopt-compressed (herramientas/comprimir_moto.mjs): positions u16×4 (4th unused), normals i8×4,
         UVs u16×2, indices u16. Each block is decoded into a plain typed array, then dequantised as before. */
      function dec(off, len, count, size, isIndex) {
        var out = new Uint8Array(count * size), src = new Uint8Array(buf, off, len);
        if (isIndex) MeshoptDecoder.decodeIndexBuffer(out, count, size, src); else MeshoptDecoder.decodeVertexBuffer(out, count, size, src);
        return out.buffer;
      }
      meta.prims.forEach(function (p) {
        var n = p.cnt;
        var q = new Uint16Array(dec(p.po, p.pl, n, 8)), nr = new Int8Array(dec(p.no, p.nl, n, 4)), uq = new Uint16Array(dec(p.uo, p.ul, n, 4));
        var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), k;
        for (k = 0; k < n; k++) {
          pos[k * 3] = p.mn[0] + q[k * 4] / 65535 * p.rg[0]; pos[k * 3 + 1] = p.mn[1] + q[k * 4 + 1] / 65535 * p.rg[1]; pos[k * 3 + 2] = p.mn[2] + q[k * 4 + 2] / 65535 * p.rg[2];
          nor[k * 3] = nr[k * 4] / 127; nor[k * 3 + 1] = nr[k * 4 + 1] / 127; nor[k * 3 + 2] = nr[k * 4 + 2] / 127;
          uv[k * 2] = p.umn[0] + uq[k * 2] / 65535 * p.urg[0]; uv[k * 2 + 1] = p.umn[1] + uq[k * 2 + 1] / 65535 * p.urg[1];
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
        geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
        geo.setIndex(new T.BufferAttribute(new Uint16Array(dec(p.io, p.il, p.ic, 2, true)), 1));
        var mesh = new T.Mesh(geo, mats[p.m]);
        if (mesh.material.transparent) mesh.renderOrder = 2;
        if (p.n === MIRROR_PRIM) { mirrorUVs(geo); mesh.material = mirrorMat; mirrorMesh = mesh; }
        if (!mesh.material.transparent) shadowsOn(mesh);
        bike.add(mesh);
      });
    }
    var bikeReady = false;
    function loadBike() {
      var meta;
      fetch('bike/bike.json').then(function (r) { return r.json(); }).then(function (j) {
        meta = j; return Promise.all([fetch('bike/bike.bin').then(function (r) { return r.arrayBuffer(); }), MeshoptDecoder.ready]);
      }).then(function (res) {
        var buf = res[0];
        buildBike(meta, buf); bikeReady = true;
        var ld = document.getElementById('loading'); if (ld) ld.hidden = true;
      }).catch(function () { bikeShown(); var ld = document.getElementById('loading'); if (ld) ld.textContent = 'No se pudo cargar el modelo de la moto.'; });
    }
    loadBike();

    /* TFT screen: my own canvas laid over the model's dash (centre, axes and size measured from the model) */
    var dashCanvas = document.createElement('canvas'); dashCanvas.width = 1024; dashCanvas.height = 512;
    var dctx = dashCanvas.getContext('2d');
    var dashTex = new T.CanvasTexture(dashCanvas); dashTex.encoding = T.sRGBEncoding; dashTex.anisotropy = 4;
    var screen = new T.Mesh(new T.PlaneGeometry(0.15, 0.075), new T.MeshBasicMaterial({ map: dashTex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    screen.renderOrder = 3;
    screen.matrix.makeBasis(new T.Vector3(0.99900, -0.02700, 0.01800), new T.Vector3(0.03246, 0.82588, -0.56292), new T.Vector3(0.00000, 0.56321, 0.82631)).setPosition(0.00950, 0.41910, -0.54849);
    screen.matrixAutoUpdate = false; bike.add(screen);
    var dash = { rev: REV.home, revT: REV.home, label: LABELS.home, dirty: true };

    /* invisible hot spots over the real controls; they glow on hover */
    var hot = [], groups = {}, pressables = [];
    function hotspot(p, r, section, extra) {
      var m = new T.Mesh(new T.SphereGeometry(r, 16, 12), new T.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
      var w = W3(p); m.position.set(w[0], w[1], w[2]); m.renderOrder = 20; rig.add(m);
      var u = m.userData; u.section = section; u.baseE = 0; u.hoverAmp = 0.32;
      for (var k in extra) u[k] = extra[k];
      hot.push(m);
      (groups[u.gid] = groups[u.gid] || { meshes: [], h: 0, t: 0 }).meshes.push(m);
      return m;
    }
    hotspot([0.003, 0.415, -0.551], 0.07, 'about', { gid: 'about' });
    hotspot([-0.265, 0.5, -0.48], 0.07, 'projects', { gid: 'projects-body' });
    hotspot([0.265, 0.5, -0.48], 0.07, 'contact', { gid: 'start', isStart: true });
    hotspot([0, 0.46, -0.1], 0.12, 'home', { gid: 'tank', isExt: true });
    var modeBtns = {};

    scene.updateMatrixWorld(true);

    /* camera views. home = rider's eyes; the others lean in. t = look-at point, w/h = world size to fit, d = view direction */
    var VIEWS = {
      home: { fp: true, eye: W3([0, 0.92, 0.22]), tgt: W3([0, 0.52, -0.8]), eyeP: W3([0, 1.05, 0.5]), tgtP: W3([0, 0.45, -0.7]) },
      about: { t: W3([0.003, 0.415, -0.551]), w: 0.2, h: 0.11, d: [0.005, 0.568, 0.823] },
      projects: { t: W3([-0.24, 0.5, -0.47]), w: 0.28, h: 0.18, d: [-0.15, 0.75, 0.65] },
      contact: { t: W3([0.24, 0.5, -0.47]), w: 0.28, h: 0.18, d: [0.15, 0.75, 0.65] },
      ext: { t: W3([0, 0.32, 0.01]), w: 2.5, h: 1.3, d: [0.55, 0.3, 0.8] },
      tank: { t: W3([0, 0.44, -0.12]), w: 0.6, h: 0.45, d: [0, 0.8, 0.6] }
    };
    var PIN_POS = { about: W3([0.003, 0.54, -0.55]), projects: W3([-0.265, 0.57, -0.48]), contact: W3([0.265, 0.57, -0.48]), ext: W3([0, 0.5, -0.1]) };
    var pinEls = Array.prototype.slice.call(document.querySelectorAll('.pin'));

    var size = { w: 1, h: 1 }, cur = 'home', portraitMix = 0;
    var yaw = 0, pitch = 0, yawT = 0, pitchT = 0, lastInteract = 0, ext = false, spinT = 0;
    var offX = 0, offY = 0, first = true, speed = 0, speedT = 16;
    var camTgt = new T.Vector3(), camPos = new T.Vector3(), desTgt = new T.Vector3(), desPos = new T.Vector3();
    var eye = new T.Vector3(), tg = new T.Vector3(), fwd = new T.Vector3(), rightV = new T.Vector3(), O = new T.Vector3(), V = new T.Vector3();
    var X_AXIS = new T.Vector3(1, 0, 0), Y_AXIS = new T.Vector3(0, 1, 0);

    function region(W, H) {
      var open = cur !== 'home' && cur !== 'ext';
      if (W >= 900) {
        if (!open) return { l: 380, t: 70, r: W - 16, b: H - 24 };
        var pw = Math.min(440, W * 0.42) + 32;
        return { l: 16, t: 84, r: W - pw, b: H - 16 };
      }
      if (!open) return { l: 0, t: Math.min(250, H * 0.34), r: W, b: H - 56 };
      return { l: 0, t: 110, r: W, b: H - Math.min(H * 0.52, 460) };
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

    /* pointer: drag to look around, tap or click to press a control */
    var ray = new T.Raycaster(), ndc = new T.Vector2(), drag = null, hoverMesh = null;
    function pick(cx, cy) {
      if (ext) return null;
      var r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var hits = ray.intersectObjects(hot, false);
      return hits.length ? hits[0].object : null;
    }
    function setHover(mesh) {
      if (mesh === hoverMesh) return;
      hoverMesh = mesh;
      var gid = mesh ? mesh.userData.gid : null;
      for (var id in groups) groups[id].t = (id === gid) ? 1 : 0;
      canvas.style.cursor = drag ? 'grabbing' : (mesh ? 'pointer' : 'grab');
    }
    function activate(mesh) {
      if (!mesh) return;
      var u = mesh.userData;
      if (u.pressable) u.press = 1;
      if (u.mode) setMode(u.mode);
      if (u.isExt) { toggleExt(true); return; }
      if (u.isStart) {
        state.boot = true; dash.revT = 0.98; dash.dirty = true;
        setTimeout(function () { state.boot = false; setSection('contact'); }, reduce ? 0 : 650);
        return;
      }
      setSection(u.section, { view: u.view });
    }
    canvas.addEventListener('pointerdown', function (e) {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (drag && drag.id === e.pointerId) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
        if (drag.moved && ext) {
          spinT += dx * 0.01; pitchT = clamp(pitchT + dy * 0.003, -0.25, 0.35);
          drag.x = e.clientX; drag.y = e.clientY; lastInteract = performance.now();
        } else if (drag.moved) {
          yawT = clamp(yawT + dx * 0.006, -1.2, 1.2);
          pitchT = clamp(pitchT + dy * 0.004, -0.45, 0.45);
          drag.x = e.clientX; drag.y = e.clientY; lastInteract = performance.now();
        }
      } else if (e.pointerType === 'mouse') {
        setHover(pick(e.clientX, e.clientY));
      }
    });
    function endDrag(e, cancelled) {
      if (!drag || drag.id !== e.pointerId) return;
      var moved = drag.moved; drag = null;
      canvas.style.cursor = hoverMesh ? 'pointer' : 'grab';
      if (!moved && !cancelled) activate(pick(e.clientX, e.clientY));
    }
    canvas.addEventListener('pointerup', function (e) { endDrag(e, false); });
    canvas.addEventListener('pointercancel', function (e) { endDrag(e, true); });
    canvas.addEventListener('pointerleave', function () { if (!drag) setHover(null); });

    /* arrow keys and on-screen pad turn the view; Home / the centre button recentres */
    function nudge(dy, dp) { if (ext) { spinT += dy * 1.5; pitchT = clamp(pitchT + dp, -0.25, 0.35); lastInteract = performance.now(); return; } yawT = clamp(yawT + dy, -1.2, 1.2); pitchT = clamp(pitchT + dp, -0.45, 0.45); lastInteract = performance.now(); }
    window.addEventListener('keydown', function (e) {
      var tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key, hit = true;
      if (k === 'ArrowLeft') nudge(0.1, 0); else if (k === 'ArrowRight') nudge(-0.1, 0);
      else if (k === 'ArrowUp') nudge(0, 0.06); else if (k === 'ArrowDown') nudge(0, -0.06);
      else if (k === 'Home') { yawT = 0; pitchT = 0; if (ext) spinT = -0.5; } else hit = false;
      if (hit) e.preventDefault();
    });

    /* frame loop */
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var k = reduce ? 1 : 1 - Math.exp(-dt * 4.5), k2 = reduce ? 1 : 1 - Math.exp(-dt * 10);

      /* the road and the scenery slide toward the rider */
      var spT = reduce ? 0 : (state.boot ? 40 : (ext ? 0 : speedT));
      speed += (spT - speed) * (1 - Math.exp(-dt * 2));
      var step = speed * dt;
      if (step > 0) {
        roadTex.offset.y = (roadTex.offset.y + step / PERIOD) % 1;
        ground.position.z += step;
        if (ground.position.z > TER_Z0 + TER_P) ground.position.z -= TER_P;
        for (i = 0; i < props.length; i++) {
          var po = props[i].obj; po.position.z += step;
          if (po.position.z > props[i].zMax) po.position.z -= props[i].span;
          if (props[i].lift !== undefined) po.position.y = groundY(po.position.x, po.position.z) + props[i].lift;
        }
      }

      /* camera */
      var swayYaw = (!reduce && cur === 'home' && now - lastInteract > 2500) ? Math.sin(now * 0.0004) * 0.02 : 0;
      yaw += (yawT + swayYaw - yaw) * k2; pitch += (pitchT - pitch) * k2;
      if (ext && !reduce && now - lastInteract > 2500 && !drag) spinT += dt * 0.35;
      rig.rotation.y += ((ext ? spinT : 0) - rig.rotation.y) * (reduce ? 1 : 1 - Math.exp(-dt * 7));
      var v = VIEWS[cur], W = size.w, H = size.h, rg = region(W, H), ox, oy;
      if (v.fp) {
        var mix = portraitMix;
        eye.set(v.eye[0] + (v.eyeP[0] - v.eye[0]) * mix, v.eye[1] + (v.eyeP[1] - v.eye[1]) * mix, v.eye[2] + (v.eyeP[2] - v.eye[2]) * mix);
        tg.set(v.tgt[0] + (v.tgtP[0] - v.tgt[0]) * mix, v.tgt[1] + (v.tgtP[1] - v.tgt[1]) * mix, v.tgt[2] + (v.tgtP[2] - v.tgt[2]) * mix);
        fwd.copy(tg).sub(eye).normalize().applyAxisAngle(Y_AXIS, yaw);
        rightV.crossVectors(fwd, Y_AXIS).normalize();
        fwd.applyAxisAngle(rightV, pitch);
        desTgt.copy(eye).addScaledVector(fwd, 2); desPos.copy(eye);
        ox = W >= 900 ? W / 2 - (380 + W - 16) / 2 : 0; oy = 0;
      } else {
        var tanV = Math.tan(camera.fov * Math.PI / 360);
        var fw = Math.max(0.2, (rg.r - rg.l) / W), fh = Math.max(0.2, (rg.b - rg.t) / H);
        var dist = Math.max(v.h / (2 * tanV * fh), v.w / (2 * tanV * (W / H) * fw));
        O.set(v.d[0], v.d[1], v.d[2]).normalize().multiplyScalar(dist);
        O.applyAxisAngle(X_AXIS, -pitch).applyAxisAngle(Y_AXIS, ext ? 0 : -yaw);
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
      if (v.fp) camera.rotateZ(-yaw * 0.12);
      camera.setViewOffset(W, H, offX, offY, W, H);
      sky.position.copy(camera.position);

      /* hover glow + button presses */
      for (var id in groups) {
        var gr = groups[id]; gr.h += (gr.t - gr.h) * Math.min(1, dt * 12);
        for (var a = 0; a < gr.meshes.length; a++) { var gm = gr.meshes[a]; gm.material.opacity = gm.userData.baseE + gr.h * gm.userData.hoverAmp; }
      }
      for (var j = 0; j < pressables.length; j++) {
        var p = pressables[j]; p.userData.press = Math.max(0, p.userData.press - dt * 3.2);
        p.position.y = p.userData.restY - 0.008 * Math.min(1, p.userData.press * 1.5);
      }

      /* dash screen */
      dash.rev += (dash.revT - dash.rev) * (1 - Math.exp(-dt * 5));
      if (Math.abs(dash.revT - dash.rev) > 0.002) dash.dirty = true;
      if (dash.dirty) {
        drawDash(dctx, { rev: dash.rev, label: dash.label, mode: state.mode, boot: state.boot });
        dashTex.needsUpdate = true; dash.dirty = false;
      }

      if (!reduce) grassTime.value = now / 1000;
      sunLight.target.position.set(camera.position.x, GROUND, camera.position.z - 18);
      sunLight.position.copy(sunLight.target.position).addScaledVector(SUN_DIR, 80);
      renderer.shadowMap.needsUpdate = true;
      if (mirrorMesh && (mirrorTick++ % mirrorEvery) === 0) {  /* the glass is hidden while its own picture is drawn */
        mirrorMesh.visible = false;
        renderer.setRenderTarget(mirrorRT); renderer.render(scene, rearCam); renderer.setRenderTarget(null);
        mirrorMesh.visible = true;
      }
      renderer.render(scene, camera);

      if (cur === 'home') {
        for (var n = 0; n < pinEls.length; n++) {
          var pp = PIN_POS[pinEls[n].dataset.go]; V.set(pp[0], pp[1], pp[2]).project(camera);
          var sx = (V.x * 0.5 + 0.5) * W, sy = (-V.y * 0.5 + 0.5) * H;
          pinEls[n].style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,-50%)';
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 20px "JetBrains Mono"')])
        .then(function () { dash.dirty = true; }, function () {});
    }

    return {
      setExt: function (on) {
        ext = !!on; yawT = 0; pitchT = ext ? 0.08 : 0; lastInteract = performance.now();
        if (ext) { cur = 'ext'; speedT = 0; spinT = -0.5; } else { cur = 'home'; speedT = 16; spinT = rig.rotation.y = 0; }
      },
      setView: function (id, viewKey) {
        if (ext) { ext = false; spinT = rig.rotation.y = 0; }
        cur = viewKey || id;
        yawT = 0; pitchT = 0; speedT = id === 'home' ? 16 : 5;
        dash.label = LABELS[id]; dash.revT = REV[id]; dash.dirty = true;
      },
      setModeVisual: function (m) {
                dash.dirty = true;
      }
    };
  }

  try { gl = initGL(); } catch (err) { gl = null; }
  if (!gl) { document.getElementById('nogl').hidden = false; pinsEl.hidden = true; }
  setMode('todo');
  setSection('home', { focus: false });
})();
