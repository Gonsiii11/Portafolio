/* ---------- the bike: BMW S1000RR 2019 (VTX, CC BY-NC-SA 4.0), baked to a light binary ----------
   Model space: front = -z, wheels touch y = -0.482. Also here: the rear-view mirrors, the TFT dash screen and the
   invisible hot spots over the real controls. */
import * as T from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { ACCENT } from '../config.js';
import { shadowsOn } from '../escena/utiles.js';
import { BIKE_Y, LOW_GPU } from '../escena/medidas.js';
import { drawDash } from './tablero.js';
import { gearAndRpm, formatTrip, formatClock } from './tft.js';

/* a point in bike space -> world */
export function W3(p) { return [p[0], p[1] + BIKE_Y, p[2]]; }

export function createBike(scene, loader) {
  var rig = new T.Group(); scene.add(rig);
  var bike = new T.Group(); bike.position.y = BIKE_Y; rig.add(bike);
  var texCache = {};
  var bikeMgr = new T.LoadingManager(function () { loader.bikeShown(); });  /* phase 2 starts when the bike's textures are in too */
  function bikeTex(f) {
    if (!f) return null;
    if (texCache[f]) return texCache[f];
    var t = new T.TextureLoader(bikeMgr).load('bike/tx/' + f.replace(/\.(png|jpe?g)$/i, '.webp'));  /* served as WebP */
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
    var mats = [];  /* only materials some part uses (one in the file has no part and no texture) */
    function matFor(i) { return mats[i] || (mats[i] = bikeMat(meta.materials[i])); }
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
      var mesh = new T.Mesh(geo, matFor(p.m));
      if (mesh.material.transparent) mesh.renderOrder = 2;
      if (p.n === MIRROR_PRIM) { mirrorUVs(geo); mesh.material = mirrorMat; mirrorMesh = mesh; }
      if (!mesh.material.transparent) shadowsOn(mesh);
      bike.add(mesh);
    });
  }
  function loadBike() {
    var meta;
    fetch('bike/bike.json').then(function (r) { return r.json(); }).then(function (j) {
      meta = j; return Promise.all([fetch('bike/bike.bin').then(function (r) { return r.arrayBuffer(); }), MeshoptDecoder.ready]);
    }).then(function (res) {
      var buf = res[0];
      buildBike(meta, buf);
      var ld = document.getElementById('loading'); if (ld) ld.hidden = true;
    }).catch(function () { loader.bikeShown(); var ld = document.getElementById('loading'); if (ld) ld.textContent = 'No se pudo cargar el modelo de la moto.'; });
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
  /* what the screen shows; `dirty` forces a redraw (hover change, fonts loaded), otherwise at most 15 redraws a second */
  var dash = { rpm: 1200, hover: null, dirty: true, since: 1, shown: '' };

  /* invisible hot spots over the real controls; they glow on hover */
  var hot = [], groups = {};
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

  return {
    rig: rig,
    hot: hot,          /* meshes the pointer can hit */
    groups: groups,    /* hover glow groups: { meshes, h (current), t (target) } */
    dash: dash,        /* { rpm, hover, dirty } */
    /* hover glow fades toward its target */
    updateGlow: function (dt) {
      for (var id in groups) {
        var gr = groups[id]; gr.h += (gr.t - gr.h) * Math.min(1, dt * 12);
        for (var a = 0; a < gr.meshes.length; a++) { var gm = gr.meshes[a]; gm.material.opacity = gm.userData.baseE + gr.h * gm.userData.hoverAmp; }
      }
    },
    /* the needle eases toward its target; the screen is redrawn only when something changed */
    /* info = { speedMs, travelledM }: the needle eases toward the revs for this speed */
    updateDash: function (dt, info) {
      var gr = gearAndRpm(info.speedMs);
      dash.rpm += (gr.rpm - dash.rpm) * (1 - Math.exp(-dt * 8));
      dash.since += dt;
      var st = { speedKmh: Math.round(info.speedMs * 3.6), gear: gr.gear, rpm: dash.rpm, trip: formatTrip(info.travelledM), clock: formatClock(new Date()), hover: dash.hover };
      var key = [st.speedKmh, st.gear, Math.round(st.rpm / 50), st.trip, st.clock, st.hover].join('|');
      if (dash.dirty || (key !== dash.shown && dash.since >= 1 / 15)) {
        drawDash(dctx, st);
        dashTex.needsUpdate = true; dash.dirty = false; dash.since = 0; dash.shown = key;
      }
    },
    /* the menu row under the pointer ('about' | 'projects' | 'contact' | null) */
    setHover: function (id) { if (id !== dash.hover) { dash.hover = id; dash.dirty = true; } },
    /* draws the mirrors' picture (the glass is hidden while its own picture is drawn) */
    renderMirrors: function (renderer, scene) {
      if (mirrorMesh && (mirrorTick++ % mirrorEvery) === 0) {
        mirrorMesh.visible = false;
        renderer.setRenderTarget(mirrorRT); renderer.render(scene, rearCam); renderer.setRenderTarget(null);
        mirrorMesh.visible = true;
      }
    }
  };
}
