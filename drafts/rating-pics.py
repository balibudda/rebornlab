#!/usr/bin/env python3
"""19.11.2026: картинки рейтинга хостингов (Ник: «пару картинок в описание, чтобы легче продвинуть»):
#bars — сбойные проверки за неделю по 27 хостингам (с логотипами), #how — схема, как считаем. Данные — drafts/hm-week.json.
python3 drafts/rating-pics.py && node drafts/rating-pics.mjs  → assets/rating/*.png"""
import json, re, pathlib, base64
ROOT = pathlib.Path(__file__).resolve().parent.parent
W = json.loads((ROOT / 'drafts' / 'hm-week.json').read_text())
src = (ROOT / 'tools-mk_proverka.py').read_text()
HOSTS = eval(re.search(r'^HOSTS = (\[.*?\n\])', src, re.S | re.M).group(1))
LG = {f.stem: f for f in (ROOT / 'assets' / 'hosting-logos').iterdir()}
MIME = {'.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg'}
rows = [(n, s, W['providers'][s]) for s, n, *_ in HOSTS if s in W['providers']]
rows.sort(key=lambda x: (x[2]['bad'], x[2]['streak'], x[2]['panel_fail'], x[2]['dns_fail'], min(x[2]['dns_ms']) if x[2]['dns_ms'] else 999))   # как в таблице
mx = max(1, max(w['bad'] for _, _, w in rows))
per = f"{W['from'][:5]}–{W['to'][:5]}"


def img(s):
    f = LG.get(s)
    return f'<img src="data:{MIME.get(f.suffix, "image/png")};base64,{base64.b64encode(f.read_bytes()).decode()}">' if f else ''


bars = ''.join(f'<div class="r"><div class="nm">{img(s)}<span>{n}</span></div><div class="tr"><i style="width:{max(0.6, w["bad"] / mx * 100):.1f}%" class="{"z" if not w["bad"] else "b"}"></i></div>'
               f'<div class="v">{w["bad"] if w["bad"] else "0 ✓"}</div></div>' for n, s, w in rows)
CSS = '''*{box-sizing:border-box}body{margin:0;background:#000;font-family:-apple-system,"SF Pro Display","Segoe UI",Roboto,sans-serif}
.pic{width:1200px;position:relative;overflow:hidden;background:radial-gradient(900px 500px at 100% 0,rgba(198,242,78,.10),transparent 60%),#101113;color:#edebe6;padding:40px 52px 50px;margin-bottom:20px}
.k{font-size:19px;color:#9a9890}.h{font-size:34px;font-weight:800;margin:8px 0 22px;line-height:1.15}.h em{font-style:normal;color:#c6f24e}
.site{position:absolute;right:52px;bottom:18px;font-size:16px;color:#9a9890}
.cols{columns:2;column-gap:40px}.r{display:grid;grid-template-columns:190px 1fr 46px;gap:10px;align-items:center;height:36px;break-inside:avoid}
.nm{display:flex;align-items:center;gap:9px;font-size:16px;white-space:nowrap}.nm img{width:24px;height:24px;border-radius:6px;background:#fff;padding:2px;object-fit:contain}
.tr{height:12px;background:rgba(237,235,230,.07);border-radius:6px}.tr i{display:block;height:12px;border-radius:6px}.tr i.z{background:#c6f24e}.tr i.b{background:#ff8a65}
.v{font-size:15px;color:#cfcdc6;text-align:right}
.flow{display:flex;align-items:center;gap:18px;margin-top:10px}.st{flex:1;background:#16181b;border:1px solid rgba(237,235,230,.1);border-radius:16px;padding:20px;min-height:170px}
.st .n{font-size:15px;color:#c6f24e;font-weight:700}.st .t{font-size:22px;font-weight:800;margin:8px 0}.st .d{font-size:16px;color:#cfcdc6;line-height:1.4}.ar{font-size:30px;color:#c6f24e}'''
html = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="pic" id="bars"><div class="k">Рейтинг хостингов · неделя {per} · по 336 проверок у каждого, из России без VPN</div>
<div class="h">Сбойные проверки за неделю: <em>чем короче полоса, тем стабильнее</em></div>
<div class="cols">{bars}</div><div class="site">rebornlab.ru</div></div>
<div class="pic" id="how"><div class="k">Как мы составляем рейтинг хостингов</div>
<div class="h">Одинаково для всех 27: <em>панель и DNS каждые 30 минут</em></div>
<div class="flow">
 <div class="st"><div class="n">1 · откуда</div><div class="t">Сервер в России</div><div class="d">Проверяем без VPN, как обычный клиент хостинга из России.</div></div><div class="ar">→</div>
 <div class="st"><div class="n">2 · что</div><div class="t">Панель и DNS</div><div class="d">Открывается ли панель управления, отвечают ли DNS-серверы для доменов.</div></div><div class="ar">→</div>
 <div class="st"><div class="n">3 · как часто</div><div class="t">48 раз в сутки</div><div class="d">336 проверок за неделю у каждого хостинга, история — на его странице.</div></div><div class="ar">→</div>
 <div class="st"><div class="n">4 · место</div><div class="t">Меньше сбоев — выше</div><div class="d">Потом — короче самый долгий сбой и быстрее DNS. Партнёрки не влияют.</div></div>
</div><div class="site">rebornlab.ru</div></div>
</body></html>'''
(ROOT / 'drafts' / 'rating-pics.html').write_text(html)
print('ok', len(rows))
