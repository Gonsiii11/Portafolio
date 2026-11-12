/* Terrain: flat shoulders beside the road, then banks and rolling ground rising to both sides (heights in medidas.js),
   textured with «Aerial Grass Rock» (Poly Haven, CC0, one tile = 15 m), a dusty dirt shoulder, and 3D grass tufts.
   The mesh slides toward the rider and jumps back one terrain period (TER_P) — seamless, since heights repeat. */
import * as T from 'three';
import { GROUND, ROAD_W, ROAD_CX, TER_P, TER_W, TER_L, TER_SEG, TER_Z0, terH, LOW_GPU } from './medidas.js';

export function createTerrain(scene, loader) {
  var TIER = loader.TIER;
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
  loader.loadTiered('terreno/hierba_512.webp', TIER > 1 ? 'terreno/hierba_2k.webp' : 'terreno/hierba_1k.webp', true, function (tex) {
    ground.material.map = tex; ground.material.needsUpdate = true;
  }, true);
  /* relief (phase 3 only): the texture's own normal map (Poly Haven, CC0) */
  loader.loadTiered(null, TIER > 1 ? 'terreno/hierba_normal_2k.webp' : 'terreno/hierba_normal_1k.webp', false, function (tex) {
    ground.material.normalMap = tex; ground.material.normalScale.set(1.2, 1.2); ground.material.needsUpdate = true;
  });
  /* terrain shading:
     - anti-tiling: the grass colour is mixed with itself at ~6x the scale and an offset, so the 15 m repeat stops showing;
     - shoulder: within ~1.5 m of the asphalt the grass gives way to dusty dirt with stones («Stony Dirt Path», Poly Haven, CC0),
       with a ragged edge driven by the grass texture itself. Terrain x is world x (the mesh only moves along z). */
  var gravelU = { value: new T.DataTexture(new Uint8Array([120, 100, 80, 255]), 1, 1) };
  loader.loadTiered('terreno/grava_512.webp', TIER > 1 ? 'terreno/grava_1k.webp' : null, true, function (tex) { gravelU.value = tex; }, true);
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

  return {
    ground: ground,
    /* world height of the ground at (x, world z), wherever the sliding mesh currently is */
    groundY: function (x, zWorld) { return GROUND + terH(x, zWorld - ground.position.z); },
    /* the panorama is in: lighter ground, softer reflections */
    setDaylight: function () { ground.material.color.setHex(0xc9c4b4); ground.material.envMapIntensity = 0.3; },
    advance: function (step) {
      ground.position.z += step;
      if (ground.position.z > TER_Z0 + TER_P) ground.position.z -= TER_P;
    },
    /* wind for the grass */
    setTime: function (seconds) { grassTime.value = seconds; }
  };
}
