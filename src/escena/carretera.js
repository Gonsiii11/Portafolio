/* The road: a painted placeholder first, then the real asphalt, with fine relief once the browser is idle.
   The texture scrolls toward the rider; the mesh itself never moves. */
import * as T from 'three';
import { canvasTex } from './utiles.js';
import { GROUND, ROAD_W, ROAD_LEN, ROAD_CX } from './medidas.js';

export function createRoad(scene, loader) {
  var PERIOD = 9;  /* metres of road per texture tile (28 once the real asphalt is in) */
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
  roadTex.anisotropy = loader.MAX_ANISO;
  var road = new T.Mesh(new T.PlaneGeometry(ROAD_W, ROAD_LEN, 2, ROAD_LEN / 2), new T.MeshStandardMaterial({ map: roadTex, roughness: 0.92, metalness: 0 }));  /* 2 m rows so it can follow the curves */
  road.rotation.x = -Math.PI / 2; road.position.set(ROAD_CX, GROUND + 0.002, 10 - ROAD_LEN / 2); road.receiveShadow = true; scene.add(road);

  /* real asphalt: texture from «Street road» by saifurrehman (CC BY 4.0), rotated so the lanes run along v.
     One tile = 28 m of road. Swaps in when loaded; the painted road stays if it fails. */
  loader.loadTex('carretera/asfalto.webp', true, function (tex) {
    PERIOD = 28;
    tex.repeat.set(1, ROAD_LEN / PERIOD);
    tex.offset.y = roadTex.offset.y;
    road.material.map = tex; road.material.needsUpdate = true;
    roadTex.dispose(); roadTex = tex;
  });
  /* fine relief (phase 3): «Clean Asphalt» normal map (Poly Haven, CC0), sampled at its real size (~2.1 m a tile)
     on top of the UVs the colour map scrolls with: 7 m / 2.1 = 3.33 across, 28 m / 2.1 = 13.3 along one tile */
  loader.loadTiered(null, 'carretera/asfalto_normal.webp', false, function (nt) {
    road.material.normalMap = nt; road.material.normalScale.set(0.9, 0.9);
    road.material.onBeforeCompile = function (sh) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>',
        T.ShaderChunk.normal_fragment_maps.replace(/texture2D\( normalMap, vUv \)/g, 'texture2D( normalMap, vUv * vec2( 3.33, 13.3 ) )'));
    };
    road.material.needsUpdate = true;
  });

  return {
    advance: function (step) { roadTex.offset.y = (roadTex.offset.y + step / PERIOD) % 1; }
  };
}
