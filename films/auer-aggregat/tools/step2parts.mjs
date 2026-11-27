// STEP assembly → one binary of named parts in film coordinates (mm).
// STEP axes (SolidWorks export): y = main axis (motor −y, tank +y), z up, x across.
// Film axes: x = main axis (motor +x), y up (floor = tank bottom), z = −x_step (right-handed).
// usage: node tools/step2parts.mjs cad/<file>.STEP data/parts   → parts.json + parts.bin
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(new URL('../cadtool/', import.meta.url));
const occt = await require('occt-import-js')();
const r = occt.ReadStepFile(new Uint8Array(fs.readFileSync(process.argv[2])), { linearUnit: 'millimeter', linearDeflectionType: 'absolute_value', linearDeflection: 0.04, angularDeflection: 0.12 });
const FLOOR = 61.0;   // tank underside, z in the STEP
const owner = []; for (const c of r.root.children[0].children) { const all = n => [...n.meshes, ...n.children.flatMap(all)]; for (const i of all(c)) owner[i] = c.name; }
const parts = [], bufs = []; let off = 0;
r.meshes.forEach((m, i) => {
  const p = m.attributes.position.array, n = m.attributes.normal.array, idx = m.index.array, nv = p.length / 3;
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3);
  for (let k = 0; k < nv; k++) {
    P[k*3] = -p[k*3+1]; P[k*3+1] = p[k*3+2] - FLOOR; P[k*3+2] = -p[k*3];
    N[k*3] = -n[k*3+1]; N[k*3+1] = n[k*3+2]; N[k*3+2] = -n[k*3];
  }
  const I = new Uint32Array(idx);
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (let k = 0; k < P.length; k += 3) for (let j = 0; j < 3; j++) { b[j] = Math.min(b[j], P[k+j]); b[j+3] = Math.max(b[j+3], P[k+j]); }
  parts.push({ i, name: m.name || '', part: owner[i] || m.name, nv, ni: I.length, off, bb: b.map(v => +v.toFixed(2)) });
  for (const a of [P, N, I]) { bufs.push(Buffer.from(a.buffer)); off += a.byteLength; }
});
fs.writeFileSync(process.argv[3] + '.bin', Buffer.concat(bufs));
fs.writeFileSync(process.argv[3] + '.json', JSON.stringify(parts, null, 1));
console.log(parts.length, 'meshes', (off / 1e6).toFixed(1), 'MB', parts.reduce((s, p) => s + p.ni / 3, 0), 'tris');
