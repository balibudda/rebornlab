// Обложка статьи о доступности: node drafts/dost-cover.mjs → src/assets/journal/beget-10-noyabrya-zamery.jpg (1200×630)
import {spawn} from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", tmp=fs.mkdtempSync('/private/tmp/claude-501/b10-');
const ch=spawn(C,['--headless=new','--remote-debugging-port=9343','--user-data-dir='+tmp,'--disable-gpu','about:blank'],{stdio:'ignore'});
const kill=setTimeout(()=>{ch.kill('SIGKILL');process.exit(2)},60000); const sl=ms=>new Promise(r=>setTimeout(r,ms)); await sl(2500);
const t=(await (await fetch('http://127.0.0.1:9343/json')).json()).find(x=>x.type==='page');
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const pend={}; ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend[m.id]){pend[m.id](m.result||m.error);delete pend[m.id]}};
const s=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
await s('Page.enable'); await s('Emulation.setDeviceMetricsOverride',{width:1200,height:630,deviceScaleFactor:1,mobile:false});
await s('Page.navigate',{url:'file://'+path.resolve('drafts/beget-10-chart.html')}); await sl(1200);
const r=await s('Page.captureScreenshot',{format:'jpeg',quality:88,clip:{x:0,y:0,width:1200,height:630,scale:1}});
fs.writeFileSync('src/assets/journal/beget-10-noyabrya-zamery.jpg',Buffer.from(r.data,'base64'));
ws.close(); ch.kill('SIGKILL'); clearTimeout(kill); process.exit(0);
