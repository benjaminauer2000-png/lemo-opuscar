// The single timeline: 100 BPM, 4/4, bar = 2.4 s. Every picture hit and music cue reads these numbers.
export const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4;
export const b = (bar, beat = 0) => +(bar * BAR + beat * BEAT).toFixed(3);   // bar index from 0

export const T = {
  pumpIn: 0.3, shaft: b(0, 2), lblPump: b(0, 3),
  mfIn: b(2), motorIn: b(2, 1.5), tankIn: b(2, 3), title: b(3),
  hush1: b(4), explode: b(5),
  dive: b(8), lift: b(8, 2), hold: b(10), lower: b(11, 2), flowEnd: b(13),
  hush2: b(12, 3.3), pump: b(13), pumpBack: b(14, 3), pull: b(15),
  close: b(15), land: b(16), dims: b(16, 1), card: b(17, 3), end: b(20),
};
export const DUR = T.end;

// explode along the customer's own SolidWorks explode vectors (data/explode.json); stagger in the order the unit is taken apart
const E = T.explode;
export const UP = { tank: E, motor: E + .15, coil: E + .3, rv: E + .4, sv: E + .5, cv: E + .55, coup: E + .62, pump: E + .7, ret: E + .7, seal: E + .76, elbow: E + .82, filter: E + .88, bolts: E + .94 };
// for the oil the hydraulics go back together during the dive (filter first, coil last); tank and motor stay away
const R = T.dive - .9;
export const RET = { filter: R, elbow: R + .08, bolts: R + .12, pump: R + .16, ret: R + .2, seal: R + .24, coup: R + .28, cv: R + .34, sv: R + .4, rv: R + .46, coil: R + .55 };
export const DOWN = { motor: T.close + .4, tank: T.close + 1.0 };
export const UPDUR = 1.6, DOWNDUR = 1.25;
// during the flow the tank slides further back so the pump and its filter stand free
export const GAP = { tank: -160, open: [T.dive - .4, T.dive + .8], close: [T.close, T.close + 2.0] };

// pump sizes (catalogue p. 31, group 1): displacement cc/rev → body length mm
export const SIZES = [[1.1, 75.5], [2.1, 80], [3.2, 85], [4.8, 92.5], [8.0, 109.5]];
export const SIZE_T = [b(13, 1), b(13, 2), b(13, 3), b(14, 0), b(14, 1)];

// labels: [t0, t1]
export const LBL = {
  pump: [0.9, 5.3],
  title: [b(2, 3), b(5, 1)],
  layers: { t0: b(5, 2), step: .6, t1: b(7, 3.5) },
  lift: [b(8, 1.3), b(10, .3)],
  hold: [b(10, 0), b(11, 2.4)],
  lower: [b(11, 2), b(13, .7)],
  size: [b(13, .4), b(14, 3.4)],
  dimL: [b(15, 3.5), b(17, 3.2)], dimH: [b(16, .5), b(17, 3.2)], dimM: [b(16, 1), b(17, 3.2)], model: [b(16, 0), b(17, 3.2)],
};

// camera keys: [t, az°, el°, dist mm, target [x,y,z], fov°, view shift px]
export const CAM = [
  [0.0, 214, 10, 470, [-62, 60, -4], 24, 120],
  [b(1, 3), 200, 13, 410, [-60, 60, -4], 24, 120],
  [T.mfIn, 198, 14, 420, [-55, 62, -4], 24, 110],
  [b(3, 1), 150, 19, 1340, [-78, 86, 0], 26, 0],
  [T.hush1, 156, 20, 1320, [-78, 86, 0], 26, 0],
  [T.explode, 158, 21, 1360, [-80, 88, 0], 26, 60],
  [b(7, 2), 150, 24, 1880, [-40, 82, -50], 26, 300],
  [T.dive - .3, 147, 24, 1890, [-40, 82, -50], 26, 300],
  [T.lift - .3, 186, 12, 640, [-62, 78, -20], 26, 250],
  [T.lower, 192, 13, 620, [-60, 80, -20], 26, 250],
  [T.hush2 + .3, 194, 14, 610, [-60, 80, -20], 26, 250],
  [T.pump + .5, 176, 22, 540, [-72, 62, -4], 26, 240],
  [T.pumpBack, 182, 22, 520, [-72, 62, -4], 26, 240],
  [T.pull + .9, 150, 24, 1360, [-78, 86, 0], 26, 0],
  [T.land, 148, 26, 1330, [-78, 84, 0], 26, 0],
  [T.card - .2, 140, 27, 1310, [-78, 84, 0], 26, 0],
  [T.end, 125, 22, 1460, [-78, 84, 0], 26, -330],
];
