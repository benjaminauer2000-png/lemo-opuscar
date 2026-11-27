# Score + foley + mix for the AUER power-unit film. Reads events.json (window.EV from the page) and the timeline grid.
# usage (from the library root): .venv/bin/python films/auer-aggregat/mix.py   → out/mix.wav, out/stems/*.wav
# Score: 100 BPM, 4/4, bar = 2.4 s; A minor → C major. Tuned mallets, round bass, dry kick and small percussion (STYLE.md §7).
import sys, json, pathlib
import numpy as np, soundfile as sf
HERE = pathlib.Path(__file__).resolve().parent
LIB = HERE.parent.parent if (HERE.parent.parent / 'core').exists() else pathlib.Path.cwd()
sys.path.insert(0, str(LIB))
from core.audio import sampler as S
from core.audio.sfx import SR, add, limit, compress, noise, bp, lp, hp, t_, env_exp, norm, brown, whoosh, click, clack, thump

S.seed(7); np.random.seed(7)
EVJ = json.loads((HERE / 'events.json').read_text()); DUR = EVJ['dur']; EV = EVJ['ev']
BEAT = .6; BAR = 2.4
b = lambda bar, beat=0: round(bar * BAR + beat * BEAT, 3)
N = int((DUR + .5) * SR)

# ---------- score ----------
CH = {   # chord tones per bar function (low → high)
  'Am': ['A2', 'E3', 'A3', 'C4', 'E4', 'G4', 'B4', 'C5', 'E5'],
  'F': ['F2', 'C3', 'F3', 'A3', 'C4', 'E4', 'G4', 'A4', 'C5'],
  'C': ['C3', 'G3', 'C4', 'E4', 'G4', 'B4', 'C5', 'D5', 'E5'],
  'G': ['G2', 'D3', 'G3', 'B3', 'D4', 'F#4', 'A4', 'B4', 'D5'],
}
PROG = ['Am', 'F', 'C', 'G']
ev = []
def chord_of(bar): return CH[PROG[bar % 4]]
def mar8(bar, vel=.5, pat=(3, 5, 4, 6, 5, 7, 6, 4)):   # marimba 8ths arpeggio
  c = chord_of(bar)
  for i, k in enumerate(pat): ev.append((b(bar, i * .5), 'marimba', c[k], .5, vel * (1.08 if i % 2 == 0 else .9), -.25 + .07 * i))
def bass(bar, vel=.7, beats=(0, 1.5, 2.5)):
  r = chord_of(bar)[0]
  for k in beats: ev.append((b(bar, k), 'jazz_bass', r, .55, vel, 0))
def kick(bar, beats=(0, 2), vel=.75):
  for k in beats: ev.append((b(bar, k), 'bass_drum', None, None, vel, 0))
def claves(bar, vel=.45):
  for k in (1, 3): ev.append((b(bar, k), 'claves', None, None, vel, .35))
def hat(bar, vel=.28, var='closed', step=.5):
  for i in range(int(4 / step)): ev.append(dict(t=b(bar, i * step), inst='hihat', pitch=var, vel=vel * (1 if i % 2 == 0 else .7), pan=.3))

# 1 · the pump alone (bars 0–1): single vibraphone notes, a low bowed pad
for t, p, v in [(.3, 'E5', .45), (1.5, 'C5', .4), (2.7, 'A4', .42), (3.6, 'B4', .35), (4.2, 'E5', .3)]: ev.append((t, 'vibraphone', p, 2.2, v, .15))
ev.append(dict(t=0.0, inst='vibraphone_bowed', pitch='A3', dur=4.6, vel=.35, pan=-.1, attack=.8))
# 2 · assembly (bars 2–3): the pulse enters
for bar in (2, 3): mar8(bar, .45); bass(bar, .65); kick(bar)
# 3 · silence 1 (bar 4): a held bowed chord that thins out to room tone by beat 3
for p in ('C4', 'E4', 'A4'): ev.append(dict(t=b(4), inst='vibraphone_bowed', pitch=p, dur=1.6, vel=.32, pan=0, attack=.05))
# 4 · the explode (bars 5–7): full groove
for bar in (5, 6, 7): mar8(bar, .55); bass(bar, .72); kick(bar); claves(bar); hat(bar)
# 5 · inside, the oil (bars 8–12.75): airy, sustained; pedal hats, one soft kick a bar
for bar in range(8, 13):
  c = chord_of(bar)
  for p in c[3:6]: ev.append(dict(t=b(bar), inst='vibraphone_bowed', pitch=p, dur=BAR - (.7 if bar == 12 else .1), vel=.3, pan=0, attack=.4))
  ev.append((b(bar), 'jazz_bass', c[0], BAR * .8 if bar < 12 else 1.2, .55, 0))
  if bar < 12: kick(bar, (0,), .5); hat(bar, .16, 'pedal', 1)
  ev.append((b(bar, 2), 'vibraphone', c[7], 1.6, .32, .3))
# 6 · pump displacements (bars 13–14): a rising marimba + glockenspiel step on each size
SIZE_NOTES = ['A4', 'C5', 'E5', 'G5', 'A5']
for bar in (13, 14): bass(bar, .75, (0, 1, 2, 3)); kick(bar, (0, 1, 2, 3), .62); hat(bar, .22)
for i, t in enumerate([b(13, 1), b(13, 2), b(13, 3), b(14, 0), b(14, 1)]):
  ev.append((t, 'marimba', SIZE_NOTES[i], .6, .7, -.1)); ev.append((t, 'glockenspiel', SIZE_NOTES[i][0] + str(int(SIZE_NOTES[i][1]) + 1), .8, .38, .3))
ev.append((b(14, 3), 'marimba', 'E5', .6, .55, 0))
# 7 · closing (bars 15–17.75): four on the floor; the landing on bar 16
for bar in (15, 16, 17):
  mar8(bar, .55); bass(bar, .74, (0, 1, 1.5, 2.5, 3)); kick(bar, (0, 1, 2, 3), .7); claves(bar, .4); hat(bar, .25)
ev.append(dict(t=b(16), inst='vibraphone_hard', pitch='C5', dur=2.0, vel=.5, pan=-.2))
ev.append(dict(t=b(16), inst='vibraphone_hard', pitch='G5', dur=2.0, vel=.45, pan=.2))
# 8 · card (bar 17.75 → end): C major, bowed vibes C–E–G, marimba roll, glockenspiel answers
K = b(17, 3)
for i, p in enumerate(['C4', 'E4', 'G4', 'C5']): ev.append(dict(t=K + i * .03, inst='vibraphone_bowed', pitch=p, dur=4.6, vel=.36, pan=-.3 + .2 * i, attack=.3))
for i in range(12): ev.append((K + i * .075, 'marimba', ['C4', 'G4', 'C5', 'E5'][i % 4], .4, .35 + .02 * i, -.2 + .04 * (i % 4)))
ev.append((K, 'jazz_bass', 'C2', 3.0, .7, 0)); ev.append((K, 'bass_drum', None, None, .55, 0))
for t, p in [(K + 1.2, 'G6'), (K + 1.8, 'E6'), (K + 2.4, 'C7')]: ev.append((t, 'glockenspiel', p, 1.5, .3, .35))

music = S.render(ev, dur=DUR + .5)
music = S.room(music, size=.38, mix=.14)
music = np.stack([hp(music[:, c], 44) for c in (0, 1)], 1)

# ---------- foley from the picture's events ----------
fol = np.zeros((N, 2))
def ring(fs, d=.5, taus=(.18, .12, .08, .05)):   # inharmonic ring for machined metal
  tt = t_(d); return norm(sum(np.sin(2 * np.pi * f * tt + k) * env_exp(d, tau) for k, (f, tau) in enumerate(zip(fs, taus))))
def metal_land(v=1):   # aluminium block / fittings seating: transient + ring
  tr = hp(noise(.03), 2000) * env_exp(.03, .002)
  r = ring([1870, 2960, 4410, 6230], .6) * .5
  x = np.zeros(int(.6 * SR)); x[:len(tr)] += tr; x += r; x[:int(.35 * SR)] += thump(.5, 110)[:int(.35 * SR)]
  return norm(x) * v
def plastic_thud(v=1):   # hollow HDPE tank: low hollow body + soft clack
  d = .5; tt = t_(d)
  body = sum(a * np.sin(2 * np.pi * f * tt) * env_exp(d, tau) for f, a, tau in [(142, 1, .09), (231, .6, .06), (390, .35, .04)])
  return norm(body + lp(noise(d), 900) * env_exp(d, .015) * .6 + np.pad(clack(.7, .4), (0, int(d * SR) - len(clack(.7, .4))))) * v
def motor_thud(v=1):
  return norm(thump(1, 62) + np.pad(ring([980, 1530, 2210], .3, (.05, .04, .03)) * .25, (0, int(.35 * SR) - int(.3 * SR)))) * v
def liquid(d=1.6, v=1):   # oil moving: band-limited noise with a slow sweep and bubbling AM
  tt = t_(d); n = noise(d); out = np.zeros_like(n)
  for i in range(0, len(n), 960):
    hi = min(len(n), i + 960); f = 380 + 900 * (i / len(n)); out[i:hi] = bp(n[max(0, i - 4000):hi], f * .6, f * 1.5)[-(hi - i):]
  am = .65 + .35 * np.sin(2 * np.pi * 7.3 * tt) * np.sin(2 * np.pi * 2.1 * tt)
  return norm(out * am * np.sin(np.pi * tt / d) ** 1.2) * v
def hum(d=.7, v=1):   # solenoid pulling in: click + 100 Hz buzz
  tt = t_(d); bz = np.sign(np.sin(2 * np.pi * 100 * tt)) * .3 + np.sin(2 * np.pi * 200 * tt) * .2
  return norm(lp(bz, 1800) * np.minimum(1, tt / .02) * np.exp(-tt / .35)) * v
def pen(d=.55, v=1):
  tt = t_(d); return norm(bp(noise(d), 3500, 7500) * np.sin(np.pi * tt / d) ** .6) * v
def tick(v=1): return click(2.2, v)
def suck(d=.6, v=1):   # breath in before the hush
  tt = t_(d); return norm(bp(noise(d), 500, 2500) * (tt / d) ** 2 * (1 - tt / d) * 4) * v

for e in EV:
  t, ty = e['t'], e['type']; pan = e.get('pan', 0)
  if ty == 'rise': add(fol, whoosh(1.0, 1), t, .12, 0)
  elif ty == 'flyin': add(fol, whoosh(.8, 1), t, .28, pan)
  elif ty == 'land':
    {'mf': lambda: add(fol, metal_land(), t, .5, .25), 'motor': lambda: add(fol, motor_thud(), t, .55, .4),
     'tank': lambda: add(fol, plastic_thud(), t, .6, -.4)}[e['part']]()
  elif ty == 'launch': add(fol, whoosh(.5, 1), t, .16, pan)
  elif ty == 'seat': add(fol, metal_land(.6), t, .14, pan)
  elif ty == 'close': add(fol, plastic_thud() if e['part'] == 'tank' else motor_thud(), t, .75 if e['part'] == 'tank' else .5, pan)
  elif ty == 'dive': add(fol, whoosh(1.2, 1), t, .3, 0)
  elif ty == 'flow': add(fol, liquid(1.8), t, .2, -.1)
  elif ty == 'valve':
    add(fol, click(.8, 1), t, .3, .1)
    if e.get('id') == 'sv': add(fol, hum(.9), t + .02, .12, .1)
  elif ty == 'size': add(fol, ring([2400 + 300 * e['i'], 3700, 5200], .4), t, .12, -.1)
  elif ty == 'label': add(fol, tick(), t, .06, .5)
  elif ty == 'dim': add(fol, pen(), t, .05, 0)
  elif ty == 'hush': add(fol, suck(), t - .55, .08, 0)
  elif ty == 'pull': add(fol, whoosh(.9, 1), t, .22, 0)
# room tone under everything
rt = lp(brown(DUR + .5), 260) * .006
fol[:len(rt), 0] += rt; fol[:len(rt), 1] += rt * .97
fol = np.stack([hp(fol[:, c], 36) for c in (0, 1)], 1)

# ---------- mix: music ducked in the two hushes; foley on top of the music ----------
tt = np.arange(N) / SR
duck = np.ones(N)
for a, z in [(b(4, 1.5), b(5)), (b(12, 3.2), b(13))]:   # near-silences: music out, room tone only
  duck *= 1 - np.clip((tt - a) / .25, 0, 1) * np.clip((z - .02 - tt) / .05, 0, 1)
m = np.zeros((N, 2)); m[:len(music)] = music[:N]
m *= duck[:, None]
mix = m * .8 + fol * 1.0
mix = np.stack([compress(mix[:, c], thr=.35, ratio=2.5) for c in (0, 1)], 1)
mix = np.stack([limit(mix[:, c], .9) for c in (0, 1)], 1)
(HERE / 'out' / 'stems').mkdir(parents=True, exist_ok=True)
sf.write(HERE / 'out' / 'stems' / 'music.wav', m.astype(np.float32), SR)
sf.write(HERE / 'out' / 'stems' / 'foley.wav', fol.astype(np.float32), SR)
sf.write(HERE / 'out' / 'mix.wav', mix[:int(DUR * SR)].astype(np.float32), SR)
print('mix', DUR, 's · peak', float(np.abs(mix).max()))
(HERE / 'CREDITS.music').write_text('\n'.join(S.credits(sorted({x[1] if isinstance(x, tuple) else x['inst'] for x in ev}))) + '\n')
