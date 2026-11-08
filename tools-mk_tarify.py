#!/usr/bin/env python3
"""Страница тарифов «Восстановление сайта после сбоя хостинга — цены» (08.11.2026, идея Ника: бот и сервисы бесплатно, восстановление — платная работа;
на вопрос о цене — ссылка сюда). НЕ в разделе /beget (там без рекламы услуг). Один H1. Запуск: python3 tools-mk_tarify.py [путь_вывода]
По умолчанию — черновик demo/preview-tarify/index.html (noindex). Боевой адрес после ок Ника: vosstanovlenie-sajta/index.html."""
import html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'demo/preview-tarify/index.html')
DRAFT = 'demo/' in str(OUT)
E = html.escape

PLANS = [
 ('Лендинг из веб-архива', '1 500 ₽', 'Одностраничный сайт или промо-страница', ['Возвращаем страницу с теми же текстами и адресом', 'Картинки — из архива и Яндекс Картинок', 'Рабочая форма заявок на вашу почту', 'Обычно — в тот же день']),
 ('Возврат вашего WordPress из копии', '2 000 ₽', 'Если у вас есть копия сайта от хостинга или разработчика', ['Разворачиваем копию на новом хостинге', 'Админка, заказы и пользователи — как были', 'Подключаем домен и https', 'Обычно — несколько часов']),
 ('Сайт или каталог из веб-архива', '3 000 ₽', 'Многостраничный сайт, каталог, блог — когда копии нет', ['Все страницы с теми же адресами, текстами и заголовками', 'Позиции в поиске сохраняются', 'Формы заявок, политика и согласие по 152-ФЗ', 'Сайт-«витрина» без админки: правки вносим мы', 'Обычно — 1–2 дня']),
 ('Новый сайт на WordPress с админкой', '7 000 ₽', 'Если нужен сайт, который вы будете править сами', ['Переносим всё содержимое из архива или копии', 'Своя админка: страницы, товары, новости', 'Те же адреса страниц — без потери позиций', 'Хостинг — ваш, поможем выбрать и настроить']),
]
FAQ = [
 ('Как понять, какой тариф нужен?', 'Пришлите адрес сайта — бесплатно проверим, что сохранилось, и скажем, какой вариант подойдёт. Сами можете посмотреть на странице «можно ли восстановить сайт».'),
 ('Сохранятся ли позиции в Яндексе и Google?', 'Да, если сохранить те же адреса страниц, заголовки и тексты — мы восстанавливаем именно так. Поисковик видит тот же сайт по тому же адресу.'),
 ('Что нельзя вернуть из веб-архива?', 'Базу заказов и заявок, личные кабинеты, админку. Сайт возвращается «витриной»: все страницы и тексты на месте, формы заявок делаются заново. Когда появится копия от хостинга, можно вернуть родную админку.'),
 ('Где будет работать сайт?', 'На нашем сервере или на вашем хостинге — как удобнее. Домен остаётся вашим, мы только направляем его на новый сервер.'),
 ('А если хостинг потом всё починит?', 'Тогда можно спокойно вернуть сайт обратно или оставить как есть. Восстановленный сайт — это мост, чтобы вы не теряли клиентов и позиции, пока ждёте.'),
 ('Как оплатить?', 'После того как мы проверим сайт и вы согласуете вариант. Обычно оплата — когда сайт уже работает на временном адресе и вы его посмотрели.'),
]

cards = ''.join(f'<div class="plan"><b class="pn">{E(n)}</b><div class="pp">{E(p)}</div><p class="pd">{E(d)}</p><ul>' + ''.join(f'<li>{E(x)}</li>' for x in items) + '</ul></div>' for n, p, d, items in PLANS)
faq = ''.join(f'<details class="qa"><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
ld = {'@context': 'https://schema.org', '@graph': [
    {'@type': 'Service', 'name': 'Восстановление сайта после сбоя хостинга', 'provider': {'@type': 'Organization', 'name': 'REBORN LAB', 'url': 'https://rebornlab.ru/'},
     'areaServed': 'RU', 'offers': [{'@type': 'Offer', 'name': n, 'price': re.sub(r'\D', '', p), 'priceCurrency': 'RUB'} for n, p, _, _ in PLANS]},
    {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}]}

src = (ROOT / 'beget' / 'vosstanovit' / 'index.html').read_text()
head = src[:src.index('<style>')]
head = re.sub(r'<title>.*?</title>', '<title>Восстановление сайта после Бегет — цены и сроки | REBORN LAB</title>', head, flags=re.S)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Восстановим сайт после сбоя хостинга: лендинг из веб-архива — 1 500 ₽, возврат WordPress из копии — 2 000 ₽, сайт или каталог из архива — 3 000 ₽, новый WordPress с админкой — 7 000 ₽. Те же адреса страниц — позиции в поиске сохраняются.">', head)
head = re.sub(r'<link rel="canonical" href="[^"]*">', '' if DRAFT else '<link rel="canonical" href="https://rebornlab.ru/vosstanovlenie-sajta/">', head)
head = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Восстановление сайта после сбоя хостинга — цены">', head)
head = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="От 1 500 ₽. Те же адреса страниц и тексты — позиции в поиске сохраняются.">', head)
if DRAFT:
    head = head.replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">', 1)
style_end = src.index('</style>') + len('</style>')
style = src[src.index('<style>'):style_end].replace('</style>', '''
  .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 28px 0; }
  .plan { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 22px; display: flex; flex-direction: column; }
  .plan .pn { font-size: 18px; line-height: 1.25; } .plan .pp { font-size: 34px; font-weight: 700; color: var(--acc); margin: 10px 0 4px; letter-spacing: -.02em; }
  .plan .pd { color: var(--muted); font-size: 14px; margin: 0 0 10px; } .plan ul { margin: 0; padding-left: 18px; font-size: 15px; } .plan li { margin: 6px 0; }
  .steps3 { counter-reset: s; list-style: none; padding: 0; display: grid; gap: 12px; margin: 14px 0 0; }
  .steps3 li { counter-increment: s; position: relative; padding: 14px 16px 14px 58px; background: var(--card); border: 1px solid var(--line); border-radius: var(--r); }
  .steps3 li::before { content: counter(s); position: absolute; left: 16px; top: 12px; width: 30px; height: 30px; border-radius: 50%; background: var(--acc); color: #111; font-weight: 700; display: grid; place-items: center; }
  .cta2 { display: flex; flex-wrap: wrap; gap: 12px; margin: 26px 0; }
  .qa p { color: var(--muted); }
</style>''')
seg = src[style_end:src.index('<!--HDR:START-->')]
seg = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', seg, count=1, flags=re.S)
hdr = src[src.index('<!--HDR:START-->'):src.index('<!--HDR:END-->') + len('<!--HDR:END-->')]
hdr = re.sub(r'<div class="bbar">.*?</div></div>(?=<!--HDR:END-->)', '', hdr, flags=re.S)   # без полосы раздела /beget
banner = '<div style="background:#c6f24e;color:#111;text-align:center;padding:10px;font:600 14px sans-serif">ЧЕРНОВИК для Ника — не опубликован, скрыт от поисковиков</div>' if DRAFT else ''
main = f'''{banner}<main class="bw">
  <span class="live"><span class="dot"></span>восстановление сайтов · REBORN LAB</span>
  <h1>Восстановление сайта после сбоя хостинга: цены и сроки</h1>
  <p class="lead">Сайт перестал открываться после сбоя у хостинга (например, Бегет), а копии нет или нет доступа к панели? Вернём сайт с теми же адресами страниц и текстами — чтобы вы не теряли клиентов и позиции в поиске, пока ждёте. Сначала бесплатно проверим, что сохранилось.</p>
  <div class="plans">{cards}</div>
  <h2>Как это работает</h2>
  <ol class="steps3"><li>Вы присылаете адрес сайта — бесплатно проверяем, что сохранилось в веб-архиве и Яндекс Картинках.</li><li>Предлагаем вариант и называем цену заранее — без сюрпризов.</li><li>Собираем сайт и показываем на временном адресе — вы смотрите и принимаете.</li><li>Переключаем домен на новый сервер, подключаем https и почту для заявок.</li></ol>
  <div class="cta2"><a class="btn btn-acc" href="https://t.me/m8614f" target="_blank" rel="noopener">Написать в Telegram</a><a class="btn" href="/beget/vosstanovit/">Проверить сайт бесплатно</a></div>
  <h2>Частые вопросы</h2>
  {faq}
  <p class="sub" style="margin-top:24px">Бесплатно и без обязательств: <a href="/beget/vosstanovit/" style="color:var(--acc)">проверка «можно ли восстановить сайт»</a>, <a href="/beget/server/" style="color:var(--acc)">проверка сервера по IP</a> и бот <a href="https://t.me/rebornlab_bot" style="color:var(--acc)">@rebornlab_bot</a> — напишет, когда сайт снова откроется.</p>
</main>
'''
after = src[src.index('</main>') + len('</main>'):]
after = after[:after.index('<script>\n(function () {')] + '</body>\n</html>\n'
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(head + style + seg + hdr + '\n' + main + after)
print('готово:', OUT, '| H1:', (head + main).count('<h1'))
