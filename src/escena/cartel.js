/* Direction signs on the right-hand verge: white panel with a black border, as on Spanish conventional roads,
   with Madrid and Lanzarote (Iván's home island; the plane pictogram marks that you fly there).
   Painted on a canvas and built here, so nothing to download and no credit needed. Two of them, half a lap apart, wrap every SPAN metres. */
import * as T from 'three';
import { canvasTex, shadowsOn } from './utiles.js';
import { GROUND, edgeX } from './medidas.js';

var SPAN = 336, ZS = [-56, -224];  /* evenly spaced, clear of the guardrail stretches in mobiliario.js */
var PW = 2.4, PH = 1.2, BOTTOM = 1.7;  /* panel width and height, height of its lower edge above the road (m) */

/* a side-on airliner, nose to the right, drawn in a box of size s centred at (cx, cy) */
function plane(x, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.scale(s / 100, s / 100); x.rotate(-0.35);
  x.beginPath();
  x.moveTo(-46, -4); x.lineTo(40, -4); x.quadraticCurveTo(50, 0, 40, 4); x.lineTo(-46, 4); x.closePath();  /* fuselage */
  x.moveTo(-4, -2); x.lineTo(-22, -40); x.lineTo(-12, -40); x.lineTo(16, -2); x.closePath();             /* wing, far */
  x.moveTo(-4, 2); x.lineTo(-22, 40); x.lineTo(-12, 40); x.lineTo(16, 2); x.closePath();                 /* wing, near */
  x.moveTo(-46, -2); x.lineTo(-52, -18); x.lineTo(-44, -18); x.lineTo(-34, -2); x.closePath();           /* tail */
  x.moveTo(-46, 2); x.lineTo(-52, 18); x.lineTo(-44, 18); x.lineTo(-34, 2); x.closePath();
  x.fill(); x.restore();
}

export function createSign(scene, sliders) {
  var face = canvasTex(1024, 512, function (x, w, h) {
    function rrect(m, r) {
      x.beginPath(); x.moveTo(m + r, m); x.arcTo(w - m, m, w - m, h - m, r); x.arcTo(w - m, h - m, m, h - m, r);
      x.arcTo(m, h - m, m, m, r); x.arcTo(m, m, w - m, m, r); x.closePath();
    }
    x.fillStyle = '#f4f3ee'; x.fillRect(0, 0, w, h);
    x.lineWidth = 18; x.strokeStyle = '#111'; rrect(24, 34); x.stroke();
    x.fillStyle = '#111'; x.textBaseline = 'middle';
    x.font = '700 100px "Helvetica Neue", Arial, sans-serif';
    var rows = [['Madrid', '54', h * 0.31], ['Lanzarote', '1.612', h * 0.69]];
    rows.forEach(function (r) {
      x.textAlign = 'left'; x.fillText(r[0], 82, r[2]);
      x.textAlign = 'right'; x.fillText(r[1], w - 82, r[2]);
    });
    var gapL = 82 + x.measureText('Lanzarote').width, gapR = w - 82 - x.measureText('1.612').width;
    plane(x, (gapL + gapR) / 2, h * 0.69, Math.min(88, gapR - gapL - 16));  /* in the gap between name and distance */
    x.fillRect(70, h / 2 - 3, w - 140, 6);  /* rule between the two destinations */
    for (var k = 0; k < 260; k++) {  /* a little road dust, heavier at the bottom */
      x.fillStyle = 'rgba(90,78,60,' + (0.02 + Math.random() * 0.04).toFixed(3) + ')';
      var yy = h * Math.sqrt(Math.random());
      x.fillRect(Math.random() * w, yy, 2 + Math.random() * 6, 2 + Math.random() * 6);
    }
  });
  var faceMat = new T.MeshStandardMaterial({ map: face, roughness: 0.5, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });  /* drawn over the backing box, no flicker at a distance */
  var backMat = new T.MeshStandardMaterial({ color: 0x8c9196, metalness: 0.6, roughness: 0.55, envMapIntensity: 0.4 });
  var postMat = new T.MeshStandardMaterial({ color: 0x9a9fa4, metalness: 0.7, roughness: 0.5, envMapIntensity: 0.45 });

  var y0 = GROUND + BOTTOM + PH / 2;
  var frontGeo = new T.PlaneGeometry(PW, PH), backGeo = new T.BoxGeometry(PW, PH, 0.04);
  var postGeo = new T.CylinderGeometry(0.045, 0.045, BOTTOM + PH, 12).translate(0, (BOTTOM + PH) / 2, 0);
  ZS.forEach(function (z) {
    var g = new T.Group();
    var front = new T.Mesh(frontGeo, faceMat); front.position.set(0, y0, 0.035); g.add(front);
    var back = new T.Mesh(backGeo, backMat); back.position.set(0, y0, 0); g.add(back);
    [-PW * 0.32, PW * 0.32].forEach(function (px) {
      var p = new T.Mesh(postGeo, postMat); p.position.set(px, GROUND - 0.05, -0.07); g.add(p);
    });
    g.position.set(edgeX(1, 2.1) + PW / 2, 0, z);
    g.rotation.y = -0.12;  /* turned slightly toward the oncoming rider */
    shadowsOn(g); scene.add(g); sliders.add(g, 8, SPAN);  });
}
