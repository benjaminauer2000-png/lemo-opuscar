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

const { T, DUR, OFF, UP, DOWN, UPDUR, DOWNDUR, GAP, CAM, SIZES, SIZE_T } = TL;
const W = 1920, H = 1080;
const Q = new URLSearchParams(location.search);
const AX = 90;   // axis height above the floor

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
  pumpBody: new THREE.MeshStandardMaterial({ color: '#bfc3c8', roughness: .42, metalness: .9 }),
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
const G = {}; for (const k of TL.LAYERS) { G[k] = new THREE.Group(); root.add(G[k]); }
const A = {};   // label anchors

// ---------- gear pump GP-F203.2 (group 1): 70 × 71 mm section, body length 85 mm, shaft Ø 12.7 ----------
const pumpBody = new THREE.Group();   // unit length along −x, scaled to the body length
{
  // section 70 × 71 mm with rounded corners and the two gear bulges, extruded one unit along −x and scaled to the length
  const s = new THREE.Shape(), r = 15, hw = 35, hh = 35.5;
  s.moveTo(-hw + r, -hh); s.lineTo(hw - r, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, -10); s.quadraticCurveTo(hw - 4, 0, hw, 10); s.lineTo(hw, hh - r); s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh); s.quadraticCurveTo(-hw, hh, -hw, hh - r); s.lineTo(-hw, 10); s.quadraticCurveTo(-hw + 4, 0, -hw, -10);
  s.lineTo(-hw, -hh + r); s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 40 }); g.rotateY(-Math.PI / 2);
  pumpBody.add(new THREE.Mesh(g, M.pumpBody));
}
pumpBody.position.set(-14, AX, 0); G.pump.add(pumpBody);
const pumpFront = new THREE.Group();   // front flange + shaft, fixed at the manifold face
{
  const f = box(8, 71, 76, M.cast, 6); f.position.set(-18, AX, 0); pumpFront.add(f);
  const pilot = cyl(16, 6, M.steel); pilot.position.set(-11, AX, 0); pumpFront.add(pilot);
  for (const [y, z] of [[-26, -29], [26, 29], [-26, 29], [26, -29]]) { const h = hex(6.5, 4, M.bolt); h.rotation.z = Math.PI / 2; h.position.set(-12.5, AX + y, z); pumpFront.add(h); }
}
G.pump.add(pumpFront);
const shaft = new THREE.Group();
{ const s = cyl(6.35, 12, M.steel); s.position.x = 6; shaft.add(s); const tang = box(4, 9, 3, M.steel); tang.position.x = 13; shaft.add(tang); }
shaft.position.set(-14, AX, 0); G.pump.add(shaft);
const pumpRear = new THREE.Group();   // rear cover + 4 bolts, moves with the body length
{
  const r = box(6, 69, 68, M.cast, 5); r.position.x = -3; pumpRear.add(r);
  for (const [y, z] of [[-24, -24], [24, 24], [-24, 24], [24, -24]]) { const h = hex(6, 5, M.bolt); h.rotation.z = Math.PI / 2; h.position.set(-8, y, z); pumpRear.add(h); }
}
pumpRear.position.y = AX; G.pump.add(pumpRear);
// suction neck + filter under the pump; return pipe from the manifold's T into the tank
const pumpInlet = new THREE.Group();
{
  const n = cylY(9, 20, M.cast); n.position.set(-58, AX - 44, 0); pumpInlet.add(n);
  const f = cyl(20, 64, M.mesh); f.position.set(-58, 30, 0); pumpInlet.add(f);
  for (const x of [-90, -26]) { const e = cyl(21.5, 4, M.black); e.position.set(x, 30, 0); pumpInlet.add(e); }
}
G.pump.add(pumpInlet);
{ const tube = cyl(5, 130, M.steel); tube.position.set(-79, 46, 42); G.mf.add(tube); }   // return pipe from T into the tank
A.pump = anchor(G.pump, -56, AX + 36, 18);
A.filter = anchor(G.pump, -58, 30, 20);

// ---------- aluminium manifold 500208: 133 × 133 × 49 mm, spigot Ø 120, max 250 bar ----------
{
  const blk = box(49, 133, 133, M.alu, 3); blk.position.set(24.5, AX, 0); G.mf.add(blk);
  const sp = cyl(60, 14, M.aluDark); sp.position.set(-7, AX, 0); G.mf.add(sp);
  const oring = new THREE.Mesh(new THREE.TorusGeometry(60, 1.6, 12, 64), M.rubber); oring.rotation.y = Math.PI / 2; oring.position.set(-9, AX, 0); G.mf.add(oring);
  // top: P port with plug, relief valve (hex + cap), needle valve with green cap
  const pP = hex(11, 10, M.steel); pP.position.set(14, AX + 66.5 + 5, 34); G.mf.add(pP);
  const pT = cylY(7, 4, M.steel); pT.position.set(14, AX + 66.5 + 12, 34); G.mf.add(pT);
  const rv = hex(12, 14, M.steel); rv.position.set(30, AX + 66.5 + 7, -30); G.mf.add(rv);
  const rvc = cylY(8, 14, M.zinc); rvc.position.set(30, AX + 66.5 + 20, -30); G.mf.add(rvc);
  const nv = hex(9, 10, M.steel); nv.position.set(34, AX + 66.5 + 5, 4); G.mf.add(nv);
  const nvc = cylY(10, 10, M.green, 32, 9); nvc.position.set(34, AX + 66.5 + 15, 4); G.mf.add(nvc);
  // front (+z): check-valve cartridge hex; mounting bolts on the motor face
  const cv = hex(11, 10, M.steel); cv.rotation.x = Math.PI / 2; cv.position.set(18, AX + 34, 66.5 + 5); G.mf.add(cv);
  const sv = hex(13, 10, M.steel); sv.rotation.x = Math.PI / 2; sv.position.set(24, AX - 32, 66.5 + 5); G.mf.add(sv);
  for (const [y, z] of [[-55, -55], [55, 55], [-55, 55], [55, -55]]) { const h = cyl(6, 5, M.bolt, 24); h.position.set(51, AX + y, z); G.mf.add(h); }
}
A.mf = anchor(G.mf, 24, AX + 66.5, -50);
A.P = anchor(G.mf, 14, AX + 80, 34);
A.CV = anchor(G.mf, 18, AX + 34, 72);
// solenoid coil on the lowering valve (SV), its DIN plug and cable
{
  const stem = cyl(6, 46, M.steel); stem.rotation.y = -Math.PI / 2; stem.position.set(24, AX - 32, 71 + 23); G.coil.add(stem);
  const coil = cyl(21, 40, M.black, 48); coil.rotation.y = -Math.PI / 2; coil.position.set(24, AX - 32, 71 + 20); G.coil.add(coil);
  const nut = hex(8, 8, M.steel); nut.rotation.x = Math.PI / 2; nut.position.set(24, AX - 32, 71 + 44); G.coil.add(nut);
  const plug = box(28, 30, 22, M.black, 3); plug.position.set(24, AX - 32 - 28, 71 + 20); G.coil.add(plug);
  const pts = [[24, AX - 75, 91], [30, AX - 80, 110], [70, 22, 150], [160, 10, 170], [260, 12, 160], [330, 22, 128]].map(p => new THREE.Vector3(...p));
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 3.2, 12), M.rubber); G.coil.add(cable);
  const con = cyl(9, 34, M.black, 32); con.position.set(347, 22, 128); con.rotation.y = .5; G.coil.add(con);
}
A.SV = anchor(G.coil, 24, AX - 32, 112);

// ---------- DC motor MDC1220: Ø 114 × 177 mm, 12 V 2.0 kW ----------
{
  const fl = cyl(49.2, 8, M.cast); fl.position.set(53, AX, 0); G.motor.add(fl);
  const body = cyl(57, 140, M.zinc, 96); body.position.set(57 + 70, AX, 0); G.motor.add(body);
  for (const x of [60, 194]) { const r = cyl(57.6, 3, M.aluDark, 96); r.position.set(x, AX, 0); G.motor.add(r); }
  const cap = cyl(58, 24, M.cast, 96, 54); cap.position.set(197 + 12, AX, 0); G.motor.add(cap);
  const boss = cyl(22, 8, M.cast, 48); boss.position.set(225, AX, 0); G.motor.add(boss);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, h = hex(5, 6, M.bolt); h.rotation.z = Math.PI / 2; h.position.set(223, AX + 40 * Math.sin(a), 40 * Math.cos(a)); G.motor.add(h); }
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, rib = box(16, 4, 3, M.cast); rib.position.set(223, AX + 30 * Math.sin(a), 30 * Math.cos(a)); rib.rotation.x = -a; G.motor.add(rib); }
  // terminal stud with its red boot
  const st = cylY(4, 14, M.copper); st.position.set(176, AX + 4, 62); st.rotation.x = Math.PI / 2; G.motor.add(st);
  const boot = cylY(9, 22, M.redSoft, 24, 6); boot.rotation.x = Math.PI / 2; boot.position.set(176, AX + 4, 72); G.motor.add(boot);
}
A.motor = anchor(G.motor, 130, AX + 57, -10);
// starter relay under the motor, with its two red boots
{
  const r = cyl(23, 64, M.zinc, 48); r.position.set(140, 30, 58); G.relay.add(r);
  const c = cyl(23.6, 4, M.black, 48); c.position.set(174, 30, 58); G.relay.add(c);
  for (const z of [46, 70]) { const bt = cyl(8, 22, M.redSoft, 24, 6); bt.position.set(187, 30, z); G.relay.add(bt); }
  const strap = box(40, 6, 6, M.zinc); strap.position.set(140, 56, 58); G.relay.add(strap);
}

// ---------- plastic tank PT-120-7: 7 L, 180 × 180 mm section, length 290 mm, neck Ø 120 ----------
{
  const body = box(272, 180, 180, M.hdpe, 14); body.position.set(-12 - 136 - 6, AX, 0); G.tank.add(body);
  const neck = cyl(66, 12, M.hdpe, 64); neck.position.set(-6, AX, 0); G.tank.add(neck);
  const lip = box(10, 186, 186, M.hdpe, 10); lip.position.set(-24, AX, 0); G.tank.add(lip);
  for (const y of [-50, 0, 50]) for (const s of [1, -1]) { const rb = box(230, 8, 3, M.hdpe, 1.4); rb.position.set(-160, AX + y, s * 90.5); G.tank.add(rb); }
  for (const s of [1, -1]) { const rb = box(230, 3, 8, M.hdpe, 1.4); rb.position.set(-160, AX + 90.5, s * 45); G.tank.add(rb); }
  const fb = cylY(26, 6, M.hdpe); fb.position.set(-252, AX + 92, 0); G.tank.add(fb);
  const fc = cylY(22, 22, M.red, 32, 21); fc.position.set(-252, AX + 106, 0); G.tank.add(fc);
  const fct = cylY(16, 4, M.red, 32); fct.position.set(-252, AX + 119, 0); G.tank.add(fct);
  const knob = cyl(13, 12, M.red, 32); knob.rotation.y = -Math.PI / 2; knob.position.set(-44, AX + 50, 96); G.tank.add(knob);
  const sY = box(60, .6, 22, M.stickerY); sY.position.set(-140, AX + 90.4, -40); G.tank.add(sY);
  const sO = box(60, .6, 14, M.stickerO); sO.position.set(-215, AX + 90.4, -50); G.tank.add(sO);
  const np = box(80, .6, 42, M.plate); np.position.set(-90, AX + 90.4, 30); np.rotation.y = .02; G.tank.add(np);
}
A.tank = anchor(G.tank, -150, AX + 90, 60);
for (const k of TL.LAYERS) shadowy(G[k]);
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
const flowUp = oilTube([[-58, 30, 0], [-58, 46, 0], [-58, AX - 26, 0], [-58, AX, 0], [-34, AX, 0], [-14, AX, 0], [6, AX + 8, 0], [16, AX + 34, 30], [14, AX + 62, 34], [14, AX + 84, 34], [14, AX + 170, 34]]);
const flowDown = oilTube([[14, AX + 170, 34], [14, AX + 84, 34], [16, AX + 40, 40], [24, AX - 20, 50], [30, AX - 40, 30], [8, AX - 44, 42], [-14, 46, 42], [-79, 46, 42], [-144, 46, 42]]);
flowDown.material = oilMat2;
root.add(flowUp, flowDown);
const head = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: ACC.clone().multiplyScalar(4), transparent: true, depthTest: false })); head.renderOrder = 11; root.add(head);
const cvGlow = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: ACC.clone().multiplyScalar(3), transparent: true, depthTest: false })); cvGlow.renderOrder = 11; cvGlow.position.set(16, AX + 34, 30); root.add(cvGlow);

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const IN = { mf: [T.mfIn, [520, 0, 0]], motor: [T.motorIn, [900, 0, 0]], relay: [T.motorIn, [900, 0, 0]], coil: [T.mfIn, [520, 0, 0]], tank: [T.tankIn, [-900, 0, 0]] };
function inOff(k, t) {   // fly-in at the start: arrive with a hard ease-out and a 1 mm mechanical settle
  const e = IN[k]; if (!e) return [0, 0, 0];
  const s = seg(t, e[0] - .8, e[0]), f = 1 - eo(s);
  const settle = t > e[0] && t < e[0] + .25 ? -1.2 * Math.sin(seg(t, e[0], e[0] + .25) * Math.PI) : 0;
  return e[1].map((v, i) => v * f + (i === 0 ? settle * Math.sign(e[1][0]) : 0));
}
function layerE(k, t) {
  if (!(k in UP) || !UP[k]) return 0;
  return pop(seg(t, UP[k], UP[k] + UPDUR)) * (1 - eio(seg(t, DOWN[k], DOWN[k] + DOWNDUR)));
}
const gapE = t => eio(seg(t, GAP.open[0], GAP.open[1])) * (1 - eio(seg(t, GAP.close[0], GAP.close[1])));
const FL = { tank: 0, coil: 1.1, motor: 2.2, relay: 3.0 };
const floatAmt = t => 1 - seg(t, T.dive - .6, T.dive) + seg(t, T.pull - .2, T.pull + .4);
function layerPos(k, t) {
  const e = layerE(k, t), o = OFF[k], i = inOff(k, t);
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
  key.position.set(-700 * Math.cos(la) + 100, 1200, 700 * Math.sin(la) + 500); key.target.position.set(-30, 60, 0);
  rim.position.set(900 * Math.sin(Az + 2.7), 420, 900 * Math.cos(Az + 2.7)); rim.lookAt(-30, 90, 0);
  top.position.set(-30, 1100, 0); top.lookAt(-30, 0, 0);
}

// ---------- events for the mixer ----------
const EV = [];
EV.push({ t: T.pumpIn, type: 'rise' }, { t: T.shaft, type: 'spin' }, { t: T.lblPump, type: 'label', id: 'pump' });
EV.push({ t: T.mfIn, type: 'land', part: 'mf' }, { t: T.motorIn, type: 'land', part: 'motor' }, { t: T.tankIn, type: 'land', part: 'tank' });
for (const k of ['mf', 'motor', 'tank']) EV.push({ t: IN[k][0] - .75, type: 'flyin', part: k, pan: k === 'tank' ? -.6 : .6 });
EV.push({ t: T.title + .2, type: 'title' }, { t: T.hush1, type: 'hush' }, { t: T.hush2, type: 'hush' });
for (const k of ['tank', 'motor', 'relay', 'coil']) EV.push({ t: UP[k], type: 'launch', part: k, pan: clamp((OFF[k][0]) / 250, -1, 1) });
for (const k of ['coil', 'relay', 'motor', 'tank']) EV.push({ t: +(DOWN[k] + DOWNDUR).toFixed(3), type: 'close', part: k, pan: clamp((OFF[k][0]) / 250, -1, 1) });
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
const fadeMats = [M.alu, M.aluDark, M.pumpBody, M.cast];
for (const m of fadeMats) { m.transparent = true; }
await initOverlay();
window.render = t => {
  for (const k of TL.LAYERS) { const p = layerPos(k, t); G[k].position.set(...p); }
  // the pump alone at the start: everything else arrives later
  for (const k of ['mf', 'motor', 'relay', 'coil', 'tank']) G[k].visible = t > IN[k][0] - .9;
  const L = pumpLen(t); pumpBody.scale.x = L; pumpRear.position.x = -14 - L;
  shaft.rotation.x = t < T.mfIn ? -eio(seg(t, T.shaft, T.shaft + 2.2)) * Math.PI * 2 : 0;
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
  pumpLight.intensity = 1.2 * (1 - seg(t, T.mfIn, T.mfIn + 1)); pumpLight.position.set(-40, 280, 240); pumpLight.lookAt(-56, AX, 0);
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
