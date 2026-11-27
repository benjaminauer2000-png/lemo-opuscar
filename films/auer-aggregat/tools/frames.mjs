// Resumable frame render: node films/auer-aggregat/tools/frames.mjs <demo> [--fps 24] [--workers 2] [--q 'ss=1.5']
// writes <demo>/out/frames/f_00000.jpg …, skips frames already on disk; encode afterwards with ffmpeg
import fs from 'fs'; import path from 'path';
import { openDemo, closeServer } from '../../../core/render/page.mjs';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = args[0], FPS = +opt('--fps', 24), WK = +opt('--workers', 2), Q = opt('--q', '');
const fdir = path.join(dir, 'out', 'frames'); fs.mkdirSync(fdir, { recursive: true });
const name = f => path.join(fdir, `f_${String(f).padStart(5, '0')}.jpg`);
const probe = await openDemo(dir, { q: Q }); const DUR = await probe.page.evaluate(() => window.DUR); await probe.browser.close();
const TOTAL = Math.round(DUR * FPS);
const todo = [...Array(TOTAL).keys()].filter(f => !fs.existsSync(name(f)));
console.log(`${TOTAL - todo.length}/${TOTAL} on disk, ${todo.length} to go`);
let next = 0, done = 0; const t0 = Date.now();
await Promise.all([...Array(WK)].map(async () => {
  const { browser, page } = await openDemo(dir, { q: Q });
  while (next < todo.length) {
    const f = todo[next++];
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    fs.writeFileSync(name(f) + '.tmp', buf); fs.renameSync(name(f) + '.tmp', name(f));
    if (++done % 20 === 0) console.log(`${TOTAL - todo.length + done}/${TOTAL}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}));
console.log('done frames', TOTAL); closeServer();
