// AUER Hydraulics: 12 V single-acting power unit, exploded. render(t) draws one frame; everything is a function of t.
// Units: mm. World x = the unit's main axis (motor +x, tank −x), y up, z toward the viewer's default side.
// Geometry from the catalogue's dimension drawings (FACTS.md); unlisted details (relay, caps, cable) are estimated and never dimensioned.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';
import * as TL from './timeline.js';

const { T, DUR, UP, RET, DOWN, UPDUR, DOWNDUR, GAP, CAM, SIZES, SIZE_T } = TL;
const W = 1920, H = 1080;
const Q = new URLSearchParams(location.search);
const AX = 72;   // manifold axis height above the floor (tank underside = floor)

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
const SS = Number(Q.get('ss') || 2);
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
renderer.domElement.style.width = W + 'px'; renderer.domElement.style.height = H + 'px';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, W / H, 20, 8000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SS, ao: true, aoRadius: 14, aoThickness: 10, aoScale: 1.4, aoAmt: .6 });
post.bloom.strength = .32; post.bloom.radius = .45; post.bloom.threshold = 2.4;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .08;
{
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const g = c.getContext('2d');
  const gr = g.createRadialGradient(900, 470, 60, 960, 540, 1250);
  gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#232528'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
scene.environmentIntensity = .34; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.6);
key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
Object.assign(key.shadow.camera, { left: -650, right: 650, top: 650, bottom: -650, near: 50, far: 2500 });
key.shadow.bias = -.0004; key.shadow.normalBias = .6; key.shadow.radius = 6; key.shadow.blurSamples = 16;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 3.6, 900, 260); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .25, 900, 900); scene.add(top);
const pumpLight = new THREE.RectAreaLight('#ffe9d2', 0, 300, 200); scene.add(pumpLight);   // practical on the pump while it stands alone
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .18));

// ---------- materials ----------
const M = {
  hdpe: new THREE.MeshPhysicalMaterial({ color: '#e9e7e1', roughness: .5, sheen: .4, sheenRoughness: .6, sheenColor: '#ffffff', clearcoat: .15, clearcoatRoughness: .5 }),
  zinc: new THREE.MeshPhysicalMaterial({ color: '#b9bdc2', roughness: .34, metalness: 1, clearcoat: .2, clearcoatRoughness: .3 }),
  cast: new THREE.MeshStandardMaterial({ color: '#a7abb0', roughness: .55, metalness: .75 }),
  alu: new THREE.MeshPhysicalMaterial({ color: '#d7dade', roughness: .3, metalness: 1, clearcoat: .1 }),
  aluDark: new THREE.MeshStandardMaterial({ color: '#9da2a8', roughness: .4, metalness: 1 }),
  pumpBody: new THREE.MeshStandardMaterial({ color: '#a4a8ad', roughness: .45, metalness: .9 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c4c7cb', roughness: .34, metalness: 1 }),
  bolt: new THREE.MeshStandardMaterial({ color: '#8d9298', roughness: .3, metalness: 1 }),
  black: new THREE.MeshPhysicalMaterial({ color: '#2a2b2e', roughness: .45, clearcoat: .2 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#232325', roughness: .85 }),
  red: new THREE.MeshPhysicalMaterial({ color: '#c3141f', roughness: .45, clearcoat: .3, clearcoatRoughness: .4 }),
  redSoft: new THREE.MeshPhysicalMaterial({ color: '#c01a22', roughness: .7, sheen: .3 }),
  green: new THREE.MeshPhysicalMaterial({ color: '#23a07a', roughness: .4, clearcoat: .3 }),
  mesh: new THREE.MeshStandardMaterial({ color: '#7f858c', roughness: .5, metalness: .8 }),
  stickerY: new THREE.MeshStandardMaterial({ color: '#f1c232', roughness: .6 }),
  stickerO: new THREE.MeshStandardMaterial({ color: '#ec6a2a', roughness: .6 }),
  plate: new THREE.MeshStandardMaterial({ color: '#c8cbcf', roughness: .35, metalness: .9 }),
  copper: new THREE.MeshStandardMaterial({ color: '#b87333', roughness: .35, metalness: 1 }),
};
const shadowy = m => { m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
const cyl = (r, len, mat, seg = 64, r2 = r) => { const g = new THREE.CylinderGeometry(r2, r, len, seg); g.rotateZ(-Math.PI / 2); return new THREE.Mesh(g, mat); };   // along +x, r at −x end
const cylY = (r, h, mat, seg = 48, r2 = r) => new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat);
const box = (w, h, d, mat, rad = 0) => new THREE.Mesh(rad ? new RoundedBoxGeometry(w, h, d, 4, rad) : new THREE.BoxGeometry(w, h, d), mat);
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const hex = (r, h, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), mat);
const anchor = (grp, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); grp.add(o); return o; };

const root = new THREE.Group(); scene.add(root);
const A = {};   // label anchors
const anchorAt = (grp, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); grp.add(o); return o; };

// ---------- the customer's SolidWorks assembly (cad/E122021V12OD8LKW-G14-ZG.STEP → data/parts.*, tools/step2parts.mjs) ----------
const META = await (await fetch('data/parts.json')).json();
const BUF = await (await fetch('data/parts.bin')).arrayBuffer();
const EXP = await (await fetch('data/explode.json')).json();   // per mesh: the customer's own explode vector (exploded STEP − assembled STEP)
const MAT_OF = i => {
  const p = META[i], n = p.name;
  if (p.part.startsWith('500208')) return M.alu;
  if (p.part.includes('Kunststofftank')) return M.hdpe;
  if (p.part.startsWith('Belüftungsfilter') || p.part.startsWith('Verschlussschraube')) return M.red;
  if (p.part.startsWith('M6x12') || p.part.startsWith('M8x80') || n.startsWith('Schraube')) return M.bolt;
  if (p.part === 'CBT-F20') return i === 27 ? M.pumpBody : M.steel;
  if (p.part === 'Ansaugfilter') return M.mesh;
  if (p.part.startsWith('Dichtungsring')) return M.rubber;
  if (n.startsWith('DC12V')) return M.zinc;
  if (n === 'Relais') return M.zinc;
  if (n.startsWith('16FC')) return M.redSoft;
  if (n.startsWith('Kabel') || n.startsWith('Abdeckung')) return M.rubber;
  if (p.part.startsWith('12V')) return M.copper;
  if (n === 'Magnetspule EW' || n === 'Magnetschalter') return M.black;
  if (p.part.startsWith('Druckbegrenzung')) return i === 5 ? M.zinc : M.steel;
  return M.steel;   // valves, nut, coupling, pipes
};
const GROUPS = {
  pump: [25, 26, 27], bolts: [31, 32], mf: [0], seal: [11], coup: [24], rv: [1, 2, 3, 4, 5, 6, 7, 8, 10], cv: [9], sv: [33, 34], coil: [35, 36, 37],
  ret: [28], elbow: [29], filter: [30], motor: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], tank: [38, 39, 40, 41, 42, 43, 44, 45],
};
const G = {}, MESH = [], ORIG = {};
for (const [k, ids] of Object.entries(GROUPS)) {
  G[k] = new THREE.Group(); root.add(G[k]);
  for (const i of ids) {
    const p = META[i];
    const P = new Float32Array(BUF, p.off, p.nv * 3), N = new Float32Array(BUF, p.off + p.nv * 12, p.nv * 3), I = new Uint32Array(BUF, p.off + p.nv * 24, p.ni);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setIndex(new THREE.BufferAttribute(I, 1));
    const m = new THREE.Mesh(g, MAT_OF(i)); m.castShadow = m.receiveShadow = true; G[k].add(m); MESH[i] = m;
  }
}
// pump sizes: the gear section stretches behind a cut plane, the rear cover, bolt heads, suction elbow and filter move with it
const CUT = -60;
for (const i of [25, 26, 27, 31, 32]) ORIG[i] = MESH[i].geometry.attributes.position.array.slice();
let lastL = 85;
function setPumpLength(L) {
  if (Math.abs(L - lastL) < 1e-3) return; lastL = L;
  const d = L - 85;
  for (const i of [25, 26, 27, 31, 32]) {
    const a = MESH[i].geometry.attributes.position, o = ORIG[i];
    for (let k = 0; k < o.length; k += 3) a.array[k] = o[k] < CUT ? o[k] - d : o[k];
    a.needsUpdate = true; MESH[i].geometry.computeBoundingSphere();
  }
}
const PUMP = { x0: -105.84, x1: -16.34, top: 98.89, z: -3.5, y: 58.3 };
A.pump = anchorAt(G.pump, -60, PUMP.top, -10);
A.mf = anchorAt(G.mf, -4, 138.5, 40);
A.motor = anchorAt(G.motor, 100, 129, -6);
A.tank = anchorAt(G.tank, -200, 180, -50);
A.P = anchorAt(G.mf, 1.2, 138.5, -11.1);
A.CV = anchorAt(G.cv, 1, 49, -72);
A.SV = anchorAt(G.coil, 9, 112, -112);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.ShadowMaterial({ color: '#000000', opacity: .42 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// ---------- the oil: glowing lines along the real path (catalogue p. 24, circuit A101/A103) ----------
const ACC = new THREE.Color('#4aa3ff');
const oilMat = new THREE.MeshBasicMaterial({ color: ACC.clone().multiplyScalar(2.2), transparent: true, depthWrite: false, depthTest: false });
const oilMat2 = oilMat.clone();
function oilTube(points) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .1);
  const g = new THREE.TubeGeometry(curve, 240, 3.0, 10); const m = new THREE.Mesh(g, oilMat); m.renderOrder = 10;
  m.userData = { n: g.index.count, curve }; return m;
}
// suction: filter on the tank floor → elbow → pump inlet (rear) → pump → manifold → check valve → P (G 1/4, top) → to the tipper cylinder
const flowUp = oilTube([[-159, 18, -19], [-159, 40, -19], [-150, 59, -19], [-125, 59, -19], [-100, 59, -12], [-60, 58, -4], [-20, 58, -4], [-4, 52, -20], [1, 49, -42], [1, 80, -30], [1.2, 118, -11.1], [1.2, 138.5, -11.1], [1.2, 260, -11.1]]);
// lowering: back from the cylinder through P → solenoid valve (SV) and throttle → T → return pipe into the tank
const flowDown = oilTube([[1.2, 260, -11.1], [1.2, 138.5, -11.1], [1, 110, -28], [1, 91, -52], [1, 91, -80], [-2, 88, -40], [-6, 90, 10], [-13, 90, 39], [-80, 90, 39], [-140, 90, 39], [-142, 50, 39], [-142, 22, 39]]);
flowDown.material = oilMat2;
root.add(flowUp, flowDown);
const head = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: ACC.clone().multiplyScalar(4), transparent: true, depthTest: false })); head.renderOrder = 11; root.add(head);
const cvGlow = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: ACC.clone().multiplyScalar(3), transparent: true, depthTest: false })); cvGlow.renderOrder = 11; cvGlow.position.set(1, 49, -56); root.add(cvGlow);

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const IN = { mf: [T.mfIn, [520, 0, 0]], seal: [T.mfIn, [520, 0, 0]], coup: [T.mfIn, [520, 0, 0]], rv: [T.mfIn, [520, 0, 0]], cv: [T.mfIn, [520, 0, 0]], sv: [T.mfIn, [520, 0, 0]], coil: [T.mfIn, [520, 0, 0]],
  ret: [T.mfIn + .3, [-700, 0, 0]], elbow: [T.mfIn + .3, [-700, 0, 0]], filter: [T.mfIn + .3, [-700, 0, 0]], motor: [T.motorIn, [900, 0, 0]], tank: [T.tankIn, [-900, 0, 0]] };
function inOff(k, t) {   // fly-in at the start: arrive with a hard ease-out and a 1 mm mechanical settle
  const e = IN[k]; if (!e) return [0, 0, 0];
  const s = seg(t, e[0] - .8, e[0]), f = 1 - eo(s);
  const settle = t > e[0] && t < e[0] + .25 ? -1.2 * Math.sin(seg(t, e[0], e[0] + .25) * Math.PI) : 0;
  return e[1].map((v, i) => v * f + (i === 0 ? settle * Math.sign(e[1][0]) : 0));
}
// explode vectors: the customer's own, per group (the tank's screws, breather and plug travel with the tank)
const VEC = {}; for (const [k, ids] of Object.entries(GROUPS)) VEC[k] = k === 'tank' ? EXP[38] : EXP[ids[0]];
// apart from UP[k] to the dive; back for the flow (all but tank and motor) at the dive; tank and motor close at the end
function layerE(k, t) {
  if (!(k in UP)) return 0;
  const a = pop(seg(t, UP[k], UP[k] + UPDUR));
  const back = k in RET ? eio(seg(t, RET[k], RET[k] + .9)) : 0;
  const down = k in DOWN ? eio(seg(t, DOWN[k], DOWN[k] + DOWNDUR)) : 0;
  return a * (1 - back) * (1 - down);
}
const gapE = t => eio(seg(t, GAP.open[0], GAP.open[1])) * (1 - eio(seg(t, GAP.close[0], GAP.close[1])));
const FL = { tank: 0, coil: 1.1, motor: 2.2, rv: 3.0, cv: 3.7, sv: 4.4, pump: 5.1, elbow: 5.8, filter: .6, ret: 1.6, bolts: 2.6, coup: 3.3, seal: 4.0 };
const floatAmt = t => 1 - seg(t, T.dive - .6, T.dive) + seg(t, T.pull - .2, T.pull + .4);
function layerPos(k, t) {
  const e = layerE(k, t), o = VEC[k], i = inOff(k, t);
  const f = (k in FL) ? e * e * 1.4 * Math.sin(t * 2.2 + FL[k]) * clamp(floatAmt(t)) : 0;
  return [o[0] * e + i[0] + (k === 'tank' ? GAP.tank * gapE(t) : 0), o[1] * e + i[1] + f, o[2] * e + i[2]];
}
function pumpLen(t) {
  if (t < SIZE_T[0] || t > T.pumpBack + .5) return 85;
  let L = 85;
  for (let i = 0; i < SIZE_T.length; i++) if (t >= SIZE_T[i]) L = lerp(i ? SIZES[i - 1][1] : 85, SIZES[i][1], eo(seg(t, SIZE_T[i], SIZE_T[i] + .22)));
  if (t >= T.pumpBack) L = lerp(SIZES[4][1], 85, eio(seg(t, T.pumpBack, T.pumpBack + .5)));
  return L;
}
function pumpSizeIdx(t) { let k = -1; for (let i = 0; i < SIZE_T.length; i++) if (t >= SIZE_T[i]) k = i; return t >= T.pumpBack ? -2 : k; }

// ---------- camera ----------
const camKeys = CAM.map(([t, az, el, dist, tg, fov, shift]) => {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  const eye = [tg[0] + dist * Math.cos(e) * Math.sin(a), tg[1] + dist * Math.sin(e), tg[2] + dist * Math.cos(e) * Math.cos(a)];
  return [t, [...eye, ...tg, fov, shift]];
});
const camAt = track(camKeys);
function setCamera(t) {
  const [ex, ey, ez, tx, ty, tz, fov, shift] = camAt(t);
  camera.position.set(ex, ey, ez); camera.fov = fov; camera.lookAt(tx, ty, tz);
  camera.setViewOffset(W, H, shift, 0, W, H); camera.updateProjectionMatrix();
  const dist = Math.hypot(ex - tx, ey - ty, ez - tz);
  post.dof.focus = dist; post.dof.aper = 2600; post.dof.maxCoc = 12;
  const Az = Math.atan2(ex - tx, ez - tz), la = Az - .9;
  key.position.set(-700 * Math.cos(la) + 100, 1200, 700 * Math.sin(la) + 500); key.target.position.set(-78, 60, 0);
  rim.position.set(900 * Math.sin(Az + 2.7), 420, 900 * Math.cos(Az + 2.7)); rim.lookAt(-78, 80, 0);
  top.position.set(-78, 1100, 0); top.lookAt(-78, 0, 0);
}

// ---------- events for the mixer ----------
const EV = [];
EV.push({ t: T.pumpIn, type: 'rise' }, { t: T.shaft, type: 'spin' }, { t: T.lblPump, type: 'label', id: 'pump' });
EV.push({ t: T.mfIn, type: 'land', part: 'mf' }, { t: T.motorIn, type: 'land', part: 'motor' }, { t: T.tankIn, type: 'land', part: 'tank' });
for (const k of ['mf', 'motor', 'tank']) EV.push({ t: IN[k][0] - .75, type: 'flyin', part: k, pan: k === 'tank' ? -.6 : .6 });
EV.push({ t: T.title + .2, type: 'title' }, { t: T.hush1, type: 'hush' }, { t: T.hush2, type: 'hush' });
for (const k of Object.keys(UP)) EV.push({ t: UP[k], type: 'launch', part: k, pan: clamp(VEC[k][0] / 300 - VEC[k][2] / 300, -1, 1) });
for (const k of Object.keys(RET)) EV.push({ t: +(RET[k] + .9).toFixed(3), type: 'seat', part: k, pan: clamp(VEC[k][0] / 300 - VEC[k][2] / 300, -1, 1) });
for (const k of Object.keys(DOWN)) EV.push({ t: +(DOWN[k] + DOWNDUR).toFixed(3), type: 'close', part: k, pan: clamp(VEC[k][0] / 300, -1, 1) });
for (let i = 0; i < 4; i++) EV.push({ t: +(TL.LBL.layers.t0 + i * TL.LBL.layers.step).toFixed(3), type: 'label', id: 'layer' + i });
EV.push({ t: T.dive - .35, type: 'dive' }, { t: T.lift, type: 'flow' }, { t: T.hold, type: 'valve', id: 'cv' }, { t: T.lower, type: 'valve', id: 'sv' }, { t: T.lower + .1, type: 'flow' });
for (const id of ['lift', 'hold', 'lower', 'size']) EV.push({ t: TL.LBL[id][0], type: 'label', id });
SIZE_T.forEach((t, i) => EV.push({ t, type: 'size', i }));
EV.push({ t: T.pumpBack, type: 'sizeBack' }, { t: T.pull, type: 'pull' });
for (const id of ['dimL', 'dimH', 'dimM']) EV.push({ t: TL.LBL[id][0], type: 'dim', id });
EV.push({ t: T.card, type: 'card' });
EV.sort((a, b) => a.t - b.t);
window.EV = EV; window.DUR = DUR;

// ---------- frame ----------
const fadeMats = [M.alu, M.pumpBody];
for (const m of fadeMats) { m.transparent = true; }
await initOverlay();
window.render = t => {
  for (const k of Object.keys(G)) { const p = layerPos(k, t); G[k].position.set(...p); }
  // the pump alone at the start: everything else arrives later
  for (const k of Object.keys(IN)) G[k].visible = t > IN[k][0] - .9;
  const L = pumpLen(t); setPumpLength(L);
  for (const k of ['elbow', 'filter']) G[k].position.x -= L - 85;
  // flow: the manifold and the pump become see-through while the oil runs; the oil draws along its path
  const xr = seg(t, T.dive + .2, T.lift - .1) * (1 - seg(t, T.hush2 - .2, T.hush2 + .3));
  for (const m of fadeMats) { m.opacity = 1 - .72 * xr; m.depthWrite = xr < .05; }
  const up = seg(t, T.lift, T.lift + 1.6), down = seg(t, T.lower + .1, T.lower + 1.8);
  const offUp = 1 - seg(t, T.lower + .6, T.lower + 1.6), offAll = 1 - seg(t, T.hush2 - .3, T.hush2 + .2);
  flowUp.geometry.setDrawRange(0, Math.floor(eio(up) * flowUp.userData.n / 6) * 6);
  flowDown.geometry.setDrawRange(0, Math.floor(eio(down) * flowDown.userData.n / 6) * 6);
  flowUp.visible = up > 0 && offUp * offAll > 0; flowDown.visible = down > 0 && offAll > 0;
  oilMat.opacity = .95 * offUp * offAll * (t < T.hold ? 1 : .55 + .45 * (.5 + .5 * Math.cos((t - T.hold) * 5)));
  oilMat2.opacity = .95 * offAll;
  const hp = up > 0 && up < 1 ? flowUp.userData.curve.getPointAt(eio(up)) : down > 0 && down < 1 ? flowDown.userData.curve.getPointAt(eio(down)) : null;
  head.visible = !!hp; if (hp) head.position.copy(hp);
  const cvk = seg(t, T.hold, T.hold + .15) * (1 - seg(t, T.lower - .3, T.lower));
  cvGlow.visible = cvk > 0; cvGlow.material.opacity = cvk; cvGlow.scale.setScalar(.6 + .4 * cvk);
  pumpLight.intensity = .5 * (1 - seg(t, T.mfIn, T.mfIn + 1)); pumpLight.position.set(-60, 260, -260); pumpLight.lookAt(-60, 58, 0);
  post.vig.uniforms.fade.value = ss(seg(t, 0, .9));
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { A, W, H, pumpLen: L, sizeIdx: pumpSizeIdx(t), G, AX });
};
window.TEXTS = () => overlayTexts();
window.DBG = t => ({ cam: camAt(t).map(v => +v.toFixed(1)) });
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
