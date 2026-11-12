/* ---------- curves: the world is built straight and bent in the vertex shader ----------
   Everything keeps sliding along a straight z axis (that is what lets it all wrap without seams). Each vertex is
   pushed sideways by  X(s + d) - X(s) - X'(s)·d,  where s = metres travelled and d = metres ahead (-z): zero offset and
   zero slope at the bike, so the bike stays in its lane, while the road ahead swings left and right and the terrain,
   forest, grass, rocks and roadside furniture swing with it (they all use the same function). X is a sum of sines that
   repeats every CURVE_P metres. Through a bend the ground also rolls very slightly (under 1°) around the bike's contact
   patch, a hint of lean. The bike itself, the sky panorama and the camera are neither bent nor rolled.
   Anything that must not bend carries userData.noBend; userData.bendAmt = 0 means "lean only". */
import * as T from 'three';
import { GROUND } from './medidas.js';

var CURVE_P = 1500, CURVE = [[30, 2, 0], [7, 5, 1.3], [1.2, 11, 4.1]];  /* amplitude (m), cycles per CURVE_P, phase; tightest bend ~133 m radius */
CURVE.forEach(function (c) { c.push(Math.PI * 2 * c[1] / CURVE_P); });   /* c[3] = angular frequency */

function curveD2(s) { var v = 0; CURVE.forEach(function (c) { v -= c[0] * c[3] * c[3] * Math.sin(c[3] * s + c[2]); }); return v; }

var CURVE_GLSL = [
  'uniform float uCurveS;', 'uniform float uLean;',
  'float cX( float s ) { return ' + CURVE.map(function (c) { return c[0].toFixed(3) + ' * sin( ' + c[3].toFixed(7) + ' * s + ' + c[2].toFixed(3) + ' )'; }).join(' + ') + '; }',
  'float cD( float s ) { return ' + CURVE.map(function (c) { return (c[0] * c[3]).toFixed(7) + ' * cos( ' + c[3].toFixed(7) + ' * s + ' + c[2].toFixed(3) + ' )'; }).join(' + ') + '; }',
  'vec4 bendWorld( vec4 w, float amt ) {',
  '  float d = -w.z;',
  '  w.x += amt * ( cX( uCurveS + d ) - cX( uCurveS ) - cD( uCurveS ) * d );',
  '  float c = cos( uLean ), sn = sin( uLean ); vec2 p = vec2( w.x, w.y - ( ' + GROUND.toFixed(3) + ' ) );',
  '  w.xy = vec2( c * p.x - sn * p.y, sn * p.x + c * p.y + ( ' + GROUND.toFixed(3) + ' ) );',
  '  return w;',
  '}', ''
].join('\n');

function bentChunks(amt) {
  return {
    project: ['vec4 mvPosition = vec4( transformed, 1.0 );', '#ifdef USE_INSTANCING', '  mvPosition = instanceMatrix * mvPosition;', '#endif',
      'mvPosition = viewMatrix * bendWorld( modelMatrix * mvPosition, ' + amt + ' );', 'gl_Position = projectionMatrix * mvPosition;'].join('\n'),
    world: ['#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )', '  vec4 worldPosition = vec4( transformed, 1.0 );',
      '  #ifdef USE_INSTANCING', '    worldPosition = instanceMatrix * worldPosition;', '  #endif',
      '  worldPosition = bendWorld( modelMatrix * worldPosition, ' + amt + ' );', '#endif'].join('\n')
  };
}

export function createCurves(scene) {
  var curveU = { value: 0 }, leanU = { value: 0 }, travelled = 0;
  var NOOP_OBC = T.Material.prototype.onBeforeCompile;

  /* wraps a material's own onBeforeCompile (if any) with the bend; re-wraps if the material later gets a new one */
  function bendify(m, amt) {
    if (m.userData.bentWrap && m.onBeforeCompile === m.userData.bentWrap) return m;
    var prev = m.onBeforeCompile !== NOOP_OBC ? m.onBeforeCompile : null, a = (amt === undefined ? 1 : amt).toFixed(1), ch = bentChunks(a);
    m.onBeforeCompile = m.userData.bentWrap = function (sh, r) {
      if (prev) prev.call(m, sh, r);
      sh.uniforms.uCurveS = curveU; sh.uniforms.uLean = leanU;
      sh.vertexShader = CURVE_GLSL + sh.vertexShader.replace('#include <project_vertex>', ch.project).replace('#include <worldpos_vertex>', ch.world);
    };
    var key = 'curve' + a + '|' + (prev ? prev.toString() : '');
    m.customProgramCacheKey = function () { return key; };  /* or every wrapped material would share one cached program */
    m.needsUpdate = true;
    return m;
  }
  var bentDepth = bendify(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }));

  return {
    /* metres travelled this frame */
    advance: function (step) { travelled += step; curveU.value = travelled % CURVE_P; },
    /* a hint of lean into the bend: a third of the physical angle atan(v²·curvature / g), capped under 1°, eased slowly,
       so the ground tilts a little while the sky stays still */
    updateLean: function (speed, dt) {
      var LEAN_SHARE = 0.33, LEAN_MAX = 0.015;
      var leanT = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, LEAN_SHARE * Math.atan(speed * speed * curveD2(curveU.value) / 9.81)));
      leanU.value += (leanT - leanU.value) * (1 - Math.exp(-dt * 1.5));
    },
    /* run every frame: bends whatever is new or changed (loaders add things late); `skip` (the bike rig) is left alone */
    bendScene: function (skip) {
      for (var c = 0; c < scene.children.length; c++) {
        var top = scene.children[c];
        if (top === skip || top.userData.noBend) continue;
        top.traverse(function (o) {
          if (!o.isMesh || o.userData.noBend) return;
          var amt = o.userData.bendAmt;
          var ms = Array.isArray(o.material) ? o.material : [o.material];
          for (var k = 0; k < ms.length; k++) bendify(ms[k], amt);
          if (o.castShadow) {
            if (!o.customDepthMaterial) o.customDepthMaterial = bentDepth;
            else bendify(o.customDepthMaterial);
          }
        });
      }
    }
  };
}
