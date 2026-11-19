#!/usr/bin/env python3
"""19.11.2026 (Ник: «сделай ещё на 2027 — другой дизайн, другие тексты, те же хостеры… посмотри запросы… вопросы уникальные, не переборщи»).
Рейтинг хостингов 2027 ПО КАТЕГОРИЯМ (чтобы не конкурировать со страницей 2026 — общая таблица): виртуальный хостинг, VPS, облако,
для 1С-Битрикс, для WordPress, для интернет-магазина. Данные — те же замеры (drafts/hm-week.json), тексты — drafts/hosting-texts/_rating-2027.json.
Дизайн: пьедестал первой тройки в каждой категории + список остальных карточками, переключатель категорий.
Запуск: python3 drafts/mk_rating2027.py [publish] → demo/draft-reyting-2027/ | hosting/reyting-2027/"""
import json, re, sys, pathlib, html, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLISH = len(sys.argv) > 1 and sys.argv[1] == 'publish'
OUT = ROOT / ('hosting/reyting-2027' if PUBLISH else 'demo/draft-reyting-2027') / 'index.html'
URL = 'https://rebornlab.ru/hosting/reyting-2027/'
src = (ROOT / 'tools-mk_proverka.py').read_text()
HOSTS = eval(re.search(r'^HOSTS = (\[.*?\n\])', src, re.S | re.M).group(1))
HOST_LINKS = eval(re.search(r'^HOST_LINKS = (\{.*?\})', src, re.M).group(1))
W = json.loads((ROOT / 'drafts' / 'hm-week.json').read_text())
TXF = ROOT / 'drafts' / 'hosting-texts' / '_rating-2027.json'
TX = json.loads(TXF.read_text()) if TXF.exists() else {}
LOGOS = {f.stem: f.name for f in (ROOT / 'assets' / 'hosting-logos').iterdir()}
E = lambda t: html.escape(str(t), quote=False)

# категории: по типу услуги (HOSTS) и проверенным фактам (drafts/hosting-texts/facts.json, партнёрские условия — drafts/partnerki-hostingov.md)
TYPE = {s: t for s, n, t, *_ in HOSTS}
NAME = {s: n for s, n, *_ in HOSTS}
SHARED = [s for s, t in TYPE.items() if 'Хостинг' in t or 'хостинг' in t or 'Домены' in t]
VPS = [s for s, t in TYPE.items() if t in ('VPS', 'Серверы', 'VPS и хостинг')] + ['timeweb', 'regru', 'spaceweb', 'netangels', 'ihc', 'majordomo', 'hostland', 'mchost', 'ruweb', 'masterhost', 'sprinthost']
CLOUD = [s for s, t in TYPE.items() if 'облак' in t.lower() or t == 'Облако']
BITRIX = ['masterhost', 'mchost', 'adminvps', 'regru', 'timeweb', 'ihc']        # у кого в фактах/условиях есть хостинг или VPS под Битрикс
CATS = [('shared', 'Виртуальный хостинг', SHARED), ('vps', 'VPS и выделенные серверы', VPS), ('cloud', 'Облако', CLOUD),
        ('bitrix', 'Для 1С-Битрикс', BITRIX), ('wordpress', 'Для WordPress', SHARED), ('shop', 'Для интернет-магазина', SHARED + CLOUD)]


def score(s):
    w = W['providers'][s]
    return (w['bad'], w['streak'], w['panel_fail'], w['dns_fail'], min(w['dns_ms']) if w['dns_ms'] else 999)


def ok(s):
    w = W['providers'][s]
    return 100 * (1 - w['bad'] / w['checks'])


def logo(s, sz):
    return f'<img src="/assets/hosting-logos/{LOGOS[s]}" alt="{E(NAME[s])}" width="{sz}" height="{sz}" loading="lazy">' if s in LOGOS else ''


def nlink(s, cls=''):   # всё, что ведёт на сайт хостинга, — через /go/h-<slug> (партнёрские коды ставятся на сервере)
    return f'<a class="{cls}" href="/go/h-{s}" target="_blank" rel="noopener sponsored">{E(NAME[s])}</a>'


PRF = ROOT / 'drafts' / 'hosting-texts' / 'prices.json'
PR = json.loads(PRF.read_text()) if PRF.exists() else {'hosts': {}}
PK = {'shared': ('shared',), 'vps': ('vps',), 'cloud': ('cloud', 'vps'), 'bitrix': ('bitrix', 'shared', 'vps'), 'wordpress': ('shared',), 'shop': ('shared', 'cloud', 'vps')}


def _money(x):
    v = x['price']; cur = {'EUR': '€', 'USD': '$'}.get(x.get('currency'), '€' if '€' in str(x.get('note') or '')[:3] else '₽')
    s = f'{v:,.0f}'.replace(',', ' ') if float(v).is_integer() else f'{v:,.2f}'.replace(',', ' ').replace('.', ',')
    return f'от {s} {cur}/мес'

def price(s, cat):
    h = PR['hosts'].get(s, {})
    for k in PK.get(cat, ('shared',)):
        x = h.get(k) or {}
        if x.get('price'):
            return _money(x)
    return ''


def pbtn(s, cat):
    p = price(s, cat)
    return f'<a class="pbtn" href="/go/h-{s}" target="_blank" rel="noopener sponsored">{p} →</a>' if p else f'<a class="pbtn" href="/go/h-{s}" target="_blank" rel="noopener sponsored">сайт хостинга →</a>'


def stat_line(s):
    w = W['providers'][s]
    bits = [f'{str(round(ok(s), 1)).replace(".", ",")}% проверок без сбоя']
    bits.append('ни одного сбоя' if not w['bad'] else f'сбойных проверок: {w["bad"]}')
    if w['dns_ms']:
        bits.append(f'DNS {min(w["dns_ms"])} мс')
    return ' · '.join(bits)


per = f"{W['from'][:5]}–{W['to'][:5]}"
tabs = ''.join(f'<a href="#{k}" class="tab">{E(t)}</a>' for k, t, _ in CATS)
sections = ''
for k, title, members in CATS:
    m = sorted({s for s in members if s in W['providers']}, key=score)
    ct = TX.get('cats', {}).get(k, {})
    pod = ''.join(
        f'<div class="pd p{i + 1}"><div class="pl">{i + 1}</div><a class="lg" href="/go/h-{s}" target="_blank" rel="noopener sponsored">{logo(s, 56)}</a><div class="nm">{nlink(s)}</div>'
        f'<div class="st">{stat_line(s)}</div>{pbtn(s, k)}<a class="more" href="/hosting/{s}/">статус и замеры</a></div>'
        for i, s in enumerate(m[:3]))
    rest = ''.join(
        f'<div class="it"><span class="n">{j + 4}</span><a href="/go/h-{s}" target="_blank" rel="noopener sponsored">{logo(s, 28)}</a><span class="nm">{nlink(s)}</span><span class="st">{stat_line(s)}</span>{("<a class=\"ip\" href=\"/go/h-" + s + "\" target=\"_blank\" rel=\"noopener sponsored\">" + price(s, k) + "</a>") if price(s, k) else ""}</div>'
        for j, s in enumerate(m[3:]))
    sections += (f'<section class="cat" id="{k}"><h2>{E(ct.get("title") or title + " — рейтинг 2027")}</h2>'
                 + (f'<p class="ctx">{E(ct["text"])}</p>' if ct.get('text') else '')
                 + f'<div class="podium">{pod}</div>' + (f'<div class="rest">{rest}</div>' if rest else '') + '</section>')

FAQ = [tuple(x) for x in TX.get('faq', [])]
faq_h = ''.join(f'<details class="qa"><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
chk = ''.join(f'<li>{E(x)}</li>' for x in TX.get('checklist', []))
title = 'Рейтинг хостингов 2027: лучший хостинг, VPS и облако по категориям — независимые замеры'
desc = f'Рейтинг хостингов на 2027 год по категориям: виртуальный хостинг, VPS, облако, для Битрикса, WordPress и магазина. Замеры панели и DNS из России без VPN, неделя {per}.'[:160]
h1 = 'Рейтинг хостингов 2027 <span>по категориям</span>'
ld = [{'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}] if FAQ else []
ld.append({'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Рейтинг хостингов 2027: виртуальный хостинг',
           'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': NAME[s], 'url': f'https://rebornlab.ru/hosting/{s}/'}
                               for i, s in enumerate(sorted({s for s in SHARED if s in W['providers']}, key=score))]})
CSS = '''<style>
.r27{--acc:#7aa7ff}.r27 h1 span{color:var(--acc)}.r27 .lead{max-width:52em}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 26px;position:sticky;top:64px;z-index:5;padding:8px 0;background:var(--bg,#0b0c0d)}
.tab{padding:8px 14px;border-radius:999px;border:1px solid rgba(122,167,255,.35);color:#dfe6ff;font-size:14.5px;text-decoration:none;white-space:nowrap}
.tab:hover{background:rgba(122,167,255,.12)}
.cat{margin:34px 0}.cat h2{font-size:clamp(22px,2.6vw,30px);margin:0 0 10px}.ctx{color:#cfd3cf;font-size:16.5px;line-height:1.65;max-width:52em}
.podium{display:grid;grid-template-columns:1fr 1.12fr 1fr;gap:14px;align-items:end;margin:18px 0 12px}
.pd{background:#15171b;border:1px solid rgba(237,235,230,.09);border-radius:18px;padding:18px 16px;text-align:center;position:relative}
.pd.p1{order:2;padding-top:26px;border-color:rgba(122,167,255,.55);box-shadow:0 0 0 1px rgba(122,167,255,.15),0 18px 40px -20px rgba(122,167,255,.45)}
.pd.p2{order:1}.pd.p3{order:3}
.pd .pl{position:absolute;top:10px;left:14px;font-weight:800;font-size:20px;color:var(--acc)}
.pd .lg img{width:56px;height:56px;border-radius:14px;background:#fff;padding:5px;object-fit:contain}
.pd .nm{font-size:19px;font-weight:800;margin:10px 0 6px}.pd .nm a{color:#fff;text-decoration:none}
.pd .st{color:#aeb4bf;font-size:13.5px;line-height:1.45;min-height:40px}.pd .more{display:block;margin-top:8px;font-size:13px;color:#8f96a3}
.pbtn{display:inline-block;margin-top:12px;padding:9px 16px;border-radius:12px;background:var(--acc);color:#0b0c0d;font-weight:800;text-decoration:none;font-size:15px}
.it .ip{margin-left:10px;white-space:nowrap;font-weight:700;color:var(--acc);text-decoration:none;font-size:13.5px}
.rest{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:8px}
.it{display:flex;align-items:center;gap:10px;background:#121418;border-radius:12px;padding:9px 12px;font-size:14.5px}
.it .n{width:22px;color:#7c8290;font-weight:700}.it img{width:28px;height:28px;border-radius:7px;background:#fff;padding:2px;object-fit:contain}
.it .nm a{color:#eef;text-decoration:none;font-weight:600}.it .st{margin-left:auto;color:#8f96a3;font-size:12.5px;text-align:right}
.chk{columns:2;column-gap:34px;padding-left:20px}.chk li{margin:0 0 10px;break-inside:avoid;color:#cfd3cf;line-height:1.55}
@media (max-width:720px){.podium{grid-template-columns:1fr}.pd.p1,.pd.p2,.pd.p3{order:0}.chk{columns:1}.it .st{display:none}}
</style>'''
main = f'''<main class="pw r27">
  <span class="live"><span class="dot"></span>рейтинг на 2027 год · обновляется по понедельникам · замеры из России без VPN</span>
  <h1>{h1}</h1>
  <p class="lead">{E(TX.get("lead", "Хостинги по категориям — по нашим замерам: раз в 30 минут из России без VPN проверяем панель управления и DNS каждого хостинга."))}</p>
  <nav class="tabs" aria-label="Категории">{tabs}</nav>
  {sections}
  <p class="sub">Неделя замеров: {per}. Цены — самые дешёвые тарифы с сайтов хостингов{(' на ' + PR['checked'][8:10] + '.' + PR['checked'][5:7]) if PR.get('checked') else ''}; точную цену смотрите у хостинга. Ссылки на сайты хостингов — партнёрские. На место в рейтинге это не влияет.</p>
  {('<div class="card seo"><h2>Перед покупкой хостинга проверьте сами</h2><ul class="chk">' + chk + '</ul></div>') if chk else ''}
  {('<article class="card seo"><h2>Как мы считаем</h2><p>' + E(TX["method"]) + '</p><p>Общая таблица всех 27 хостингов за неделю — на странице <a href="/hosting/reyting/">рейтинга хостингов 2026</a>, живой статус каждого — в <a href="/hosting/">мониторинге хостингов</a>.</p></article>') if TX.get('method') else ''}
  {('<div class="card"><h2>Вопросы о выборе хостинга на 2027 год</h2>' + faq_h + '</div>') if FAQ else ''}
</main>'''
tpl = (ROOT / 'hosting' / 'index.html').read_text()
head, rest_ = tpl.split('<main', 1)
foot = rest_.split('</main>', 1)[1]
head = re.sub(r'<title>.*?</title>', f'<title>{E(title)}</title>', head, flags=re.S)
head = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{html.escape(desc)}"', head)
head = re.sub(r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{URL}"', head)
head = re.sub(r'<script type="application/ld\+json">.*?</script>', '', head, flags=re.S)
head = head.replace('</head>', ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld) + CSS + '</head>', 1)
if not PUBLISH:
    head = head.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">', 1)
foot = re.sub(r'<script>\s*\(function \(\) \{\s*var KEY.*?</script>', '', foot, flags=re.S)
foot = re.sub(r'<script>window\.RL_LG=.*?</script>', '', foot, flags=re.S)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(head + main + foot)
print(OUT, '| категорий:', len(CATS), '| вопросов:', len(FAQ), '| текстов категорий:', len(TX.get('cats', {})))
