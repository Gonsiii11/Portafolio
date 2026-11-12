/* ---------- 3D scene: first-person view from the saddle ----------
   Builds the renderer and every part of the scene, then runs the frame loop. Returns the small API the page uses
   (setExt, setView, setModeVisual), or null when WebGL is not available. */
import * as T from 'three';
import { reduce } from '../config.js';
import { createLoader } from './carga.js';
import { createCurves } from './curvas.js';
import { createSky } from './cielo.js';
import { createRoad } from './carretera.js';
import { createTerrain } from './terreno.js';
import { createSliders } from './deslizables.js';
import { createRoadside } from './mobiliario.js';
import { createForest } from './bosque.js';
import { createRocks } from './rocas.js';
import { createLights } from './luces.js';
import { createBike } from '../moto/moto.js';
import { createCamera } from '../camara/camara.js';
import { createControls } from '../camara/controles.js';

export function createScene(page) {
  var canvas = document.getElementById('gl'), renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;  /* refreshed once per frame below, shared by the mirror pass */
  renderer.setClearColor(0x0B0D10, 1);

  var loader = createLoader(renderer);
  var scene = new T.Scene();
  var curves = createCurves(scene);

  /* the world, roughly back to front */
  var terrain = null;
  var sky = createSky(scene, renderer, loader, function () { terrain.setDaylight(); });
  var road = createRoad(scene, loader);
  terrain = createTerrain(scene, loader);
  var sliders = createSliders(terrain.groundY);
  createRoadside(scene, sliders);
  var forest = createForest(scene, loader);
  createRocks(scene, loader, sliders, terrain.groundY);
  sky.setSunsetEnvironment();
  var lights = createLights(scene);

  /* the bike, the camera that rides it, and the input */
  var bike = createBike(scene, loader);
  scene.updateMatrixWorld(true);
  var cam = createCamera(renderer, bike.rig), camera = cam.camera, view = cam.view;
  createControls(canvas, cam, bike, page);

  var speed = 0, last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;

    /* the road and the scenery slide toward the rider */
    var spT = reduce ? 0 : (page.state.boot ? 40 : (view.ext ? 0 : view.speedT));
    speed += (spT - speed) * (1 - Math.exp(-dt * 2));
    var step = speed * dt;
    if (step > 0) {
      road.advance(step);
      terrain.advance(step);
      curves.advance(step);
      forest.advance(step);
      sliders.advance(step);
    }

    cam.update(now, dt, speed);
    sky.update(camera);
    bike.updateGlow(dt);
    bike.updateDash(dt, { speedMs: speed, travelledM: curves.travelled() });

    if (!reduce) terrain.setTime(now / 1000);
    curves.updateLean(speed, dt);
    curves.bendScene(bike.rig);
    lights.update(camera);
    renderer.shadowMap.needsUpdate = true;
    bike.renderMirrors(renderer, scene);
    renderer.render(scene, camera);

    cam.updatePins();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* the dash is drawn with web fonts: redraw it once they are in */
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 20px "JetBrains Mono"')])
      .then(function () { bike.dash.dirty = true; }, function () {});
  }

  return {
    setExt: function (on) { cam.setExt(on); },
    setView: function (id, viewKey) { cam.setView(id, viewKey); },
    setModeVisual: function () {}  /* the TFT no longer shows the project filter */
  };
}
