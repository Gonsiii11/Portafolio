/* Sky: a painted sunset (sky, sun, mountains) that shows straight away, replaced by the real panorama when it loads;
   plus the scene's reflections. onDaylight() is called once the panorama is in (the terrain re-tints itself). */
import * as T from 'three';
import { canvasTex } from './utiles.js';
import { GROUND, HAZE, HAZE_DAY } from './medidas.js';

export function createSky(scene, renderer, loader, onDaylight) {
  var skyTex = canvasTex(8, 512, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04060d'); g.addColorStop(0.3, '#0f1a35'); g.addColorStop(0.42, '#3b3463');
    g.addColorStop(0.47, '#b0503f'); g.addColorStop(0.497, '#ff8f57'); g.addColorStop(0.5, '#6a3b3f');
    g.addColorStop(0.56, '#1a1216'); g.addColorStop(1, '#0b0d10');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  var sky = new T.Mesh(new T.SphereGeometry(400, 32, 16), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -2; sky.userData.noBend = true; scene.add(sky);

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
  mtn.position.y = GROUND + 14; mtn.userData.noBend = true; scene.add(mtn);

  scene.fog = new T.Fog(HAZE, 30, 260);

  /* real panorama (Poly Haven «Rolling Hills», CC0), pre-rotated so the mountain range lies ahead and the sun sits
     behind on the left (u = 0.85), lighting the landscape from the side; the band above the horizon is stretched ×2.4 so the mountains stand taller
     (master: herramientas/hdr2jpg.py rolling_hills_4k.hdr rolling_hills_4096.png 1.0 4096 0.85 2.4 35, then variantes_web.py).
     Until it loads (or if it fails) the painted sky above stays in place. */
  var pano = null;
  loader.loadTiered('fondo/cielo_1k.webp', loader.TIER > 1 ? 'fondo/cielo_4k.webp' : 'fondo/cielo_2k.webp', true, function (tex) {
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.wrapT = T.ClampToEdgeWrapping;
    if (pano) { pano.material.map = tex; pano.material.needsUpdate = true; return; }  /* the larger sky just swaps in */
    /* drawn on a sphere instead of scene.background so it skips the renderer's ACES tone mapping:
       the image is already tone-mapped, and mapping it twice washed out the mountains.
       scale.x = -1 and the half turn make the sphere's UVs match three.js equirect (u = 0.25 straight ahead) */
    pano = new T.Mesh(new T.SphereGeometry(650, 64, 32), new T.MeshBasicMaterial({ map: tex, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    pano.scale.x = -1; pano.rotation.y = Math.PI; pano.renderOrder = -2; pano.userData.noBend = true; scene.add(pano);  /* the sky and far mountains stay put: no bend, no lean */
    scene.remove(sky); scene.remove(mtn); scene.remove(sun);  /* the photo has its own sun */
    scene.fog.color.setHex(HAZE_DAY); scene.fog.near = 60; scene.fog.far = 600;
    onDaylight();
    try {  /* reflections come from the small sky: plenty for blurred lighting, and cheap */
      var pmE = new T.PMREMGenerator(renderer);
      scene.environment = pmE.fromEquirectangular(tex).texture;
      pmE.dispose();
    } catch (e) {}
  });

  return {
    /* reflections until the panorama arrives: the sunset sky, so paint and metal pick up warm light */
    setSunsetEnvironment: function () {
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
    },
    /* the painted sky follows the camera */
    update: function (camera) { sky.position.copy(camera.position); }
  };
}
