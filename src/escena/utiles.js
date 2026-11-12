/* Small helpers used by several scene modules. */
import * as T from 'three';

/* a texture painted on a canvas by draw(ctx, w, h) */
export function canvasTex(w, h, draw) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
  return t;
}

/* depth material that cuts a shadow by a texture's alpha (foliage); one per source material */
var depthMats = {};
export function alphaDepthMat(m) {
  return depthMats[m.uuid] = depthMats[m.uuid] || new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: m.map, alphaTest: m.alphaTest, side: T.DoubleSide });
}

/* everything solid casts and receives the sun's shadow; foliage cuts its shadow by the leaf texture's alpha */
export function shadowsOn(root) {
  root.traverse(function (o) {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    var m = o.material;
    if (m && m.alphaTest > 0 && m.map) o.customDepthMaterial = alphaDepthMat(m);
  });
  return root;
}
