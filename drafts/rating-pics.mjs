// Снимки картинок новости «хостинги, 19 ноября» (19.11.2026): node drafts/noyabr19-pics.mjs
// Снимки картинок новости «хостинги, 19 ноября» (19.11.2026): node drafts/noyabr19-pics.mjs
import {spawn} from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2] || 'assets/rating', SLUG = 'hostingi-noyabr-2026-chto-izvestno';
const C = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", tmp = fs.mkdtempSync('/private/tmp/claude-501/ratpics-');
const ch = spawn(C, ['--headless=new', '--remote-debugging-port=9367', '--user-data-dir=' + tmp, '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
const kill = setTimeout(() => { ch.kill('SIGKILL'); process.exit(2) }, 60000); const sl = ms => new Promise(r => setTimeout(r, ms)); await sl(6000);
const t = (await (await fetch('http://127.0.0.1:9367/json')).json()).find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id] } };
const s = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})) });
await s('Page.enable'); await s('Runtime.enable'); await s('Emulation.setDeviceMetricsOverride', {width: 1200, height: 3000, deviceScaleFactor: 1, mobile: false});
await s('Page.navigate', {url: 'file://' + path.resolve('drafts/rating-pics.html')}); await sl(1200);
for (const [el, file, fmt] of [['bars', 'rating-bars.png', 'png'], ['how', 'rating-how.png', 'png']]) {
  const b = (await s('Runtime.evaluate', {expression: `JSON.stringify(document.getElementById('${el}').getBoundingClientRect())`, returnByValue: true})).result.value;
  const r = JSON.parse(b);
  const shot = await s('Page.captureScreenshot', {format: fmt, quality: fmt === 'jpeg' ? 88 : undefined, clip: {x: 0, y: r.y, width: 1200, height: r.height, scale: 1}});
  fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64')); console.log(file, Math.round(r.height));
}
ws.close(); ch.kill('SIGKILL'); clearTimeout(kill); process.exit(0);
