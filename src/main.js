import * as THREE from 'three';
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
    renderer.setClearColor(0x0B0D10, 1);

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

    /* real panorama (Poly Haven «Rolling Hills», CC0), pre-rotated so the sun sits ahead at u = 0.23.
       Until it loads (or if it fails) the painted sky above stays in place. */
    new T.TextureLoader().load('fondo/rolling_hills.jpg', function (tex) {
      tex.encoding = T.sRGBEncoding;
      tex.mapping = T.EquirectangularReflectionMapping;
      scene.background = tex;
      scene.remove(sky); scene.remove(mtn);
      scene.fog.color.setHex(HAZE_DAY); scene.fog.near = 60; scene.fog.far = 600;
      ground.material.color.setHex(0x3a2f1c); ground.material.envMapIntensity = 0.3;
      try {
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
    road.rotation.x = -Math.PI / 2; road.position.set(-1.75, GROUND + 0.002, 10 - ROAD_LEN / 2); scene.add(road);
    var ground = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: 0x0e1511, roughness: 1, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, GROUND, -300); scene.add(ground);

    /* street lamps and trees that slide past */
    var props = [];
    var poleMat = new T.MeshBasicMaterial({ color: 0x1b1f25 }), lampMat = new T.MeshBasicMaterial({ color: 0xffe2b4 });
    var glowTex = canvasTex(64, 64, function (x, w, h) {
      var g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    var glowMat = new T.SpriteMaterial({ map: glowTex, color: 0xffb070, blending: T.AdditiveBlending, transparent: true, depthWrite: false });
    var poleGeo = new T.CylinderGeometry(0.07, 0.09, 7.5, 8), armGeo = new T.BoxGeometry(1.6, 0.06, 0.06), headGeo = new T.BoxGeometry(0.4, 0.1, 0.22);
    function addLamp(side, z) {
      var g = new T.Group();
      var pole = new T.Mesh(poleGeo, poleMat); pole.position.y = GROUND + 3.75; g.add(pole);
      var arm = new T.Mesh(armGeo, poleMat); arm.position.set(-0.8, GROUND + 7.4, 0); g.add(arm);
      var head = new T.Mesh(headGeo, lampMat); head.position.set(-1.5, GROUND + 7.32, 0); g.add(head);
      var glow = new T.Sprite(glowMat); glow.position.set(-1.5, GROUND + 7.2, 0); glow.scale.set(4, 4, 1); g.add(glow);
      g.position.set(side > 0 ? 2.8 : -6.8, 0, z);
      if (side < 0) g.scale.x = -1;
      scene.add(g); props.push({ obj: g, zMax: 8, span: 336 });
    }
    for (i = 0; i < 12; i++) { addLamp(1, 6 - i * 28); addLamp(-1, -8 - i * 28); }
    var treeGeo = new T.ConeGeometry(1.5, 5.5, 7), treeMat = new T.MeshBasicMaterial({ color: 0x0b1210 });
    for (i = 0; i < 52; i++) {
      var tr = new T.Mesh(treeGeo, treeMat), sc = 0.7 + Math.random() * 1.1, sd0 = i % 2 ? 1 : -1;
      tr.scale.set(sc, sc, sc);
      tr.position.set(sd0 * (6 + Math.random() * 40) + (sd0 > 0 ? 0 : -3), GROUND + 2.75 * sc, 8 - Math.random() * 340);
      scene.add(tr); props.push({ obj: tr, zMax: 8, span: 348 });
    }

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

    scene.add(new T.HemisphereLight(0x8aa0d8, 0x2a1a16, 0.6));
    var sunLight = new T.DirectionalLight(0xff9a60, 1.2); sunLight.position.set(-6, 4, -20); scene.add(sunLight);
    var fill = new T.DirectionalLight(0xa8bcff, 0.9); fill.position.set(1.5, 6, 6); scene.add(fill);
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
    function bikeTex(f) {
      if (!f) return null;
      if (texCache[f]) return texCache[f];
      var t = new T.TextureLoader().load('bike/tx/' + f);
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
    function buildBike(meta, buf) {
      var mats = meta.materials.map(bikeMat);
      meta.prims.forEach(function (p) {
        var n = p.cnt, q = new Uint16Array(buf, p.po, n * 3), nr = new Int8Array(buf, p.no, n * 4), uq = new Uint16Array(buf, p.uo, n * 2);
        var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), k;
        for (k = 0; k < n; k++) {
          pos[k * 3] = p.mn[0] + q[k * 3] / 65535 * p.rg[0]; pos[k * 3 + 1] = p.mn[1] + q[k * 3 + 1] / 65535 * p.rg[1]; pos[k * 3 + 2] = p.mn[2] + q[k * 3 + 2] / 65535 * p.rg[2];
          nor[k * 3] = nr[k * 4] / 127; nor[k * 3 + 1] = nr[k * 4 + 1] / 127; nor[k * 3 + 2] = nr[k * 4 + 2] / 127;
          uv[k * 2] = p.umn[0] + uq[k * 2] / 65535 * p.urg[0]; uv[k * 2 + 1] = p.umn[1] + uq[k * 2 + 1] / 65535 * p.urg[1];
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
        geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
        geo.setIndex(new T.BufferAttribute(new Uint16Array(buf, p.io, p.ic), 1));
        var mesh = new T.Mesh(geo, mats[p.m]);
        if (mesh.material.transparent) mesh.renderOrder = 2;
        bike.add(mesh);
      });
    }
    var bikeReady = false;
    function loadBike() {
      var meta;
      fetch('bike/bike.json').then(function (r) { return r.json(); }).then(function (j) {
        meta = j; return fetch('bike/bike.bin');
      }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        buildBike(meta, buf); bikeReady = true;
        var ld = document.getElementById('loading'); if (ld) ld.hidden = true;
      }).catch(function () { var ld = document.getElementById('loading'); if (ld) ld.textContent = 'No se pudo cargar el modelo de la moto.'; });
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
        for (i = 0; i < props.length; i++) {
          var po = props[i].obj; po.position.z += step;
          if (po.position.z > props[i].zMax) po.position.z -= props[i].span;
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
