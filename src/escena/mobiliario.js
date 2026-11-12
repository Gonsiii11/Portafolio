/* Mountain-road furniture that slides past: guardrail («bionda») on some stretches, delineator posts («hitos de arista»)
   elsewhere. All built here, no third-party models. Everything wraps every SPAN metres; x > 0 is the right-hand side. */
import * as T from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTex, shadowsOn } from './utiles.js';
import { GROUND, edgeX } from './medidas.js';

export function createRoadside(scene, sliders) {
  var SPAN = 336;
  /* guardrail: [side, rear z, length]. Built from its rear end toward +z so it only wraps once fully behind the rider */
  var RAILS = [[1, -150, 72], [1, -310, 48], [-1, -66, 60], [-1, -250, 36]];
  /* galvanised steel, painted on a canvas: zinc spangle mottling, streaks along the rail, road grime on the lower edge.
     u runs across the profile (0 = bottom, 1 = top), v along the rail (one tile = 4 m). */
  var galvTex = canvasTex(256, 512, function (x, w, h) {
    x.fillStyle = '#9aa1a6'; x.fillRect(0, 0, w, h);
    for (var k = 0; k < 900; k++) {  /* spangle: soft light/dark flakes */
      var l = 150 + (Math.random() - 0.5) * 40 | 0;
      x.fillStyle = 'rgba(' + l + ',' + (l + 4) + ',' + (l + 8) + ',0.16)';
      x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 2 + Math.random() * 7, Math.random() * 3, 0, 7); x.fill();
    }
    for (k = 0; k < 120; k++) {  /* streaks along the length */
      x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '40,44,48') + ',' + (0.03 + Math.random() * 0.06).toFixed(3) + ')';
      x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 40 + Math.random() * 200);
    }
    var gr = x.createLinearGradient(0, 0, w, 0);  /* grime: brownish on the bottom third, a little at the top lip */
    gr.addColorStop(0, 'rgba(70,58,40,0.55)'); gr.addColorStop(0.3, 'rgba(70,58,40,0.12)'); gr.addColorStop(0.5, 'rgba(70,58,40,0)');
    gr.addColorStop(0.92, 'rgba(70,58,40,0)'); gr.addColorStop(1, 'rgba(70,58,40,0.25)');
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
    for (k = 0; k < 40; k++) {  /* a few rust/dirt drips */
      x.fillStyle = 'rgba(96,62,34,' + (0.08 + Math.random() * 0.12).toFixed(3) + ')';
      x.fillRect(Math.random() * w * 0.4, Math.random() * h, 2 + Math.random() * 3, 6 + Math.random() * 30);
    }
  });
  galvTex.wrapS = galvTex.wrapT = T.RepeatWrapping;
  var steelMat = new T.MeshStandardMaterial({ map: galvTex, color: 0xd0d4d8, metalness: 0.8, roughness: 0.48, envMapIntensity: 0.6, side: T.DoubleSide });
  var postMat = new T.MeshStandardMaterial({ map: galvTex, color: 0x9a9fa4, metalness: 0.75, roughness: 0.55, envMapIntensity: 0.45 });
  var boltMat = new T.MeshStandardMaterial({ color: 0x3a3d40, metalness: 0.6, roughness: 0.5 });
  var catMat = new T.MeshBasicMaterial({ color: 0xffe9c2, side: T.DoubleSide });  /* the guardrail's small reflectors */
  /* W-beam profile (x = toward the road, y = up, metres): two rounded bulges with a valley between, lips at the edges */
  var W_PROF = (function () {
    var pts = [], N = 26, k;
    for (k = 0; k <= N; k++) {
      var y = -0.155 + 0.31 * k / N, a = Math.abs(y);
      var bump = Math.exp(-Math.pow((a - 0.08) / 0.042, 2));
      pts.push([a > 0.142 ? 0.004 * (0.155 - a) / 0.013 : 0.006 + 0.066 * bump, y]);
    }
    return pts;
  })();
  var RAIL_H = 0.6, RAIL_DROP = 8;  /* rail centre height; length of the sloped end ("terminal abatido") */
  function railY(z, len) {  /* the ends dip into the ground over RAIL_DROP metres */
    var t = Math.min(1, Math.min(z, len - z) / RAIL_DROP), e = t * t * (3 - 2 * t);
    return GROUND + RAIL_H - (1 - e) * (RAIL_H + 0.05);
  }
  function railGeo(len) {  /* the profile swept along z every 0.5 m */
    var st = Math.ceil(len / 0.5), P = W_PROF.length, pos = [], uv = [], idx = [], i, j, acc = [0];
    for (i = 1; i < P; i++) acc.push(acc[i - 1] + Math.hypot(W_PROF[i][0] - W_PROF[i - 1][0], W_PROF[i][1] - W_PROF[i - 1][1]));
    for (j = 0; j <= st; j++) {
      var z = len * j / st, yo = railY(z, len);
      for (i = 0; i < P; i++) { pos.push(W_PROF[i][0], yo + W_PROF[i][1], z); uv.push(acc[i] / acc[P - 1], z / 4); }
    }
    for (j = 0; j < st; j++) for (i = 0; i < P - 1; i++) {
      var a = j * P + i, b = a + P;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  /* C-channel post, 100 × 50 mm, and its spacer block; bolts through the rail's valley */
  var postGeoC = (function () {
    var sh = new T.Shape();
    sh.moveTo(-0.025, -0.05); sh.lineTo(0.025, -0.05); sh.lineTo(0.025, -0.044); sh.lineTo(-0.019, -0.044);
    sh.lineTo(-0.019, 0.044); sh.lineTo(0.025, 0.044); sh.lineTo(0.025, 0.05); sh.lineTo(-0.025, 0.05); sh.closePath();
    var g = new T.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);  /* extrusion now runs up y, from 0 to 1 */
    return g;
  })();
  function railBits(len) {  /* posts + spacers merged into one geometry; bolts and reflectors into two more */
    var posts = [], bolts = [], cats = [], k = 0, m = new T.Matrix4();
    for (var z = 2; z < len - 1; z += 4, k++) {
      var top = railY(z, len) + 0.12 - GROUND;
      if (top < 0.25) continue;  /* no post under the buried end */
      posts.push(postGeoC.clone().applyMatrix4(m.makeScale(1, top, 1).premultiply(new T.Matrix4().makeTranslation(-0.2, GROUND, z))));
      posts.push(new T.BoxGeometry(0.12, 0.2, 0.07).toNonIndexed().translate(-0.1, railY(z, len), z));  /* same layout as the extruded post, or the merge fails */
      bolts.push(new T.CylinderGeometry(0.012, 0.012, 0.02, 8).rotateZ(Math.PI / 2).translate(0.02, railY(z, len), z));
      if (k % 3 === 1) cats.push(new T.PlaneGeometry(0.06, 0.09).rotateY(0).translate(-0.04, railY(z, len) + 0.21, z + 0.04));
    }
    return [posts, bolts, cats].map(function (l) {
      if (!l.length) return null;
      var mg = BufferGeometryUtils.mergeBufferGeometries(l);
      if (!mg) console.warn('[portfolio] guardrail merge failed');
      return mg;
    });
  }
  RAILS.forEach(function (r) {
    var g = new T.Group(), len = r[2], bits = railBits(len);
    g.add(new T.Mesh(railGeo(len), steelMat));
    if (bits[0]) g.add(new T.Mesh(bits[0], postMat));
    if (bits[1]) g.add(new T.Mesh(bits[1], boltMat));
    if (bits[2]) g.add(new T.Mesh(bits[2], catMat));
    g.position.set(edgeX(r[0], 0.9), 0, r[1]);
    if (r[0] > 0) g.scale.x = -1;  /* local +x must point at the road */
    shadowsOn(g); scene.add(g); sliders.add(g, 8, SPAN);
  });
  /* delineator post («hito de arista»): rounded section that narrows a little towards the top, top cut on a slant
     (lower on the road side), black band with a reflector facing oncoming riders, road dirt up the base.
     Band and dirt are painted in the shader from the post's own height, so their edges stay crisp; local +x points at the road. */
  var hitoGeo = (function () {
    var sh = new T.Shape(), hw = 0.05, hd = 0.065, r = 0.018;  /* half width (x), half depth (z), corner radius */
    sh.moveTo(-hw + r, -hd); sh.lineTo(hw - r, -hd); sh.quadraticCurveTo(hw, -hd, hw, -hd + r);
    sh.lineTo(hw, hd - r); sh.quadraticCurveTo(hw, hd, hw - r, hd); sh.lineTo(-hw + r, hd);
    sh.quadraticCurveTo(-hw, hd, -hw, hd - r); sh.lineTo(-hw, -hd + r); sh.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    var g = new T.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 3, steps: 12 });
    g.rotateX(-Math.PI / 2);  /* y from 0 (ground) to 1 */
    var p = g.attributes.position, H = 1.05, k;
    for (k = 0; k < p.count; k++) {
      var t = p.getY(k), x = p.getX(k), z = p.getZ(k), taper = 1 - 0.15 * t;
      var y = t * H - (t > 0.999 ? (x + hw) / (2 * hw) * 0.05 : 0);  /* slanted top: 5 cm lower on the road side */
      p.setXYZ(k, x * taper, y, z * taper);
    }
    g.computeVertexNormals();
    return g;
  })();
  var reflGeo = new T.PlaneGeometry(0.045, 0.16);
  var hitoMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, envMapIntensity: 0.5 });
  hitoMat.onBeforeCompile = function (sh) {
    sh.vertexShader = 'varying float vHy;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vHy = position.y;');
    sh.fragmentShader = 'varying float vHy;\n' + sh.fragmentShader.replace('#include <color_fragment>', [
      '#include <color_fragment>',
      '  float band = step( 0.70, vHy ) * step( vHy, 0.95 );',
      '  float dirt = clamp( 1.0 - vHy / 0.28, 0.0, 1.0 );',
      '  vec3 body = mix( vec3( 0.72, 0.71, 0.68 ), vec3( 0.3, 0.26, 0.2 ), dirt * dirt );',
      '  diffuseColor.rgb = mix( body, vec3( 0.012 ), band );'
    ].join('\n'));
  };
  var reflMat = new T.MeshBasicMaterial({ color: 0xfff0d2 });
  function underRail(side, z) {
    return RAILS.some(function (r) { return r[0] === side && z > r[1] - 3 && z < r[1] + r[2] + 3; });
  }
  [1, -1].forEach(function (side) {
    for (var z = side > 0 ? 4 : -8; z > 8 - SPAN; z -= 24) {
      if (underRail(side, z)) continue;
      var g = new T.Group();
      var post = new T.Mesh(hitoGeo, hitoMat); post.position.y = GROUND - 0.02; g.add(post);
      var refl = new T.Mesh(reflGeo, reflMat); refl.position.set(0, GROUND + 0.81, 0.059); g.add(refl);
      g.position.set(edgeX(side, 0.8), 0, z);
      if (side > 0) g.scale.x = -1;  /* local +x must point at the road */
      g.rotation.y = (Math.random() - 0.5) * 0.12;  /* not all perfectly square to the road */
      shadowsOn(g); scene.add(g); sliders.add(g, 8, SPAN);
    }
  });
}
