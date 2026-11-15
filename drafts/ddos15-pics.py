#!/usr/bin/env python3
"""Картинки новости «DDoS на Бегет 15.11 — замеры» (15.11.2026): python3 drafts/ddos15-pics.py <beget.json> → drafts/ddos15-pics.html"""
import json, sys, datetime as D
MSK = D.timezone(D.timedelta(hours=3))
h = json.load(open(sys.argv[1]))['history']
pts = [x for x in h if D.datetime.fromtimestamp(x['t'], MSK).date() == D.date(2026, 11, 15)][::2]
W, H, X0, Y0 = 1096, 330, 0, 0
def path(key, lo, hi):
    n = len(pts) - 1
    return ' '.join(f"{'M' if i == 0 else 'L'}{i / n * W:.0f},{H - (p[key] - lo) / (hi - lo) * H:.0f}" for i, p in enumerate(pts))
def xlab():
    n = len(pts) - 1
    return ''.join(f'<text x="{i / n * W:.0f}" y="{H + 26}" text-anchor="middle">{D.datetime.fromtimestamp(p["t"], MSK):%H:%M}</text>' for i, p in enumerate(pts) if i % 2 == 0)
# окно атаки 15:45–… по времени
t0, t1 = pts[0]['t'], pts[-1]['t']
ax = (D.datetime(2026, 11, 15, 15, 45, tzinfo=MSK).timestamp() - t0) / (t1 - t0) * W
lo, hi = 0, 1000
day = f'''<svg width="{W}" height="{H + 40}" style="overflow:visible;font-size:15px;fill:#9a9890">
<rect x="{ax:.0f}" y="0" width="{W - ax:.0f}" height="{H}" fill="rgba(255,120,90,.10)"/>
<text x="{ax + 10:.0f}" y="22" fill="#ff8a6b" style="font-size:16px">DDoS по сообщению Beget: с 15:45</text>
{''.join(f'<line x1="0" x2="{W}" y1="{H - v / 1000 * H:.0f}" y2="{H - v / 1000 * H:.0f}" stroke="rgba(237,235,230,.08)"/><text x="-8" y="{H - v / 1000 * H + 5:.0f}" text-anchor="end">{v}</text>' for v in (0, 250, 500, 750, 1000))}
<path d="{path('s', lo, hi)}" fill="none" stroke="#c6f24e" stroke-width="4"/>
<path d="{path('h', lo, hi)}" fill="none" stroke="#7aa7ff" stroke-width="4"/>
{xlab()}</svg>'''
hrs = [('12–15', 6, 19, 2, 8), ('15–18', 7, 21, 16, 29), ('18–21', 1, 25, 4, 6), ('21–22:30', 28, 60, 1, 6)]
mx = 60
cols = ''.join(f'''<div class="col"><div class="bars">
<i class="a" style="height:{a / mx * 280:.0f}px"><b>{a}</b></i><i class="b" style="height:{b / mx * 280:.0f}px"><b>{b}</b></i>
<span class="gap"></span>
<i class="c" style="height:{c / mx * 280:.0f}px"><b>{c}</b></i><i class="d" style="height:{d / mx * 280:.0f}px"><b>{d}</b></i>
</div><div class="dl">{t} ч<br><small>14.11 · 15.11</small></div></div>''' for t, a, b, c, d in hrs)
CSS = '''*{box-sizing:border-box}body{margin:0;background:#000;font-family:-apple-system,"SF Pro Display","Segoe UI",Roboto,sans-serif}
.pic{width:1200px;position:relative;overflow:hidden;background:radial-gradient(900px 500px at 100% 0,rgba(198,242,78,.10),transparent 60%),#101113;color:#edebe6;padding:44px 52px 60px;margin-bottom:20px}
.k{font-size:20px;color:#9a9890}.h{font-size:36px;font-weight:800;margin:8px 0 26px;line-height:1.15}.h em,h1 em{font-style:normal;color:#c6f24e}
.site{position:absolute;right:52px;bottom:22px;font-size:16px;color:#9a9890}
.lg{display:flex;gap:24px;font-size:17px;margin-top:22px;color:#cfcdc6;flex-wrap:wrap}.lg span:before{content:'';display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:8px;vertical-align:-1px}
.lg .u:before{background:#c6f24e}.lg .s:before{background:#7aa7ff}.lg .a:before{background:#6b6a66}.lg .c:before{background:#ff8a6b}
.chart{display:flex;gap:20px;align-items:flex-end;height:340px;padding-top:30px}.col{flex:1;text-align:center}.bars{display:flex;gap:4px;align-items:flex-end;justify-content:center;height:300px}
.bars i{display:block;width:40px;border-radius:6px 6px 0 0;position:relative;min-height:3px}.bars i.a{background:#6b6a66}.bars i.b{background:#a7a59e}.bars i.c{background:#ff8a6b}.bars i.d{background:#c6f24e}
.bars .gap{width:14px}.bars b{position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:15px;color:#cfcdc6}.dl{font-size:17px;color:#cfcdc6;margin-top:8px}.dl small{color:#9a9890;font-size:14px}
.lg .b:before{background:#a7a59e}.lg .d:before{background:#c6f24e}
#cover{height:630px}#cover h1{font-size:62px;line-height:1.05;margin:14px 0 30px;font-weight:800;letter-spacing:-.01em}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{background:#16181b;border:1px solid rgba(237,235,230,.1);border-radius:16px;padding:20px 22px;height:170px}
.n{font-size:54px;font-weight:800;line-height:1}.t{font-size:19px;font-weight:700;margin-top:12px;line-height:1.25}.n small{font-size:26px;color:#9a9890}'''
html = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="pic" id="cover"><div class="k">Бегет (Beget) · 15 ноября 2026 · DDoS-атака · наши замеры каждые 15 минут</div>
<h1>Бегет отразил атаку<br><em>до 2,1 Тбит/с</em> — наши замеры</h1>
<div class="g">
 <div class="card"><div class="n" style="color:#c6f24e">690<small> / 1000</small></div><div class="t">сайтов открывается в 22:17 — как и до атаки (687)</div></div>
 <div class="card"><div class="n" style="color:#7aa7ff">507<small> / 1524</small></div><div class="t">серверов хостинга отвечает — без изменений</div></div>
 <div class="card"><div class="n" style="color:#ff8a6b">16</div><div class="t">падений сайтов в боте за 15–18 ч (накануне — 7)</div></div>
</div><div class="site">rebornlab.ru</div></div>
<div class="pic" id="day"><div class="k">Замеры rebornlab.ru, 15 ноября 2026, время московское</div>
<div class="h">Сайты и серверы Бегета <em>в день атаки</em></div>
<div style="padding-left:44px">{day}</div>
<div class="lg"><span class="u">сайтов открывается (из 1 000)</span><span class="s">серверов хостинга отвечает (из 1 524)</span></div><div class="site">rebornlab.ru</div></div>
<div class="pic" id="hours"><div class="k">Бот @rebornlab_bot, ~1 600 сайтов, время московское (15.11 — до 22:30)</div>
<div class="h">Падения и возвращения сайтов: <em>14 и 15 ноября</em></div>
<div class="chart">{cols}</div>
<div class="lg"><span class="a">14.11 упал</span><span class="b">14.11 вернулся</span><span class="c">15.11 упал</span><span class="d">15.11 вернулся</span></div><div class="site">rebornlab.ru</div></div>
</body></html>'''
open('drafts/ddos15-pics.html', 'w', encoding='utf-8').write(html); print('ok', len(pts))
