/* Things that slide past the rider one by one (guardrails, delineator posts, rocks): each moves toward +z and, once it
   is behind zMax, jumps back `span` metres. With `lift` set, it also follows the ground height as it moves. */
export function createSliders(groundY) {
  var list = [];
  return {
    add: function (obj, zMax, span, lift) { list.push({ obj: obj, zMax: zMax, span: span, lift: lift }); },
    advance: function (step) {
      for (var i = 0; i < list.length; i++) {
        var po = list[i].obj; po.position.z += step;
        if (po.position.z > list[i].zMax) po.position.z -= list[i].span;
        if (list[i].lift !== undefined) po.position.y = groundY(po.position.x, po.position.z) + list[i].lift;
      }
    }
  };
}
