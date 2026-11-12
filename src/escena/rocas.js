import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { shadowsOn } from './utiles.js';
import { ROAD_W, ROAD_CX } from './medidas.js';

/* granite boulders («Namaqualand Boulder 04/05», Poly Haven, CC0), simplified with herramientas/reducir_rocas.sh.
   Scattered past the shoulder, half sunk into the ground, sliding past like the pines. */
export function createRocks(scene, loader, sliders, groundY) {
  var files = ['rocas/granito_a.glb', 'rocas/granito_b.glb'], kinds = [], left = files.length;
  loader.afterBike.then(function () { files.forEach(function (f, n) {  /* phase 2 */
    new GLTFLoader().load(f, function (gltf) {
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(function (o) {  /* keep the node transform: vertex quantization stores its scale there */
        if (o.isMesh && !kinds[n]) { o.material.envMapIntensity = 0.4; o.material.color.setHex(0xa8a196); kinds[n] = { geo: o.geometry, mat: o.material, mtx: o.matrixWorld.clone() }; }
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
        var m = new T.Group(), body = new T.Mesh(kd.geo, kd.mat); body.applyMatrix4(kd.mtx); m.add(body);
        m.scale.set(sc, sc * (0.8 + Math.random() * 0.4), sc);
        m.rotation.y = Math.random() * Math.PI * 2;
        m.position.set(cx + (r ? (Math.random() - 0.5) * 6 : 0), 0, cz + (r ? (Math.random() - 0.5) * 6 : 0));
        if (Math.abs(m.position.x - ROAD_CX) < ROAD_W / 2 + 5) m.position.x = ROAD_CX + sd * (ROAD_W / 2 + 5);
        m.position.y = groundY(m.position.x, m.position.z) - 0.12 * sc;
        shadowsOn(m); scene.add(m); sliders.add(m, 8, 348, -0.12 * sc);
      }
    }
  }
}
