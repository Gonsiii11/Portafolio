/* Measurements shared across the scene (metres). Bike model space: front = -z, wheels touch y = -0.482. */

export var GROUND = -0.97;                  /* world height of the road surface */
export var BIKE_Y = GROUND + 0.482;         /* the bike group sits here so its wheels touch the road */
export var HAZE = 0x6a3b3f, HAZE_DAY = 0x8a8170;

/* road: 7 m wide, centred 1.75 m left of the bike (the bike rides in the right lane) */
export var ROAD_W = 7, ROAD_LEN = 360, ROAD_CX = -1.75;
export var EDGE_R = ROAD_CX + ROAD_W / 2, EDGE_L = ROAD_CX - ROAD_W / 2;
export function edgeX(side, off) { return side > 0 ? EDGE_R + off : EDGE_L - off; }

/* terrain: heights repeat every TER_P metres along z, so the mesh slides with the road and jumps back one period */
export var TER_P = 60, TER_W = 800, TER_L = 480, TER_SEG = 160, TER_Z0 = 24 - TER_L / 2;

/* height of the terrain above GROUND at terrain-local (x, z): a flat shoulder beside the road, then banks and
   rolling ground rising to both sides */
export function terH(x, z) {
  var d = Math.abs(x - ROAD_CX) - ROAD_W / 2 - 2.5;
  if (d <= 0) return 0;
  var s = Math.min(1, d / 16); s = s * s * (3 - 2 * s);
  var w = Math.PI * 2 / TER_P;
  var n = Math.sin(z * w + x * 0.07) * 1.6 + Math.sin(z * w * 2 - x * 0.19 + 1.3) * 0.7 + Math.sin(z * w * 3 + x * 0.41 + 2.1) * 0.3;
  return s * (d * 0.05 + n * (0.35 + Math.min(1.4, d / 40)));
}

/* touch screens get lighter settings (fewer instances, smaller shadow map, mirrors every other frame) */
export var LOW_GPU = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
