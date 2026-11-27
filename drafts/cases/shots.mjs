// 28.11.2026: снимки сайтов для раздела /cases/: node drafts/cases/shots.mjs [slug…]
import {spawn} from 'node:child_process'; import fs from 'node:fs';
const ALL = {
  electricbrakes: 'https://electricbrakes.ru/', ommatech: 'https://ommatech.ru/', turkprivod: 'https://turkprivod.ru/',
  vakacademy: 'https://vak.academy/', journalvak: 'https://journal-vak.ru/', svoimirzvetov: 'https://svoimirzvetov.ru/',
  pitomnikzvezda: 'https://pitomnikzvezda.ru/', parvona: 'https://parvonamuradova.ru/', komnatyspb: 'https://komnatyspb.ru/',
  tkanimix: 'https://tkanimix.ru/', progressive: 'https://progressive-economy.ru/', dopusk: 'https://dopusk.rebornlab.ru/',
  servery: 'https://rebornlab.ru/servery/', hosting: 'https://rebornlab.ru/hosting/', beget: 'https://rebornlab.ru/beget/',
  svobodna: 'https://svobodna.rebornlab.ru/', dissersovet: 'https://dissersovet.rebornlab.ru/', pokovka: 'https://pokovka-new.rebornlab.ru/', fotozvezda: 'https://fotozvezda.ru/', ultravodorod: 'https://xn--80aega5aubamfpk2j.xn--p1ai/', tvoybasseyn: 'https://tvoybasseyn.rebornlab.ru/', kriston: 'https://kriston-konsalting.ru/', teplokabel: 'https://teplokabel.ru/', imgeo: 'https://imgeo.rebornlab.ru/', velan: 'https://velan.rebornlab.ru/', ekomebel: 'https://ekomebel.rebornlab.ru/', nevskaja: 'https://nevskaja2.rebornlab.ru/', paradigma: 'https://paradigma.rebornlab.ru/',
}
const only = process.argv.slice(2); const LIST = Object.entries(ALL).filter(([k]) => !only.length || only.includes(k))
const OUT = 'src/assets/cases', C = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", tmp = fs.mkdtempSync('/private/tmp/claude-501/caseshots-');
const ch = spawn(C, ['--headless=new', '--remote-debugging-port=9371', '--user-data-dir=' + tmp, '--disable-gpu', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
const kill = setTimeout(() => { ch.kill('SIGKILL'); process.exit(2) }, 420000); const sl = ms => new Promise(r => setTimeout(r, ms)); let t; for (let k = 0; k < 30 && !t; k++) { await sl(1000); try { t = (await (await fetch('http://127.0.0.1:9371/json')).json()).find(x => x.type === 'page') } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id] } };
const s = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})) });
await s('Page.enable'); await s('Runtime.enable'); await s('Network.setUserAgentOverride', {userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'});
const hideCookie = `document.querySelectorAll('[id*=cookie i],[class*=cookie i],[class*=consent i]').forEach(e=>{if(e.offsetHeight<400)e.style.display='none'});window.scrollTo(0,0)`
for (const [k, url] of LIST) {
  try {
    await s('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false})
    await s('Page.navigate', {url}); await sl(9000); await s('Runtime.evaluate', {expression: hideCookie}); await sl(800)
    let r = await s('Page.captureScreenshot', {format: 'jpeg', quality: 84, clip: {x: 0, y: 0, width: 1440, height: 900, scale: 1}})
    fs.writeFileSync(`${OUT}/${k}.jpg`, Buffer.from(r.data, 'base64'))
    // длинный снимок для страницы кейса (прокрутка), 1440×3600 → 0.5
    await s('Emulation.setDeviceMetricsOverride', {width: 1440, height: 3600, deviceScaleFactor: 1, mobile: false}); await sl(2500)
    await s('Runtime.evaluate', {expression: `(async()=>{for(let y=0;y<3600;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,250))};scrollTo(0,0)})()`}); await sl(2500)
    await s('Runtime.evaluate', {expression: hideCookie}); await sl(500)
    r = await s('Page.captureScreenshot', {format: 'jpeg', quality: 78, clip: {x: 0, y: 0, width: 1440, height: 3600, scale: 0.5}})
    fs.writeFileSync(`${OUT}/${k}-long.jpg`, Buffer.from(r.data, 'base64'))
    // телефон
    await s('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true})
    await s('Page.navigate', {url}); await sl(8000); await s('Runtime.evaluate', {expression: hideCookie}); await sl(600)
    r = await s('Page.captureScreenshot', {format: 'jpeg', quality: 80, clip: {x: 0, y: 0, width: 390, height: 844, scale: 1}})
    fs.writeFileSync(`${OUT}/${k}-m.jpg`, Buffer.from(r.data, 'base64'))
    console.log(k, 'ok')
  } catch (e) { console.log(k, 'ERR', e.message) }
}
ws.close(); ch.kill('SIGKILL'); clearTimeout(kill); process.exit(0);
