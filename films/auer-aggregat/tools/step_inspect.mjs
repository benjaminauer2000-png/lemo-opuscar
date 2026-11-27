// List the STEP assembly tree: node names, mesh counts, bounding boxes (mm). usage: node tools/step_inspect.mjs <file.step>
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(new URL('../cadtool/', import.meta.url));
const occt = await require('occt-import-js')();
const r = occt.ReadStepFile(new Uint8Array(fs.readFileSync(process.argv[2])), { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.002, angularDeflection: 0.3 });
console.log('success', r.success, 'meshes', r.meshes.length);
const bb = ids => { const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; let tri = 0; for (const i of ids) { const p = r.meshes[i].attributes.position.array; tri += r.meshes[i].index.array.length / 3; for (let k = 0; k < p.length; k += 3) for (let j = 0; j < 3; j++) { b[j] = Math.min(b[j], p[k + j]); b[j + 3] = Math.max(b[j + 3], p[k + j]); } } return [b.map(v => +v.toFixed(1)), tri]; };
const all = n => [...n.meshes, ...n.children.flatMap(all)];
function walk(n, d) { const ids = all(n); const [b, tri] = ids.length ? bb(ids) : [[], 0]; console.log('  '.repeat(d) + JSON.stringify(n.name), 'meshes', ids.length, 'tri', tri, 'bb', JSON.stringify(b), n.meshes.length ? 'colors ' + n.meshes.map(i => JSON.stringify(r.meshes[i].color)).slice(0, 3).join(' ') : ''); for (const c of n.children) walk(c, d + 1); }
walk(r.root, 0);
