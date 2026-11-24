// Обложка рассылки/страницы /servery/: node drafts/servery-cover.mjs → drafts/servery-cover.jpg
import {spawn} from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", tmp=fs.mkdtempSync('/private/tmp/claude-501/srvcov-');
const ch=spawn(C,['--headless=new','--remote-debugging-port=9361','--user-data-dir='+tmp,'--disable-gpu','about:blank'],{stdio:'ignore'});
const kill=setTimeout(()=>{ch.kill('SIGKILL');process.exit(2)},60000); const sl=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<30;i++){try{await fetch("http://127.0.0.1:9361/json");break}catch{await sl(500)}}
const t=(await (await fetch('http://127.0.0.1:9361/json')).json()).find(x=>x.type==='page');
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const pend={}; ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend[m.id]){pend[m.id](m.result||m.error);delete pend[m.id]}};
const s=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
await s('Page.enable'); await s('Emulation.setDeviceMetricsOverride',{width:1200,height:630,deviceScaleFactor:1,mobile:false});
await s('Page.navigate',{url:'file://'+path.resolve('drafts/servery-cover.html')}); await sl(1500);
const shot=await s('Page.captureScreenshot',{format:'jpeg',quality:90,clip:{x:0,y:0,width:1200,height:630,scale:1}});
fs.writeFileSync('drafts/servery-cover.jpg',Buffer.from(shot.data,'base64')); console.log('drafts/servery-cover.jpg');
ws.close(); ch.kill('SIGKILL'); clearTimeout(kill); await sl(300); process.exit(0);
