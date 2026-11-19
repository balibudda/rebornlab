// 19.11.2026: скриншоты публичных страниц с историями блокировок WB Кошелька (для черновика поста). node drafts/wb-shots.mjs
// По одной странице, пауза — бережно к сайтам. Снимок верхней части страницы (вопрос и первый ответ), 900×1600.
import {spawn} from 'node:child_process'; import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync('drafts/wb-stories.json', 'utf8'));
const OUT = 'demo/draft-wb-bank/shots'; fs.mkdirSync(OUT, {recursive: true});
const C = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", tmp = fs.mkdtempSync('/private/tmp/claude-501/wbshots-');
const ch = spawn(C, ['--headless=new', '--remote-debugging-port=9381', '--user-data-dir=' + tmp, '--disable-gpu', '--lang=ru-RU', 'about:blank'], {stdio: 'ignore'});
const kill = setTimeout(() => { ch.kill('SIGKILL'); process.exit(2) }, 900000); const sl = ms => new Promise(r => setTimeout(r, ms)); await sl(6000);
const t = (await (await fetch('http://127.0.0.1:9381/json')).json()).find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id] } };
const s = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); setTimeout(() => { if (pend[i]) { delete pend[i]; r({}) } }, 40000) });
await s('Page.enable'); await s('Runtime.enable');
await s('Emulation.setDeviceMetricsOverride', {width: 1280, height: 1600, deviceScaleFactor: 1, mobile: false});
await s('Network.enable'); await s('Network.setUserAgentOverride', {userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36', acceptLanguage: 'ru-RU,ru'});
const done = {};
for (const r of rows.filter(x => !process.argv[2] || String(x.n) === process.argv[2])) {
  const url = r.url || rows.find(x => x.n === 2).url;
  if (done[url]) { fs.copyFileSync(done[url], `${OUT}/s${r.n}.png`); console.log(r.n, 'копия'); continue; }
  await s('Page.navigate', {url}); await sl(7000);
  // закрыть всплывашки cookie/регион, если есть; прокрутить к вопросу на banki.ru
  await s('Runtime.evaluate', {expression: `(() => { for (const b of document.querySelectorAll('button')) { if (/принять|согласен|понятно|закрыть|ok/i.test(b.textContent||'')) try{b.click()}catch(e){} } const q=document.querySelector('[data-test="question-text"], .l-question, h1'); if(q) q.scrollIntoView({block:'start'}); window.scrollBy(0,-80); })()`});
  await sl(1500);
  const txt = (await s('Runtime.evaluate', {expression: 'document.body ? document.body.innerText.slice(0, 400) : ""', returnByValue: true})).result?.value || '';
  if (/captcha|проверка браузера|Access denied|403 Forbidden|робот/i.test(txt) || txt.length < 80) { console.log(r.n, 'НЕ СНЯЛ', txt.slice(0, 60).replace(/\n/g, ' ')); continue; }
  const shot = await s('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: 1280, height: 1400, scale: 1}});
  if (shot.data) { fs.writeFileSync(`${OUT}/s${r.n}.png`, Buffer.from(shot.data, 'base64')); done[url] = `${OUT}/s${r.n}.png`; console.log(r.n, 'ok'); }
  await sl(2500);
}
ws.close(); ch.kill('SIGKILL'); clearTimeout(kill); process.exit(0);
