// Картинки статьи «Сайт вернулся. Переезжать или подстраховаться» (11.11.2026): node drafts/podstr-pics.mjs
import {spawn} from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", HTML='file://'+path.resolve('drafts/podstr-pics.html'), OUT='src/assets/journal';
const tmp=fs.mkdtempSync('/private/tmp/claude-501/podstr-');
const ch=spawn(C,['--headless=new','--remote-debugging-port=9346','--user-data-dir='+tmp,'--disable-gpu','--ignore-certificate-errors','about:blank'],{stdio:'ignore'});
const kill=setTimeout(()=>{ch.kill('SIGKILL');process.exit(2)},120000);
const sl=ms=>new Promise(r=>setTimeout(r,ms)); await sl(2500);
const t=(await (await fetch('http://127.0.0.1:9346/json')).json()).find(x=>x.type==='page');
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const pend={}; ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend[m.id]){pend[m.id](m.result||m.error);delete pend[m.id]}};
const s=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
const box=async(sel)=>JSON.parse((await s('Runtime.evaluate',{expression:`JSON.stringify(document.querySelector('${sel}').getBoundingClientRect())`,returnByValue:true})).result.value);
await s('Page.enable');
// обложка 1200×630
await s('Emulation.setDeviceMetricsOverride',{width:1300,height:900,deviceScaleFactor:1,mobile:false});
await s('Page.navigate',{url:HTML}); await sl(1500);
let b=await box('#cover'); let r=await s('Page.captureScreenshot',{format:'jpeg',quality:90,captureBeyondViewport:true,clip:{x:b.x,y:b.y,width:1200,height:630,scale:1}});
fs.writeFileSync(`${OUT}/sajt-vernulsya-pereezzhat-ili-podstrahovatsya.jpg`,Buffer.from(r.data,'base64')); console.log('обложка');
// схемы ×2
await s('Emulation.setDeviceMetricsOverride',{width:1300,height:900,deviceScaleFactor:2,mobile:false});
await s('Page.navigate',{url:HTML}); await sl(1500);
for (const n of [1,2,3,4]) { b=await box('#p'+n);
  r=await s('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:b.x,y:b.y,width:b.width,height:b.height,scale:1}});
  fs.writeFileSync(`${OUT}/podstr-${n}.png`,Buffer.from(r.data,'base64')); console.log('podstr-'+n, Math.round(b.width)+'x'+Math.round(b.height)); }
// скриншоты: страница Бегета «Домен не прилинкован» и наша проверка сервера по IP (высокое окно без прокрутки, вырезаем блок)
await s('Emulation.setDeviceMetricsOverride',{width:1200,height:720,deviceScaleFactor:1,mobile:false});
await s('Page.navigate',{url:'http://45.130.41.148/'}); await sl(3000);
r=await s('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1200,height:720,scale:1}});
fs.writeFileSync(`${OUT}/podstr-beget-ne-prilinkovan.png`,Buffer.from(r.data,'base64')); console.log('beget');
await s('Emulation.setDeviceMetricsOverride',{width:1200,height:2600,deviceScaleFactor:1,mobile:false});
await s('Page.navigate',{url:'https://rebornlab.ru/beget/server/#45.130.41.148'}); await sl(12000);
await s('Runtime.evaluate',{expression:`(function(){var c=document.getElementById('cookie'); if(c) c.hidden=true; var x=document.querySelector('.rlc-btn'); if(x) x.style.display='none'; window.scrollTo(0,0);})()`}); await sl(500);
const top=(await box('#check')).top, res=await box('#res');
const y=Math.max(0,top-12), h=Math.min(900, Math.max(400, res.bottom-top+24));
r=await s('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y,width:1200,height:h,scale:1}});
fs.writeFileSync(`${OUT}/podstr-proverka-servera.png`,Buffer.from(r.data,'base64')); console.log('проверка', Math.round(y), Math.round(h));
ws.close(); ch.kill('SIGKILL'); clearTimeout(kill); process.exit(0);
