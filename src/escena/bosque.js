import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { alphaDepthMat } from './utiles.js';
import { GROUND, ROAD_W, ROAD_CX, TER_Z0, terH } from './medidas.js';

/* ---------- pine forest («Scots Pine Trees Set» by Maksim Batyrev, CC BY 4.0) ----------
   The set has 9 trees; each is baked to one geometry per material, stood on y = 0 and scaled to 1 m tall, and its
   foliage is doubled (a turned, wider copy merged in) so crowns read full. Trees are drawn as instances: one
   InstancedMesh per tree type and material, so hundreds of pines cost a few draw calls and no extra download.
   Layout: a FOREST_S-metre block (twice, back to back) that slides with the road and jumps back FOREST_S, a multiple
   of the terrain period, so every trunk keeps standing on the ground. Groves with clearings come from a smooth
   density field; type 8 (a dead snag) is kept rare. Near trees cast shadows, far ones don't (cheaper). */
export function createForest(scene, loader) {
  var TIER = loader.TIER;
  var FOREST_S = 360, FOREST_Z0 = 8, FOREST_FADE = [320, 380], forest = new T.Group();
  forest.position.z = FOREST_Z0; scene.add(forest);
  loader.afterBike.then(function () { new GLTFLoader().load('pinos/scene.gltf', function (gltf) {  /* phase 2 */
    gltf.scene.updateMatrixWorld(true);
    var parts = {}, mats = {};
    gltf.scene.traverse(function (o) {
      if (!o.isMesh || /Box001/.test(o.name)) return;
      var id = (o.name.match(/^(\d+)_/) || [])[1];
      if (!id) return;
      var m = o.material;
      if (!mats[m.name]) {
        if (m.map && m.transparent) { m.transparent = false; m.alphaTest = 0.2; m.alphaToCoverage = true; m.depthWrite = true; }
        m.side = T.DoubleSide; m.envMapIntensity = 0.35; mats[m.name] = m;
        /* the forest reaches farther than the terrain does (its far edge sits 396-456 m ahead): trees shrink to nothing
           between FOREST_FADE[0] and [1] metres ahead, inside the fog and always before the terrain ends */
        m.onBeforeCompile = function (sh) {
          sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', [
            '#include <begin_vertex>',
            '#ifdef USE_INSTANCING',
            '  float fz = ( modelMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).z;',
            '  transformed *= smoothstep( ' + (-FOREST_FADE[1]).toFixed(1) + ', ' + (-FOREST_FADE[0]).toFixed(1) + ', fz );',
            '#endif'
          ].join('\n'));
        };
        m.needsUpdate = true;
      }
      var g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      parts[id] = parts[id] || {};
      (parts[id][m.name] = parts[id][m.name] || []).push(g);
    });
    var ids = Object.keys(parts);
    if (!ids.length) return;
    var types = {};
    ids.forEach(function (id) {
      var list = [], box = new T.Box3();
      Object.keys(parts[id]).forEach(function (mn) {
        var geos = parts[id][mn], merged = geos.length > 1 ? BufferGeometryUtils.mergeBufferGeometries(geos) : geos[0];
        if (merged) list.push([merged, mats[mn]]); else geos.forEach(function (g) { list.push([g, mats[mn]]); });
      });
      list.forEach(function (p) { p[0].computeBoundingBox(); box.union(p[0].boundingBox); });
      /* pivot = centre of the trunk's lowest ring (not the box centre: some trees lean), so the trunk stands where placed */
      var c = box.getCenter(new T.Vector3()), trunk = list.filter(function (p) { return p[1].name === 'Mat_Trunk'; })[0];
      if (trunk) {
        var pa = trunk[0].attributes.position, lo = Infinity, sx = 0, sz = 0, nb = 0, q0;
        for (q0 = 0; q0 < pa.count; q0++) lo = Math.min(lo, pa.getY(q0));
        var tol = (box.max.y - box.min.y) * 0.01;
        for (q0 = 0; q0 < pa.count; q0++) if (pa.getY(q0) < lo + tol) { sx += pa.getX(q0); sz += pa.getZ(q0); nb++; }
        if (nb) { c.x = sx / nb; c.z = sz / nb; }
      }
      var s = 1 / (box.max.y - box.min.y);
      var mtx = new T.Matrix4().makeScale(s, s, s).multiply(new T.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
      list.forEach(function (p) {
        p[0].applyMatrix4(mtx);
        if (p[1].alphaTest > 0) {  /* fuller crown: merge in a copy turned ~80° and a touch wider */
          var extra = p[0].clone().applyMatrix4(new T.Matrix4().makeRotationY(1.4).multiply(new T.Matrix4().makeScale(1.12, 0.94, 1.12)));
          p[0] = BufferGeometryUtils.mergeBufferGeometries([p[0], extra]) || p[0];
        }
      });
      types[id] = list;
    });
    /* tree type weights: the dead snag (8) is rare */
    var pool = [];
    ids.forEach(function (id) { for (var w = 0; w < (id === '8' ? 1 : 10); w++) pool.push(id); });
    /* density of the groves: smooth bumps along the road, different on each side */
    function grove(x, z, side) {
      var v = Math.sin(z * 0.019 + side * 1.9) * 0.55 + Math.sin(z * 0.047 + x * 0.031 + side) * 0.35 + Math.sin(x * 0.08 - z * 0.011) * 0.25;
      return Math.max(0, Math.min(1, 0.5 + v));
    }
    var perBlock = TIER > 1 ? 380 : 150, placed = { near: {}, far: {} }, tries = 0, n = 0;
    var zToTer = FOREST_Z0 - TER_Z0;  /* terrain-local z = forest-local z + this (stays true mod TER_P) */
    while (n < perBlock && tries++ < perBlock * 30) {
      var side = Math.random() < 0.5 ? -1 : 1, rr = Math.random();
      var d = 5 + 120 * rr * rr;  /* metres past the asphalt edge: more trees near, fewer far */
      var x = ROAD_CX + side * (ROAD_W / 2 + d), z = -Math.random() * FOREST_S;
      var dens = grove(x, z, side) * (d < 10 ? 0.35 : 1);
      if (Math.random() > dens) continue;
      var id = pool[Math.floor(Math.random() * pool.length)], band = d < 32 ? 'near' : 'far';
      var h = 8 + Math.random() * 7 + (d > 40 ? 3 : 0);  /* metres tall */
      /* ground level (GROUND + terrain height), taken as the lowest point within ~0.6 m of the trunk so a tree on a slope
         never shows air under its downhill side; then sunk 0.2 m into the soil */
      var y = GROUND + Math.min(terH(x, z + zToTer), terH(x + 0.6, z + zToTer), terH(x - 0.6, z + zToTer), terH(x, z + zToTer + 0.6), terH(x, z + zToTer - 0.6)) - 0.2;
      (placed[band][id] = placed[band][id] || []).push([x, y, z, h, Math.random() * Math.PI * 2]);
      n++;
    }
    var m4 = new T.Matrix4(), q = new T.Quaternion(), sv = new T.Vector3(), pv = new T.Vector3(), UPF = new T.Vector3(0, 1, 0);
    ['near', 'far'].forEach(function (band) {
      Object.keys(placed[band]).forEach(function (id) {
        var trees = placed[band][id];
        types[id].forEach(function (p) {
          var im = new T.InstancedMesh(p[0], p[1], trees.length * 2), k = 0;
          for (var b = 0; b < 2; b++) {  /* two copies of the block, back to back */
            trees.forEach(function (t) {
              q.setFromAxisAngle(UPF, t[4]); sv.set(t[3], t[3], t[3]); pv.set(t[0], t[1], t[2] - b * FOREST_S);
              im.setMatrixAt(k++, m4.compose(pv, q, sv));
            });
          }
          im.frustumCulled = false;  /* r128 culls instanced meshes by one tree's bounds */
          im.receiveShadow = true;
          im.castShadow = band === 'near';
          if (im.castShadow && p[1].alphaTest > 0 && p[1].map) {
            im.customDepthMaterial = alphaDepthMat(p[1]);
          }
          forest.add(im);
        });
      });
    });
  }); });

  return {
    advance: function (step) {
      forest.position.z += step;
      if (forest.position.z > FOREST_Z0 + FOREST_S) forest.position.z -= FOREST_S;
    }
  };
}
