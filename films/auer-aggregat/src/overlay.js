// Marks layer: anchored labels, dimension lines drawn on the object, title, end card.
// Every label hangs on a 3D anchor projected each frame; every number on screen is in FACTS.md.
import * as THREE from 'three';
import { seg, ss, eo } from '/core/lib.js';
import * as TL from './timeline.js';

const { T, LBL, SIZES } = TL;
const cv = document.getElementById('ov'), g = cv.getContext('2d');
const SANS = '"Inter", sans-serif', MONO = '"JBMono", monospace';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.62)', ACC = '#4aa3ff', LINE = 'rgba(241,239,233,.75)';
const de = s => s.replace(/(\d)\.(\d)/g, '$1,$2');   // German decimal comma

let texts = [], logo = null;
export async function initOverlay() {
  logo = new Image(); logo.src = 'assets/auer-logo.png'; await logo.decode();
}
export const overlayTexts = () => texts;

const v3 = new THREE.Vector3();
let CAM, Wd, Hd;
const proj = v => { v3.copy(v).project(CAM); return [(v3.x + 1) / 2 * Wd, (1 - v3.y) / 2 * Hd, v3.z]; };
const wp = o => { const v = new THREE.Vector3(); o.getWorldPosition(v); return v; };
const fade = (t, a, d = .3) => ss(seg(t, a, a + d));

// one label: anchor dot + leader (diagonal then horizontal) + index / name / spec
function label(t, o) {
  const { t0, t1, a, lx, ly, idx, name, spec, id, align = 'left' } = o;
  const dl = eo(seg(t, t0, t0 + .38)), tx = fade(t, t0 + .18, .32), out = 1 - fade(t, t1 - .3, .3);
  if (dl <= 0 || out <= 0) return;
  const [ax, ay] = a, dir = align === 'left' ? 1 : -1, ex = lx - dir * 34;
  g.globalAlpha = out;
  g.fillStyle = INK; g.beginPath(); g.arc(ax, ay, 3.4, 0, 7); g.fill();
  g.strokeStyle = 'rgba(241,239,233,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(ax, ay, 3.4 + 6 * dl, 0, 7); g.stroke();
  const s1 = Math.hypot(ex - ax, ly - ay), s2 = Math.abs(lx - dir * 14 - ex), len = (s1 + s2) * dl;
  g.strokeStyle = LINE; g.lineWidth = 1.3; g.beginPath(); g.moveTo(ax, ay);
  if (len <= s1) g.lineTo(ax + (ex - ax) * len / s1, ay + (ly - ay) * len / s1);
  else { g.lineTo(ex, ly); g.lineTo(ex + dir * (len - s1), ly); }
  g.stroke();
  if (tx <= 0) return;
  g.globalAlpha = out * tx; const dx = (1 - tx) * 10 * dir;
  g.textAlign = align; g.textBaseline = 'alphabetic';
  const nx = align === 'left' ? lx + (idx ? 38 : 0) : lx;
  if (idx) { g.fillStyle = ACC; g.font = `500 16px ${MONO}`; g.fillText(idx, lx + dx, ly - 5); }
  g.fillStyle = INK; g.font = `500 31px ${SANS}`; g.fillText(name, nx + dx, ly + 5);
  let w = g.measureText(name).width;
  if (spec) { g.fillStyle = DIM; g.font = `400 18px ${MONO}`; g.fillText(spec, nx + dx, ly + 32); w = Math.max(w, g.measureText(spec).width); }
  g.textAlign = 'left';
  if (tx > .99 && out > .99) {
    const x0 = align === 'left' ? lx : lx - w - 4, x1 = align === 'left' ? nx + w + 4 : lx;
    texts.push({ id, text: name + (spec ? ' ' + spec : ''), x0: Math.max(0, x0), y0: ly - 26, x1: Math.min(Wd, x1), y1: ly + (spec ? 38 : 12) });
  }
}

// dimension line between two 3D points; ext = [[from, to], …] extension lines
function dimension(t, o) {
  const { t0, t1, A, B, ext = [], text, id, pass } = o;
  const k = eo(seg(t, t0, t0 + .55)), out = 1 - fade(t, t1 - .3, .3);
  if (k <= 0 || out <= 0) return;
  const a = proj(A), b = proj(B), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  g.globalAlpha = out; g.strokeStyle = ACC; g.lineWidth = 1.5;
  for (const [p, q] of ext) { const p1 = proj(p), q1 = proj(q); g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p1[0] + (q1[0] - p1[0]) * k, p1[1] + (q1[1] - p1[1]) * k); g.stroke(); }
  g.beginPath(); g.moveTo(mx + (a[0] - mx) * k, my + (a[1] - my) * k); g.lineTo(mx + (b[0] - mx) * k, my + (b[1] - my) * k); g.stroke();
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (const p of [a, b]) { g.save(); g.translate(p[0], p[1]); g.rotate(ang - Math.PI / 4); g.beginPath(); g.moveTo(-6 * k, 0); g.lineTo(6 * k, 0); g.stroke(); g.restore(); }
  const tA = fade(t, t0 + .35, .3); if (tA <= 0) return;
  let ra = ang; if (ra > Math.PI / 2) ra -= Math.PI; if (ra < -Math.PI / 2) ra += Math.PI;
  g.save(); g.translate(mx, my); g.rotate(ra); g.globalAlpha = out * tA; g.textAlign = 'center';
  g.font = `500 22px ${MONO}`; const w = g.measureText(text).width;
  g.fillStyle = 'rgba(14,15,17,.72)'; g.fillRect(-w / 2 - 8, -34, w + 16, 30);
  g.fillStyle = INK; g.fillText(text, 0, -11);
  g.restore(); g.textAlign = 'left';
  if (tA > .99 && out > .99) texts.push({ id, text, x0: mx - w / 2 - 30, y0: my - 50, x1: mx + w / 2 + 30, y1: my + 30, pass });
}

export function drawOverlay(t, cam, ctx) {
  CAM = cam; Wd = ctx.W; Hd = ctx.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { A, AX } = ctx;
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  // 1 · the pump alone
  if (t < LBL.pump[1] + .1) label(t, { id: 'pump', t0: LBL.pump[0], t1: LBL.pump[1], a: proj(wp(A.pump)), lx: 1330, ly: 400, idx: '01', name: 'Zahnradpumpe', spec: 'Baugröße 1 · 3,2 cm³/U' });
  // 2 · title, bottom left
  if (t > LBL.title[0] && t < LBL.title[1] + .1) {
    const a = fade(t, LBL.title[0], .5) * (1 - fade(t, LBL.title[1] - .4, .4));
    g.globalAlpha = a; g.fillStyle = ACC; g.fillRect(150, 846, 46 * eo(seg(t, LBL.title[0], LBL.title[0] + .6)), 4);
    g.fillStyle = INK; g.font = `500 50px ${SANS}`; g.fillText('Hydraulikaggregat 12 V', 150, 914 + (1 - a) * 8);
    g.fillStyle = DIM; g.font = `400 20px ${MONO}`; g.fillText('einfachwirkend · für Kippanhänger', 152, 952 + (1 - a) * 8);
    if (a > .99) texts.push({ id: 'title', text: 'Hydraulikaggregat 12 V einfachwirkend · für Kippanhänger', x0: 150, y0: 860, x1: 760, y1: 960 });
  }
  // 3 · the four parts, right-hand column, sorted by screen height
  const LL = LBL.layers;
  if (t > LL.t0 - .05 && t < LL.t1 + .1) {
    const items = [
      { id: 'motor', a: A.motor, name: 'Elektromotor', spec: '12 V · 2,0 kW · 3000 U/min' },
      { id: 'mf', a: A.mf, name: 'Steuerblock', spec: 'Aluminium · max. 250 bar' },
      { id: 'pump', a: A.pump, name: 'Zahnradpumpe', spec: '3,2 cm³/U · max. 210 bar' },
      { id: 'tank', a: A.tank, name: 'Kunststofftank', spec: '8 Liter' },
    ];
    const pts = items.map(o => proj(wp(o.a)));
    const order = items.map((o, i) => i).sort((i, j) => pts[i][1] - pts[j][1]);
    const ys = [300, 420, 540, 660];
    order.forEach((i, r) => label(t, { id: 'l-' + items[i].id, t0: LL.t0 + i * LL.step, t1: LL.t1, a: pts[i], lx: 1420, ly: ys[r], idx: String(i + 2).padStart(2, '0'), name: items[i].name, spec: items[i].spec }));
  }
  // 4 · the oil: lift, hold, lower
  if (t > LBL.lift[0] - .05 && t < LBL.lower[1] + .1) {
    label(t, { id: 'lift', t0: LBL.lift[0], t1: LBL.lift[1], a: proj(wp(A.P)), lx: 1420, ly: 300, name: 'Heben', spec: 'Pumpe fördert zu P · G 1/4"' });
    label(t, { id: 'hold', t0: LBL.hold[0], t1: LBL.hold[1], a: proj(wp(A.CV)), lx: 1420, ly: 470, name: 'Halten', spec: 'Rückschlagventil' });
    label(t, { id: 'lower', t0: LBL.lower[0], t1: LBL.lower[1], a: proj(wp(A.SV)), lx: 1420, ly: 640, name: 'Senken', spec: 'Magnetventil + Drossel' });
  }
  // 5 · pump sizes: the body length grows with the displacement; the counter is not meant to be read in full
  if (t > LBL.size[0] - .05 && t < LBL.size[1] + .1) {
    label(t, { id: 'size', t0: LBL.size[0], t1: LBL.size[1], a: proj(wp(A.pump)), lx: 1420, ly: 330, name: 'Pumpen Baugröße 1', spec: '1,1 … 8,0 cm³/U' });
    // a counter plate on the pump steps through the displacements on the beat; it is not meant to be read in full
    const i = ctx.sizeIdx, cc = i >= 0 ? SIZES[i][0] : 3.2, k = fade(t, LBL.size[0] + .3, .3) * (1 - fade(t, LBL.size[1] - .3, .3));
    if (k > 0) {
      const [px, py] = proj(wp(ctx.A.pump)), txt = `${de(cc.toFixed(1))} cm³/U`;
      g.globalAlpha = k; g.font = `500 30px ${MONO}`; const w = g.measureText(txt).width, x = px - w / 2, y = py - 70;
      g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(x - 14, y - 34, w + 28, 46);
      g.fillStyle = ACC; g.fillRect(x - 14, y + 12, (w + 28) * Math.min(1, cc / 8), 3);
      g.fillStyle = INK; g.fillText(txt, x, y);
      if (k > .99) texts.push({ id: 'cc', text: txt, x0: x - 14, y0: y - 34, x1: x + w + 14, y1: y + 15, pass: true });
    }
  }
  // 6 · dimensions on the closed unit (catalogue drawings, pp. 10 and 35)
  if (t > LBL.dimL[0] - .05 && t < LBL.dimL[1] + .1) {
    // tank 335 × 180 mm and motor Ø 114 mm, measured on the STEP (FACTS.md); the camera looks from −z
    const zf = -128, X0 = -348.84, X1 = -13.84;
    dimension(t, { id: 'dimL', t0: LBL.dimL[0], t1: LBL.dimL[1], A: P(X0, 1, zf), B: P(X1, 1, zf), ext: [[P(X0, 1, -92), P(X0, 1, zf - 6)], [P(X1, 1, -92), P(X1, 1, zf - 6)]], text: '335 mm' });
    dimension(t, { id: 'dimH', t0: LBL.dimH[0], t1: LBL.dimH[1], A: P(X0 - 36, 0, -92), B: P(X0 - 36, 180, -92), ext: [[P(X0 - 2, 180, -92), P(X0 - 42, 180, -92)]], text: '180 mm' });
    dimension(t, { id: 'dimM', t0: LBL.dimM[0], t1: LBL.dimM[1], A: P(232, 15, -12), B: P(232, 129, -12), ext: [[P(186, 129, -12), P(238, 129, -12)], [P(186, 15, -12), P(238, 15, -12)]], text: 'Ø 114 mm' });
    const a = fade(t, LBL.model[0], .4) * (1 - fade(t, LBL.model[1] - .3, .3));
    g.globalAlpha = a; g.fillStyle = DIM; g.font = `400 18px ${MONO}`; g.fillText('Geometrie: AUER CAD-Daten', 150, 990);
    if (a > .99) texts.push({ id: 'model', text: 'Geometrie: AUER CAD-Daten', x0: 150, y0: 970, x1: 450, y1: 996 });
  }
  // 7 · end card: the customer's logo, line, contact
  if (t > T.card) {
    const k0 = T.card, x = 150;
    const la = fade(t, k0 + .1, .6); g.globalAlpha = la;
    const lw = 470, lh = lw * logo.height / logo.width; g.drawImage(logo, x, 330 + (1 - la) * 10, lw, lh);
    const items = [
      { id: 'cardA', font: `500 34px ${SANS}`, col: INK, text: 'Hydraulik-Technik aus Solingen', y: 610, d: .5 },
      { id: 'cardB', font: `400 20px ${MONO}`, col: DIM, text: 'www.auer-hydraulics.com', y: 668, d: .8 },
      { id: 'cardC', font: `400 20px ${MONO}`, col: DIM, text: '+49 212 881942-20', y: 700, d: .95 },
    ];
    g.fillStyle = ACC; g.globalAlpha = fade(t, k0 + .4, .4); g.fillRect(x, 552, 46 * eo(seg(t, k0 + .4, k0 + 1)), 4);
    for (const it of items) {
      const a = fade(t, k0 + it.d, .45); if (a <= 0) continue;
      g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.fillText(it.text, x, it.y + (1 - a) * 10);
      if (a > .99) texts.push({ id: it.id, text: it.text, x0: x, y0: it.y - 40, x1: x + g.measureText(it.text).width, y1: it.y + 10 });
    }
  }
  g.globalAlpha = 1;
}
