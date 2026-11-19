#!/usr/bin/env python3
"""19.11.2026 (Ник: «сделать рейтинг хостингов плавающий… страницу пока отдельно, партнёрки добавим»).
Рейтинг 27 хостингов по НАШИМ замерам за неделю (drafts/hm-week.json): одинаково для всех — панель управления и DNS,
48 проверок в сутки из России без VPN. Сайты клиентов в оценку не входят (у многих выборка мала).
Партнёрская ссылка на место НЕ влияет — колонка «сайт хостинга» с подписью.
Запуск: python3 drafts/mk_rating.py [publish]  → черновик demo/draft-reyting-hostingov/ (noindex) | боевой hosting/reyting/
Шапка/подвал/стили берутся из готовой страницы hosting/index.html."""
import json, re, sys, pathlib, html, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLISH = len(sys.argv) > 1 and sys.argv[1] == 'publish'
OUT = ROOT / ('hosting/reyting' if PUBLISH else 'demo/draft-reyting-hostingov') / 'index.html'
URL = 'https://rebornlab.ru/hosting/reyting/'
src = (ROOT / 'tools-mk_proverka.py').read_text()
HOSTS = eval(re.search(r'^HOSTS = (\[.*?\n\])', src, re.S | re.M).group(1))
HOST_LINKS = eval(re.search(r'^HOST_LINKS = (\{.*?\})', src, re.M).group(1))
AD_NOTE = eval(re.search(r'^AD_NOTE = (\{.*?\})', src, re.M).group(1))
W = json.loads((ROOT / 'drafts' / 'hm-week.json').read_text())
PRF = ROOT / 'drafts' / 'hosting-texts' / 'prices.json'   # 19.11: цены с сайтов хостингов (обновлять раз в месяц)
PR = json.loads(PRF.read_text()) if PRF.exists() else {'hosts': {}}


def _money(x):
    v = x['price']; cur = {'EUR': '€', 'USD': '$'}.get(x.get('currency'), '€' if '€' in str(x.get('note') or '')[:3] else '₽')
    s = f'{v:,.0f}'.replace(',', ' ') if float(v).is_integer() else f'{v:,.2f}'.replace(',', ' ').replace('.', ',')
    return f'от {s} {cur}/мес'

def price(slug, kinds=('shared', 'vps', 'cloud', 'bitrix')):
    h = PR['hosts'].get(slug, {})
    for k in kinds:
        x = h.get(k) or {}
        if x.get('price'):
            return _money(x)
    return ''


PREV = ROOT / 'drafts' / 'rating-prev.json'          # места прошлой недели — для стрелок ↑↓
prev = json.loads(PREV.read_text()) if PREV.exists() else {}


def pl(n, a, b, c):
    m, h = n % 10, n % 100
    return f'{n} {a if m == 1 and h != 11 else b if 2 <= m <= 4 and not 12 <= h <= 14 else c}'


def dur(k):
    m = k * 30
    if not m:
        return '—'
    return f'{m} мин' if m < 60 else (f'{m // 60} ч {m % 60} мин' if m % 60 else f'{m // 60} ч')


LOGOS = {f.stem: f.name for f in (ROOT / 'assets' / 'hosting-logos').iterdir()}


def logo(slug, name):
    return f'<img class="hl-logo" src="/assets/hosting-logos/{LOGOS[slug]}" alt="{html.escape(name)}" width="28" height="28" loading="lazy">' if slug in LOGOS else ''


def name_link(r):   # Ник 19.11: всё, что ведёт на сайт хостинга, — через /go/h-<slug> (nginx snippets/rl-go-hosting.conf: туда ставим партнёрские коды)
    return f'<a href="/go/h-{r["slug"]}" target="_blank" rel="noopener sponsored">{html.escape(r["name"])}</a>'


rows = []
for slug, name, typ, panel, ns in HOSTS:
    w = W['providers'].get(slug)
    if not w:
        continue
    ok = 100 * (1 - w['bad'] / w['checks'])
    dns = min(w['dns_ms']) if w['dns_ms'] else None
    rows.append({'slug': slug, 'name': name, 'typ': typ, 'ok': ok, 'bad': w['bad'], 'streak': w['streak'], 'panel_fail': w['panel_fail'],
                 'dns_fail': w['dns_fail'], 'dns_total': w['dns_total'], 'dns': dns, 'checks': w['checks']})
# место (Ник 19.11: «все на 1 месте — будто данных нет»): меньше сбойных проверок → короче самый долгий сбой → реже не открывалась панель
# → реже молчал DNS → быстрее DNS. Места без повторов.
rows.sort(key=lambda r: (r['bad'], r['streak'], r['panel_fail'], r['dns_fail'], r['dns'] if r['dns'] is not None else 999))
for i, r in enumerate(rows):
    place = i + 1
    r['place'] = place
    p = prev.get(r['slug'])
    r['move'] = '' if p is None or p == place else (f'<span class="up">▲{p - place}</span>' if p > place else f'<span class="dn">▼{place - p}</span>')

per = f"{W['from'][:5]}–{W['to'][:5]}"
clean = [r for r in rows if not r['bad']]
trs = ''.join(
    f'<tr><td class="pl">{r["place"]} {r["move"]}</td>'
    f'<td><div class="hn">{logo(r["slug"], r["name"])}<div>{name_link(r)}<div class="ty">{html.escape(r["typ"].lower())} · <a href="/hosting/{r["slug"]}/">статус и замеры</a></div></div></div></td>'
    f'<td class="num">{r["checks"]}</td><td class="num"><b>{str(round(r["ok"], 1)).replace(".", ",")}%</b></td><td class="num">{r["bad"]}</td><td class="num">{dur(r["streak"]) if r["streak"] else "0"}</td>'
    f'<td class="num">{r["panel_fail"]}</td><td class="num">{r["dns_fail"] if r["dns_total"] else "нет общих DNS"}</td>'
    f'<td class="num">{str(r["dns"]) + " мс" if r["dns"] is not None else "—"}</td>'
    f'<td class="num">{("<a class=\"pr\" href=\"/go/h-" + r["slug"] + "\" target=\"_blank\" rel=\"noopener sponsored\">" + price(r["slug"]) + "</a>") if price(r["slug"]) else "—"}</td></tr>'
    for r in rows)
top3 = ', '.join(r['name'] for r in rows[:3])
desc = (f'Рейтинг 27 хостингов по доступности за неделю {per}: панель и DNS, 336 проверок у каждого из России без VPN. '
        f'Без сбоев — {pl(len(clean), "хостинг", "хостинга", "хостингов")}. Обновляется по понедельникам.')[:160]
title = f'Рейтинг хостингов 2026: лучшие по доступности за неделю — замеры из России без VPN'
h1 = 'Рейтинг хостингов 2026: <em>кто работает стабильнее всех</em>'
FAQ = [
    ('Как считается место в рейтинге?', f'Каждый хостинг мы проверяем одинаково: раз в 30 минут из России без VPN открываем его панель управления и опрашиваем DNS-серверы, через которые работают домены клиентов. За неделю это {rows[0]["checks"]} проверок у каждого. Выше тот, у кого меньше проверок со сбоем. Если поровну — выше тот, у кого самый долгий сбой короче, потом — у кого быстрее отвечает DNS.'),
    ('Почему в рейтинге не учитываются сайты клиентов?', 'Сайты клиентов мы тоже открываем, но у многих хостингов в нашей выборке пока 3–6 сайтов. Один заброшенный владельцем сайт в такой выборке выглядел бы как «сбой хостинга», а это нечестно. Поэтому место считаем только по тому, что одинаково проверяется у всех: панель и DNS.'),
    ('Партнёрские ссылки влияют на место?', 'Нет. Ссылки на сайты хостингов в таблице партнёрские: если купить услугу по ним, хостинг заплатит нам вознаграждение. Место от этого не меняется — его считает программа по замерам, одинаково для всех 27 хостингов.'),
    ('Как часто обновляется рейтинг?', 'Раз в неделю, по понедельникам, вместе с замерами на страницах хостингов. Стрелка рядом с местом показывает, насколько хостинг поднялся или опустился за неделю. Живой статус прямо сейчас — на странице каждого хостинга, он обновляется каждые 30 минут.'),
    ('Значит ли первое место, что хостинг лучший?', 'Нет. Рейтинг показывает только одно: насколько стабильно за последнюю неделю отвечали панель и DNS хостинга из России. Цена, скорость сайтов, поддержка и удобство в нём не учитываются. Неделя — короткий срок: один сбой может сдвинуть хостинг на много мест.'),
    ('Почему у Tilda и некоторых облаков DNS «не проверяем»?', 'У них нет общих DNS-серверов для доменов клиентов: каждый клиент указывает свои. Поэтому у таких сервисов мы проверяем только панель управления, и сбоев DNS у них в таблице быть не может.'),
    ('Где посмотреть, что именно случилось у хостинга?', 'Нажмите на название хостинга в таблице: на его странице есть разбор недели по дням, время самого долгого сбоя, живой статус и полоса последних 48 часов.'),
]
# 19.11 (Ник: «найди вопросов 50 — самых популярных как выбрать хостинг… вопросы и ответы развёрнутые»): drafts/hosting-texts/_rating-faq.json
_RF = ROOT / 'drafts' / 'hosting-texts' / '_rating-faq.json'
FAQ2 = [(html.escape(q, quote=False), html.escape(a, quote=False)) for q, a in json.loads(_RF.read_text())['faq']] if _RF.exists() else []
faq_h = ''.join(f'<details class="qa"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)
faq2_h = ''.join(f'<details class="qa"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ2)
ld = [{'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': html.unescape(q), 'acceptedAnswer': {'@type': 'Answer', 'text': html.unescape(a)}} for q, a in FAQ + FAQ2]},
      {'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Рейтинг хостингов по доступности', 'itemListElement': [
          {'@type': 'ListItem', 'position': r['place'], 'name': r['name'], 'url': f'https://rebornlab.ru/hosting/{r["slug"]}/'} for r in rows]}]
CSS = '''<style>
.rt{width:100%;border-collapse:collapse;font-size:15px}.rt th{text-align:left;color:var(--muted);font-weight:600;font-size:13px;padding:8px 10px;border-bottom:1px solid rgba(237,235,230,.12);white-space:nowrap}
.rt td{padding:10px;border-bottom:1px solid rgba(237,235,230,.07);vertical-align:top}.rt .num{white-space:nowrap}.rt .pl{font-weight:800;white-space:nowrap}
.rt .ty{color:var(--muted);font-size:12.5px}.rt .up{color:#c6f24e;font-size:12px}.rt .dn{color:#ff8a65;font-size:12px}.rt .ad{color:var(--muted);font-size:11.5px}
.rt a.go{white-space:nowrap}.rt a.pr{white-space:nowrap;font-weight:700;color:#c6f24e;text-decoration:none}.rtw{overflow-x:auto}.hn{display:flex;gap:10px;align-items:center}.hl-logo{width:28px;height:28px;border-radius:7px;background:#fff;padding:3px;object-fit:contain;flex:none}
</style>'''
VER = time.strftime('%Y%m%d')
main = f'''<main class="pw">
  <span class="live"><span class="dot"></span>рейтинг · обновляется по понедельникам · замеры из России без VPN</span>
  <h1>{h1}</h1>
  <p class="lead">Мы проверяем 27 хостингов одинаково: раз в 30 минут открываем панель управления и опрашиваем DNS-серверы — из России, без VPN, как обычный клиент. Ниже — кто за неделю {per} работал ровнее всех. Без сбоев прошли {pl(len(clean), "хостинг", "хостинга", "хостингов")}{": " + ", ".join(r["name"] for r in clean[:8]) + ("…" if len(clean) > 8 else "") if clean else ""}.</p>
  <div class="card"><div class="rtw"><table class="rt"><thead><tr><th>Место</th><th>Хостинг</th><th>Проверок</th><th>Без сбоев</th><th>Сбойных</th><th>Самый долгий сбой</th><th>Панель не открылась</th><th>DNS не ответил</th><th>Скорость DNS</th><th>Цена</th></tr></thead><tbody>{trs}</tbody></table></div>
  <p class="sub" style="margin:12px 0 0">«Сбоев» — сколько проверок из {rows[0]["checks"]} показали проблему (каждая — 30 минут). «Без сбоев» — доля проверок без проблем. При равенстве выше тот, у кого реже не открывалась панель и быстрее отвечает DNS.</p>
  <p class="sub" style="margin:8px 0 0">Цена — самый дешёвый тариф с сайта хостинга{(' на ' + PR['checked'][8:10] + '.' + PR['checked'][5:7]) if PR.get('checked') else ''}, точную смотрите у хостинга. Ссылки на сайты хостингов — партнёрские. На место в рейтинге это не влияет.</p></div>
  <article class="card seo"><h2>Как устроен рейтинг</h2>
  <figure class="fig"><img src="/assets/rating/rating-how.png?v={VER}" alt="Как составляется рейтинг хостингов: сервер в России, панель и DNS, 48 проверок в сутки, меньше сбоев — выше" width="1200" height="396" loading="lazy" style="width:100%;height:auto;border-radius:14px"></figure>
  <p>Мы не берём данные у самих хостингов и не опираемся на отзывы. Каждые 30 минут наш сервер в России открывает панель управления каждого хостинга и опрашивает его DNS-серверы. Если панель не открылась или не ответили DNS, проверка засчитывается как сбой. Место определяет число таких проверок за неделю, потом — длительность самого долгого сбоя.</p>
  <p>Рейтинг показывает стабильность, а не качество услуг в целом: цены, скорость сайтов и работу поддержки он не учитывает. Неделя — короткий срок, поэтому места заметно меняются. Подробности по каждому хостингу — на его странице, а разбивка по задачам (виртуальный хостинг, VPS, облако, Битрикс) — в <a href="/hosting/reyting-2027/">рейтинге хостингов 2027 по категориям</a>.</p>
  <figure class="fig"><img src="/assets/rating/rating-bars.png?v={VER}" alt="Сбойные проверки за неделю у 27 хостингов: чем короче полоса, тем стабильнее хостинг" width="1200" height="724" loading="lazy" style="width:100%;height:auto;border-radius:14px"><figcaption>Сбойные проверки за неделю {per} у всех 27 хостингов. Картинка обновляется вместе с рейтингом.</figcaption></figure></article>
  <div class="card"><h2>Вопросы о рейтинге</h2>{faq_h}</div>
  {('<div class="card"><h2>Как выбрать хостинг в 2026 году: ' + str(len(FAQ2)) + ' вопросов и ответов</h2>' + faq2_h + '</div>') if FAQ2 else ''}
</main>'''
tpl = (ROOT / 'hosting' / 'index.html').read_text()
head, rest = tpl.split('<main', 1)
foot = rest.split('</main>', 1)[1]
head = re.sub(r'<title>.*?</title>', f'<title>{html.escape(title)}</title>', head, flags=re.S)
head = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{html.escape(desc)}"', head)
head = re.sub(r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{URL}"', head)
head = re.sub(r'<script type="application/ld\+json">.*?</script>', '', head, flags=re.S)
head = head.replace('</head>', ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld) + CSS + '</head>', 1)
if not PUBLISH:
    head = head.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">', 1)
foot = re.sub(r'<script>\s*\(function \(\) \{\s*var KEY.*?</script>', '', foot, flags=re.S)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(head + main + foot)
if PUBLISH:
    PREV.write_text(json.dumps({r['slug']: r['place'] for r in rows}))
print(OUT, '| мест:', len(rows), '| без сбоев:', len(clean), '| топ-3:', top3)
