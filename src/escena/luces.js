/* Lights: soft bluish sky light, the sun (with shadows), a faint fill and the dash glow. */
import * as T from 'three';
import { CYAN } from '../config.js';
import { GROUND, LOW_GPU } from './medidas.js';

export function createLights(scene) {
  scene.add(new T.HemisphereLight(0x9db4e0, 0x4a4030, 0.38));  /* sky light: soft and bluish, fills the shadows */
  /* the sun, from the photo's sun (behind on the left, low). Its shadow box (70 m square) is re-centred on the
     rider every frame, a little ahead, so near objects always get crisp shadows. */
  var SUN_DIR = new T.Vector3(-12, 8, 16).normalize();
  var sunLight = new T.DirectionalLight(0xffb37e, 3.2);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(LOW_GPU ? 1024 : 4096, LOW_GPU ? 1024 : 4096);
  var sc0 = sunLight.shadow.camera; sc0.left = -35; sc0.right = 35; sc0.top = 35; sc0.bottom = -35; sc0.near = 1; sc0.far = 160;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.03; sunLight.shadow.radius = 3;
  scene.add(sunLight); scene.add(sunLight.target);
  var fill = new T.DirectionalLight(0xa8bcff, 0.22); fill.position.set(1.5, 6, 6); scene.add(fill);
  var dashLight = new T.PointLight(CYAN, 0.5, 0.9); dashLight.position.set(0, GROUND + 1.05, -0.35); scene.add(dashLight);

  return {
    /* keep the shadow box around the camera */
    update: function (camera) {
      sunLight.target.position.set(camera.position.x, GROUND, camera.position.z - 18);
      sunLight.position.copy(sunLight.target.position).addScaledVector(SUN_DIR, 80);
    }
  };
}
