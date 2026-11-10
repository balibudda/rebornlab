// Снимки схем для статьи о доступности (10.11.2026): node drafts/dost-pics.mjs → src/assets/journal/dost-1..4.png
import {spawn} from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", HTML='file://'+path.resolve('drafts/dost-pics.html'), OUT='src/assets/journal';
const tmp=fs.mkdtempSync('/private/tmp/claude-501/dostpics-');
const ch=spawn(C,['--headless=new','--remote-debugging-port=9341','--user-data-dir='+tmp,'--disable-gpu','about:blank'],{stdio:'ignore'});
const kill=setTimeout(()=>{ch.kill('SIGKILL');process.exit(2)},60000);
const sl=ms=>new Promise(r=>setTimeout(r,ms)); await sl(2500);
const t=(await (await fetch('http://127.0.0.1:9341/json')).json()).find(x=>x.type==='page');
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const pend={}; ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend[m.id]){pend[m.id](m.result||m.error);delete pend[m.id]}};
const s=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
await s('Page.enable'); await s('Emulation.setDeviceMetricsOverride',{width:1300,height:900,deviceScaleFactor:2,mobile:false});
await s('Page.navigate',{url:HTML}); await sl(1500);
for (const n of [1,2,3,4]) {
  const r=(await s('Runtime.evaluate',{expression:`JSON.stringify(document.getElementById('p${n}').getBoundingClientRect())`,returnByValue:true})).result.value;
  const b=JSON.parse(r);
  const shot=await s('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:b.x,y:b.y+0,width:b.width,height:b.height,scale:1}});
  fs.writeFileSync(`${OUT}/dost-${n}.png`,Buffer.from(shot.data,'base64')); console.log('dost-'+n, Math.round(b.width)+'x'+Math.round(b.height));
}
ws.close(); ch.kill('SIGKILL'); clearTimeout(kill); process.exit(0);
