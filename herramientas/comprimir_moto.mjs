// Comprime la geometría de la moto con los códecs de meshoptimizer (vértices v0, índices v1), que decodifica
// el MeshoptDecoder que trae three r128 (three/examples/jsm/libs/meshopt_decoder.module.js, meshoptimizer 0.14).
//
// Entrada: modelos-fuente/moto/bike_raw.json + bike_raw.bin (formato propio sin comprimir: posiciones u16×3,
//          normales i8×4, UV u16×2, índices u16; ver buildBike en src/main.js).
// Salida:  public/bike/bike.json + bike.bin con "codec": "meshopt". Cada primitiva guarda desplazamiento y longitud
//          de cada bloque comprimido. Las posiciones se rellenan a u16×4 porque el códec pide un paso múltiplo de 4.
// Al terminar, decodifica todo con el decodificador de three r128 y lo compara con el original.
//
// Uso (desde la raíz del proyecto):  node herramientas/comprimir_moto.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { MeshoptEncoder } from 'meshoptimizer/meshopt_encoder.module.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const meta = JSON.parse(readFileSync('modelos-fuente/moto/bike_raw.json', 'utf8'));
const raw = readFileSync('modelos-fuente/moto/bike_raw.bin');
const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const chunks = [];
let off = 0;
function put(bytes) {
  const o = off;
  chunks.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  off += bytes.byteLength;
  const pad = (4 - (off % 4)) % 4;  // keep every block 4-byte aligned
  if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  return [o, bytes.byteLength];
}

const out = { codec: 'meshopt', materials: meta.materials, prims: [] };
const checks = [];
for (const p of meta.prims) {
  const n = p.cnt;
  const q = new Uint16Array(buf, p.po, n * 3), nr = new Int8Array(buf, p.no, n * 4), uq = new Uint16Array(buf, p.uo, n * 2);
  const idx = new Uint32Array(new Uint16Array(buf, p.io, p.ic));
  const [remap, unique] = MeshoptEncoder.reorderMesh(idx, true, true);  // idx is rewritten in place
  const P = new Uint16Array(unique * 4), N = new Int8Array(unique * 4), U = new Uint16Array(unique * 2);
  for (let k = 0; k < n; k++) {
    const r = remap[k];
    if (r === 0xffffffff) continue;  // vertex not used by any triangle
    P[r * 4] = q[k * 3]; P[r * 4 + 1] = q[k * 3 + 1]; P[r * 4 + 2] = q[k * 3 + 2];
    N.set(nr.subarray(k * 4, k * 4 + 4), r * 4);
    U[r * 2] = uq[k * 2]; U[r * 2 + 1] = uq[k * 2 + 1];
  }
  const I16 = new Uint16Array(idx);
  const ep = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(P.buffer), unique, 8);
  const en = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(N.buffer), unique, 4);
  const eu = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(U.buffer), unique, 4);
  const ei = MeshoptEncoder.encodeIndexBuffer(new Uint8Array(I16.buffer), p.ic, 2);
  const o = { n: p.n, m: p.m, cnt: unique, ic: p.ic, mn: p.mn, rg: p.rg, umn: p.umn, urg: p.urg };
  [o.po, o.pl] = put(ep); [o.no, o.nl] = put(en); [o.uo, o.ul] = put(eu); [o.io, o.il] = put(ei);
  out.prims.push(o);
  checks.push({ o, P, N, U, I16 });
}
const bin = Buffer.concat(chunks);
writeFileSync('public/bike/bike.bin', bin);
writeFileSync('public/bike/bike.json', JSON.stringify(out));

// round trip with three r128's decoder
const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
for (const { o, P, N, U, I16 } of checks) {
  const dp = new Uint8Array(o.cnt * 8), dn = new Uint8Array(o.cnt * 4), du = new Uint8Array(o.cnt * 4), di = new Uint8Array(o.ic * 2);
  MeshoptDecoder.decodeVertexBuffer(dp, o.cnt, 8, new Uint8Array(ab, o.po, o.pl));
  MeshoptDecoder.decodeVertexBuffer(dn, o.cnt, 4, new Uint8Array(ab, o.no, o.nl));
  MeshoptDecoder.decodeVertexBuffer(du, o.cnt, 4, new Uint8Array(ab, o.uo, o.ul));
  MeshoptDecoder.decodeIndexBuffer(di, o.ic, 2, new Uint8Array(ab, o.io, o.il));
  const same = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b.buffer, b.byteOffset, b.byteLength)) === 0;
  /* the index codec may rotate a triangle's corners (abc -> bca); winding is kept, so that counts as equal */
  const sameTris = (a, b) => {
    const d = new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2);
    for (let t = 0; t < b.length; t += 3) {
      const x = b[t], y = b[t + 1], z = b[t + 2], p = d[t], q = d[t + 1], r = d[t + 2];
      if (!((p === x && q === y && r === z) || (p === y && q === z && r === x) || (p === z && q === x && r === y))) return false;
    }
    return true;
  };
  const bad = [['pos', dp, P], ['nor', dn, N], ['uv', du, U], ['idx', di, I16]].filter(([k, d, s]) => !(k === 'idx' ? sameTris(d, s) : same(d, s))).map(([k]) => k);
  if (bad.length) {
    const [k, d, s] = [['pos', dp, P], ['nor', dn, N], ['uv', du, U], ['idx', di, I16]].find(x => x[0] === bad[0]);
    const sb = new Uint8Array(s.buffer, s.byteOffset, s.byteLength); let first = -1;
    for (let i = 0; i < d.length; i++) if (d[i] !== sb[i]) { first = i; break; }
    throw new Error(`round trip mismatch in ${o.n}: ${bad.join(',')} (cnt ${o.cnt}, first diff at byte ${first} of ${d.length})`);
  }
}
console.log(`ok: ${meta.prims.length} primitives, ${(raw.length / 1024) | 0} KB -> ${(bin.length / 1024) | 0} KB (round trip verified)`);
