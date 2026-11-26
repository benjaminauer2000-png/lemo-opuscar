// The single timeline: 100 BPM, 4/4, bar = 2.4 s. Every picture hit and music cue reads these numbers.
export const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4;
export const b = (bar, beat = 0) => +(bar * BAR + beat * BEAT).toFixed(3);   // bar index from 0

export const T = {
  pumpIn: 0.3, shaft: b(0, 2), lblPump: b(0, 3),
  mfIn: b(2), motorIn: b(2, 1.5), tankIn: b(2, 3), title: b(3),
  hush1: b(4), explode: b(5),
  dive: b(8), lift: b(8, 2), hold: b(10), lower: b(11, 2), flowEnd: b(13),
  hush2: b(12, 3), pump: b(13), pumpBack: b(14, 3), pull: b(15),
  close: b(15), land: b(16), dims: b(16, 1), card: b(17, 2), end: b(20),
};
export const DUR = T.end;

// explode: per layer, along the main axis (x) and sideways; times when they leave and land
export const LAYERS = ['tank', 'pump', 'mf', 'coil', 'motor', 'relay'];
export const OFF = {          // [dx, dy, dz] in mm when fully apart
  tank: [-170, 0, 0], pump: [0, 0, 0], mf: [0, 0, 0], coil: [0, -6, 60], motor: [125, 0, 0], relay: [125, -26, 70],
};
export const UP = { tank: T.explode, motor: T.explode + .18, relay: T.explode + .36, coil: T.explode + .54, pump: 0, mf: 0 };
export const DOWN = { pump: 0, coil: T.close + .25, relay: T.close + .5, motor: T.close + .75, tank: T.close + 1.15, mf: 0 };
export const UPDUR = 1.6, DOWNDUR = 1.25;
// during the flow the tank slides further back so the pump and its filter stand free
export const GAP = { tank: -120, open: [T.dive - .4, T.dive + .8], close: [T.close + .2, T.close + 1.9] };

// pump sizes (catalogue p. 31, group 1): displacement cc/rev → body length mm
export const SIZES = [[1.1, 75.5], [2.1, 80], [3.2, 85], [4.8, 92.5], [8.0, 109.5]];
export const SIZE_T = [b(13, 1), b(13, 2), b(13, 3), b(14, 0), b(14, 1)];

// labels: [t0, t1]
export const LBL = {
  pump: [T.lblPump, b(1, 3.6)],
  title: [T.title + .2, b(4, 3.6)],
  layers: { t0: b(5, 2), step: .6, t1: b(7, 3.5) },
  lift: [b(8, 2.2), b(9, 3.6)],
  hold: [b(10, .2), b(11, 1.6)],
  lower: [b(11, 2.2), b(12, 3.4)],
  size: [b(13, .4), b(14, 3.4)],
  dimL: [T.dims, b(17, 1.6)], dimH: [T.dims + .5, b(17, 1.6)], dimM: [T.dims + 1.0, b(17, 1.6)], model: [T.dims + .3, b(17, 1.6)],
};

// camera keys: [t, az°, el°, dist mm, target [x,y,z], fov°, view shift px]
export const CAM = [
  [0.0, 30, 9, 480, [-60, 88, 0], 24, 120],
  [b(1, 3), 46, 13, 410, [-58, 90, 0], 24, 120],
  [T.mfIn, 48, 14, 420, [-50, 92, 0], 24, 110],
  [b(3, 1), 36, 19, 1240, [-36, 96, 0], 26, 0],
  [T.hush1, 30, 20, 1230, [-34, 96, 0], 26, 0],
  [T.explode, 27, 21, 1260, [-36, 98, 0], 26, 60],
  [b(7, 2), 40, 23, 1340, [-50, 98, 0], 26, 250],
  [T.dive - .3, 42, 23, 1350, [-50, 98, 0], 26, 250],
  [T.lift - .3, 2, 12, 740, [-96, 100, 0], 26, 250],
  [T.lower, 8, 13, 720, [-92, 100, 0], 26, 250],
  [T.hush2 + .3, 10, 14, 710, [-90, 100, 0], 26, 250],
  [T.pump + .5, -6, 20, 560, [-74, 94, 0], 26, 240],
  [T.pumpBack, 2, 21, 540, [-74, 94, 0], 26, 240],
  [T.pull + .9, 34, 24, 1280, [-36, 96, 0], 26, 0],
  [T.land, 33, 26, 1250, [-36, 94, 0], 26, 0],
  [T.card - .2, 42, 27, 1230, [-36, 92, 0], 26, 0],
  [T.end, 58, 22, 1380, [-36, 92, 0], 26, -330],
];
