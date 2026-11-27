// Every mesh with its name, colour, triangle count and bounding box. usage: node tools/step_meshes.mjs <file.step>
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(new URL('../cadtool/', import.meta.url));
const occt = await require('occt-import-js')();
const r = occt.ReadStepFile(new Uint8Array(fs.readFileSync(process.argv[2])), { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.002, angularDeflection: 0.3 });
r.meshes.forEach((m, i) => { const p = m.attributes.position.array, b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (let k = 0; k < p.length; k += 3) for (let j = 0; j < 3; j++) { b[j] = Math.min(b[j], p[k + j]); b[j + 3] = Math.max(b[j + 3], p[k + j]); }
  console.log(i, JSON.stringify(m.name), m.color ? m.color.map(c => c.toFixed(2)).join(',') : '-', m.brep_faces ? m.brep_faces.length : '', m.index.array.length / 3, JSON.stringify(b.map(v => +v.toFixed(1)))); });
