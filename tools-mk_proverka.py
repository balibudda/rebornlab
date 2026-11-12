#!/usr/bin/env python3
"""Страница «Проверка сайта: открывается ли и на каком хостинге» (12.11.2026, Ник: «сделай страницу крутую… круче, чем у
lezhitli… в первую очередь помогать людям и продвигать бот»). Запросы Метрики: «проверка хостинга сайта по домену»,
«проверка сервера на доступность», «как посмотреть, отвечает ли сайт».

Данные: rebornlab.ru/api/check (служба hostcheck на vpn-ru — из России, полная) + api.rebornlab.ru/check (vpn-id — из-за рубежа,
только доступность), статусы хостингов — api.rebornlab.ru/beget.json и rebornlab.ru/hm/status.json. Код службы — tkanimix/server/hostcheck.
Партнёрские ссылки хостингов — потом (Ник): словарь HOST_LINKS в скрипте страницы, пока пустой.

Запуск:
  python3 tools-mk_proverka.py            → demo/draft-proverka/index.html (черновик, noindex, под паролем на сервере)
  python3 tools-mk_proverka.py publish    → proverka-dostupnosti-sajta/index.html (шапку/подвал потом обновляет node build.mjs)"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
PUBLISH = len(sys.argv) > 1 and sys.argv[1] == 'publish'
# 12.11 (Ник): + страницы хостингов. В черновике всё лежит под /demo/draft-proverka/ (закрыто паролем), при публикации — боевые адреса
PV = '/proverka-sajta/' if PUBLISH else '/demo/draft-proverka/'   # 12.11 Ник: короткие боевые адреса
HB = '/hosting/' if PUBLISH else '/demo/draft-proverka/hosting/'
URL = 'https://rebornlab.ru/proverka-sajta/'
TITLE = 'Мониторинг сайта без VPN: открывается ли сайт в России и за рубежом — бесплатная проверка'   # 12.11 Ник: title — «Мониторинг…», H1 — «Проверка/Открывается ли…»
DESC = ('Открывается ли сайт без VPN? Проверим из России и из-за рубежа: что видит посетитель, какая ошибка и как её исправить, '
        'на каком хостинге и сервере, сертификат, домен и почта. Бесплатно, без регистрации, с уведомлением в Telegram.')
# партнёрские ссылки — через наш домен (/go/… на vpn-ru → 302 на партнёрку). ⚠️ Перед публикацией — erid (маркировка рекламы)
HOST_LINKS = {'REG.RU': '/go/reg-hosting'}   # 12.11 Ник: «разрешаю на мой страх и риск» — включено и на боевых, с честной подписью
AD_NOTE = {'REG.RU': 'партнёрская ссылка'}
AD_FOOT = {'REG.RU': 'Ссылка «Сайт REG.RU» — партнёрская: если вы купите хостинг по ней, REG.RU заплатит нам вознаграждение. Ничего не скрываем: на результаты мониторинга и проверки это не влияет — статус REG.RU считается так же, как у всех хостингов.'}

FAQ = [
    ('Как проверить, на каком хостинге сайт?', 'Введите адрес сайта в поле выше. Мы найдём IP-адрес, на который указывает домен, узнаем, какой сети он принадлежит, и по имени сети и сервера определим хостинг: Beget, Timeweb, REG.RU, SpaceWeb и другие. Если сайт закрыт защитным сервисом или CDN (Cloudflare, DDoS-Guard), мы честно покажем их, а не хостинг: настоящий сервер за ними снаружи не виден.'),
    ('Как проверить доступность сайта?', 'Введите адрес — мы откроем сайт как браузер с двух точек: с сервера в России и с сервера за рубежом. Покажем, отвечает ли он, сколько времени занял ответ и что видит посетитель: сам сайт, заглушку хостинга, ошибку PHP или базы данных. Две точки нужны, чтобы отличить «сайт лежит» от «сайт не открывается только из России или только с VPN».'),
    ('У меня сайт не открывается, а у других открывается — почему?', 'Чаще всего дело в сети: провайдер, Wi-Fi, VPN или старый адрес сайта в кэше компьютера. Если наша проверка показывает, что сайт открывается из России и из-за рубежа, — проблема на вашей стороне: попробуйте мобильный интернет без VPN и Wi-Fi. Если наша проверка тоже не может открыть сайт — проблема на стороне сайта или хостинга.'),
    ('Сайт открывается в России, но не открывается с VPN или из-за границы', 'Значит, хостинг или защита сайта закрывают доступ с зарубежных адресов. Владельцу стоит проверить настройки защиты от ботов и геофильтры. Подробно о причинах — в статье «Почему сайт не открывается в России или с VPN».'),
    ('Что значит «Домен не прилинкован к директории»?', 'Сервер хостинга работает, но домен не привязан к папке с сайтом. После восстановления хостинга это самая частая ошибка: файлы на месте, нужно только прикрепить домен в панели. Пошагово — в нашей инструкции по ошибкам после восстановления.'),
    ('Как узнать, когда сайт снова заработает?', 'Добавьте сайт в бесплатного бота @rebornlab_bot — кнопка «Следить в боте» под результатом проверки. Бот проверяет сайт каждые 10 минут и сразу пишет в Telegram, когда он упадёт, заработает или откроется с ошибкой.'),
    ('Вы сохраняете, какие сайты я проверяю?', 'Мы записываем только адрес проверенного сайта и итог проверки — без вашего IP-адреса и без данных о вас. Это нужно, чтобы видеть, какие проблемы встречаются чаще. Результат проверки одного сайта хранится 3 минуты, чтобы не нагружать чужие серверы повторными запросами.'),
    ('Это платно? Нужна регистрация?', 'Нет. Проверка и бот бесплатные, регистрация не нужна. Ограничение одно: не больше 20 проверок за 10 минут с одного адреса — чтобы инструментом не пользовались для нагрузки на чужие сайты.'),
]

src = (ROOT / 'beget' / 'server' / 'index.html').read_text()
css_link = re.search(r'<link rel="stylesheet" href="/assets/styles.css[^"]*">', src).group(0)
hdr = src[src.index('<!--HDR:START-->'):src.index('<!--HDR:END-->') + len('<!--HDR:END-->')]
hdr = re.sub(r'<div class="bbar">.*?</div></div>(?=<!--HDR:END-->)', '', hdr, flags=re.S)   # полоса «Бегет» тут не нужна — инструмент для любого сайта
hdr = hdr.replace(' aria-current="page"', '')
foot = src[src.index('<footer class="ftr">'):src.index('<script src="/assets/main.js')]
mainjs = re.search(r'<script src="/assets/main.js[^"]*" defer></script>', src).group(0)

ld_faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
    {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}
ld_app = {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': 'Проверка сайта на доступность и хостинг', 'url': URL,
          'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Любая', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'RUB'},
          'publisher': {'@type': 'Organization', 'name': 'REBORN LAB', 'url': 'https://rebornlab.ru/'}}

robots = '' if PUBLISH else '<meta name="robots" content="noindex,nofollow">\n'
head = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{robots}<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{URL}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="Открывается ли сайт без VPN? Проверка из России и из-за рубежа">
<meta property="og:description" content="Что видит посетитель, на каком хостинге сайт, сертификат, домен и почта — и как исправить ошибку. Бесплатно.">
<meta property="og:image" content="https://rebornlab.ru/assets/og.jpg">
{css_link}
<script type="application/ld+json">{json.dumps(ld_app, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(ld_faq, ensure_ascii=False)}</script>
<style>
  .pw {{ max-width: var(--max); margin: 0 auto; padding: 40px 22px 80px; }}
  .pw h1 {{ font-size: clamp(30px, 5vw, 54px); letter-spacing: -.03em; line-height: 1.05; margin: 14px 0 12px; }}
  .pw .lead {{ color: var(--muted); font-size: 18px; max-width: 46em; }}
  .pw .live {{ display: inline-flex; align-items: center; gap: 8px; font: 13px var(--mono); color: var(--muted); }}
  .pw .dot {{ width: 9px; height: 9px; border-radius: 50%; background: var(--acc); animation: pulse 2s infinite; }}
  @keyframes pulse {{ 0% {{ box-shadow: 0 0 0 0 rgba(198,242,78,.5) }} 70% {{ box-shadow: 0 0 0 10px rgba(198,242,78,0) }} 100% {{ box-shadow: 0 0 0 0 rgba(198,242,78,0) }} }}
  .pq {{ display: flex; gap: 10px; margin: 26px 0 8px; max-width: 760px; }}
  .pq input {{ flex: 1; min-width: 0; font-size: 18px; padding: 16px 18px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); color: var(--text); }}
  .pq input:focus {{ outline: none; border-color: var(--acc); }}
  .pq button {{ font-size: 17px; padding: 0 26px; white-space: nowrap; }}
  .gives {{ list-style: none; padding: 0; margin: 18px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 8px 22px; max-width: 980px; }}
  .gives li {{ color: var(--muted); font-size: 15.5px; padding-left: 26px; position: relative; }} .gives li:before {{ content: "✓"; position: absolute; left: 4px; color: var(--acc); font-weight: 700; }}
  .gives b {{ color: var(--text); font-weight: 600; }}
  .hint {{ color: var(--muted); font-size: 14px; }} .hint a {{ color: var(--muted); text-decoration: underline dotted; cursor: pointer; }}
  .card {{ background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 22px 24px; margin: 16px 0; }}
  .card h2 {{ font-size: 22px; margin: 0 0 6px; letter-spacing: -.01em; }} .card .sub {{ color: var(--muted); font-size: 14px; margin: 0 0 14px; }}
  #res {{ display: none; }} #res.on {{ display: block; }}
  .verdict {{ display: flex; gap: 16px; align-items: flex-start; border-width: 2px; }}
  .verdict .ic {{ font-size: 40px; line-height: 1; }}
  .verdict h2 {{ font-size: clamp(22px, 3vw, 30px); }}
  .verdict.ok {{ border-color: rgba(198,242,78,.55); }} .verdict.warn {{ border-color: rgba(255,204,77,.6); }} .verdict.bad {{ border-color: rgba(255,122,107,.6); }}
  .fix {{ margin: 12px 0 0; padding-left: 20px; }} .fix li {{ margin: 6px 0; }}
  .errl {{ display: block; margin-top: 10px; font: 13px/1.5 var(--mono); color: #ffb4a8; background: #0b0c0e; border-radius: 10px; padding: 10px 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }}
  .pts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
  .pt {{ background: var(--card-2); border-radius: 14px; padding: 16px 18px; }}
  .pt .w {{ font-size: 14px; color: var(--muted); }} .pt .s {{ font-size: 22px; font-weight: 700; margin-top: 6px; }} .pt .m {{ font-size: 14px; color: var(--muted); margin-top: 4px; }}
  .s.ok {{ color: var(--acc); }} .s.warn {{ color: #ffcc4d; }} .s.bad {{ color: #ff7a6b; }}
  .note {{ margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: rgba(255,204,77,.08); border: 1px solid rgba(255,204,77,.3); font-size: 15px; }}
  .facts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }}
  .f {{ background: var(--card-2); border-radius: 14px; padding: 14px 16px; }}
  .f .k {{ font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }} .f .v {{ font-size: 17px; font-weight: 600; margin-top: 6px; word-break: break-word; }}
  .f .d {{ font-size: 13.5px; color: var(--muted); margin-top: 4px; word-break: break-word; }}
  .f .d a, .card a.lnk {{ color: var(--acc); }}
  .cta {{ display: flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; border: 1px solid rgba(198,242,78,.45); }}
  .cta p {{ margin: 4px 0 0; color: var(--muted); max-width: 40em; }}
  .cta .btn {{ font-size: 17px; padding: 14px 22px; }}
  .wait {{ display: flex; gap: 12px; align-items: center; color: var(--muted); }}
  .spin {{ width: 22px; height: 22px; border: 3px solid var(--line); border-top-color: var(--acc); border-radius: 50%; animation: sp 1s linear infinite; }}
  @keyframes sp {{ to {{ transform: rotate(360deg) }} }}
  .steps {{ margin: 8px 0 0; padding: 0; list-style: none; font-size: 15px; }} .steps li {{ margin: 6px 0; color: var(--muted); }} .steps li.done {{ color: var(--text); }} .steps li.done:before {{ content: "✓ "; color: var(--acc); }}
  .hosts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }}
  .h {{ background: var(--card-2); border-radius: 14px; padding: 16px; }}
  .h .n {{ font-weight: 700; font-size: 18px; display: flex; align-items: center; gap: 8px; }}
  .h .n i {{ width: 10px; height: 10px; border-radius: 50%; background: var(--muted); display: inline-block; }}
  .h .n i.ok {{ background: var(--acc); box-shadow: 0 0 10px rgba(198,242,78,.6); }} .h .n i.warn {{ background: #ffcc4d; }} .h .n i.bad {{ background: #ff7a6b; }}
  .h .l {{ color: var(--muted); font-size: 14px; margin-top: 8px; line-height: 1.5; }}
  .h a {{ color: var(--acc); font-size: 14px; }}
  a.h.hl {{ display: block; color: inherit; text-decoration: none; transition: border-color .2s, transform .2s; border: 1px solid transparent; }} a.h.hl:hover {{ border-color: var(--acc); transform: translateY(-2px); }}
  .hosts.compact {{ grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }} .hosts.compact .h {{ padding: 12px 14px; }} .hosts.compact .n {{ font-size: 16px; }} .hosts.compact .l {{ font-size: 13px; margin-top: 4px; }}
  .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
  .chk {{ margin: 0; padding-left: 20px; color: var(--muted); }} .chk li {{ margin: 6px 0; }} .chk b {{ color: var(--text); }}
  details.qa {{ border-bottom: 1px solid var(--line); padding: 14px 0; }} details.qa summary {{ cursor: pointer; font-weight: 600; font-size: 17px; }} details.qa p {{ color: var(--muted); margin: 10px 0 0; }}
  @media (max-width: 720px) {{ .pts, .grid2 {{ grid-template-columns: 1fr; }} .pq {{ flex-direction: column; }} .pq button {{ padding: 14px; }} .verdict .ic {{ font-size: 32px; }} }}
</style>
</head>
<body>
'''

faq_html = ''.join(f'<details class="qa"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)

main = f'''<main class="pw">
  <span class="live"><span class="dot"></span>бесплатно · без регистрации · из России и из-за рубежа</span>
  <h1>Открывается ли сайт без VPN? Проверка из России и из-за рубежа</h1>
  <p class="lead">Введите адрес — за 10–20 секунд откроем сайт как обычный посетитель: с сервера в России без VPN и с сервера за рубежом.</p>
  <ul class="gives">
    <li><b>Открывается ли без VPN</b> — в России и из-за границы, время ответа</li>
    <li><b>Что видит посетитель</b> — сайт, заглушку, ошибку PHP или базы — и как это исправить</li>
    <li><b>Где размещён сайт</b> — хостинг, сервер, движок и статус хостинга сейчас</li>
    <li><b>Сертификат, домен и почта</b> — сколько дней осталось, где продлевать, кто принимает письма</li>
    <li><b>Если сайт лежит</b> — есть ли копия в веб-архиве и как узнать, когда заработает</li>
  </ul>
  <form class="pq" id="pq" autocomplete="off">
    <input id="q" type="text" inputmode="url" placeholder="Адрес сайта, например mysite.ru" aria-label="Адрес сайта" required>
    <button class="btn btn-acc" type="submit" data-goal="hc_check">Проверить</button>
  </form>
  <p class="hint">Например: <a data-ex="rebornlab.ru">rebornlab.ru</a> · <a data-ex="ya.ru">ya.ru</a> · можно вставить ссылку целиком — лишнее уберём сами.</p>

  <div id="res">
    <div class="card wait" id="wait"><div class="spin"></div><div><b>Проверяем <span id="wd"></span>…</b><ul class="steps" id="steps">
      <li data-s="dns">ищем сервер и хостинг</li><li data-s="ru">открываем сайт из России</li><li data-s="ab">открываем сайт из-за рубежа</li><li data-s="info">смотрим сертификат, домен и почту</li></ul></div></div>
    <div id="out"></div>
  </div>

  <div class="card">
    <h2>Хостинги сейчас <a class="lnk" href="__HB__" style="font-size:15px;font-weight:500;margin-left:8px">все хостинги →</a></h2>
    <p class="sub" id="hupd">Наш независимый мониторинг: панели управления, DNS и выборка реальных сайтов. Не официальные данные хостингов.</p>
    <div class="hosts compact" id="hosts"><div class="h"><div class="l">Загружаем…</div></div></div>
  </div>

  <div class="grid2">
    <div class="card">
      <h2>Что мы проверяем</h2>
      <ul class="chk">
        <li><b>Доступность из двух точек</b> — сервер в России и сервер за рубежом: так видно и «сайт лежит», и «не открывается только с VPN».</li>
        <li><b>Что видит посетитель</b> — сам сайт, заглушку хостинга, «домен не прилинкован», ошибку PHP или базы данных, защиту от ботов.</li>
        <li><b>Хостинг и сервер</b> — IP, сеть, имя сервера; для Beget — включён ли сервер по нашему мониторингу.</li>
        <li><b>Сертификат</b> — кем выдан, на какие адреса, сколько дней осталось.</li>
        <li><b>Домен</b> — регистратор, до какого числа оплачен, где управлять DNS.</li>
        <li><b>Почта</b> — кто принимает письма домена (по MX).</li>
        <li><b>Движок</b> — WordPress, Битрикс, Tilda и другие.</li>
        <li><b>Веб-архив</b> — если сайт лежит: есть ли сохранённая копия.</li>
      </ul>
    </div>
    <div class="card">
      <h2>Частые ошибки и что делать</h2>
      <ul class="chk">
        <li><b>«Домен не прилинкован»</b> — домен не привязан к папке сайта: прикрепить в панели хостинга. <a class="lnk" href="/journal/beget-posle-vosstanovleniya-3-oshibki/">Инструкция</a></li>
        <li><b>«Подключение не защищено»</b> — нет или истёк сертификат: выпустить бесплатный Let&#39;s Encrypt, до выпуска — выключить редирект на https.</li>
        <li><b>Fatal error / Deprecated</b> — чаще всего сменилась версия PHP: вернуть прежнюю в настройках сайта.</li>
        <li><b>502 / ошибка базы данных</b> — сервер работает, но программа сайта или база ещё не поднялись. <a class="lnk" href="/journal/beget-502-oshibka-bazy-dannyh/">Разбор</a></li>
        <li><b>Не открывается из России или с VPN</b> — блокировка IP, геофильтр или защита от ботов. <a class="lnk" href="/journal/pochemu-sajt-ne-otkryvaetsya-v-rossii/">Почему так</a></li>
        <li><b>Сайт не отвечает совсем</b> — сервер выключен или недоступен. Если копии нет — <a class="lnk" href="/beget/vosstanovit/">проверьте, можно ли восстановить сайт</a>.</li>
      </ul>
    </div>
  </div>

  <div class="card cta" id="botcta">
    <div><h2>🔔 Узнавайте первым, когда сайт упал или заработал</h2>
    <p>Бесплатный бот @rebornlab_bot проверяет ваш сайт каждые 10 минут и сразу пишет в Telegram. Без рекламы и регистрации.</p></div>
    <a class="btn btn-acc" href="https://t.me/rebornlab_bot" target="_blank" rel="noopener" data-goal="hc_bot">Открыть бота</a>
  </div>

  __SEO__
  <div class="card">
    <h2>Вопросы и ответы</h2>
    {faq_html}
  </div>
</main>
'''

script = r'''<script>
(function () {
  var RU = '/api/check', AB = 'https://api.rebornlab.ru/check', HB = '__HB__';
  var HOST_LINKS = __HOST_LINKS__, AD_NOTE = __AD_NOTE__;   // партнёрские ссылки через наш домен; AD_NOTE — пометка «Реклама»
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function goal(g) { try { if (window.ym && window.RL_METRIKA) ym(window.RL_METRIKA, 'reachGoal', g); } catch (e) {} }
  function norm(v) { return String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0].split('?')[0].split('#')[0].replace(/:\d+$/, '').replace(/\.$/, ''); }
  function b64(v) { return btoa(unescape(encodeURIComponent(v))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 62); }
  function botUrl(d) { return 'https://t.me/rebornlab_bot?start=w_' + b64(d); }
  function step(s) { var li = document.querySelector('#steps li[data-s="' + s + '"]'); if (li) li.className = 'done'; }
  function dshow(d) { try { return d.indexOf('xn--') >= 0 && window.punycode ? punycode.toUnicode(d) : d; } catch (e) { return d; } }
  function days(n) { n = Math.abs(n); var m = n % 10, c = n % 100; return n + ' ' + (m === 1 && c !== 11 ? 'день' : m >= 2 && m <= 4 && (c < 12 || c > 14) ? 'дня' : 'дней'); }

  var KIND = {
    ok: ['ok', 'Открывается'], unlinked: ['warn', 'Заглушка «домен не прилинкован»'], stub: ['warn', 'Заглушка вместо сайта'],
    broken: ['warn', 'Открывается с ошибкой PHP'], dberror: ['warn', 'Ошибка базы данных'], shield: ['ok', 'За защитой от ботов'],
    http_error: ['bad', 'Сервер отвечает ошибкой'], down: ['bad', 'Не отвечает'], timeout: ['bad', 'Не дождались ответа'],
    nodns: ['bad', 'Домен не найден в DNS'], private: ['bad', 'Адрес во внутренней сети']
  };
  function kindOf(c) { if (!c) return ['bad', 'Не удалось проверить']; var k = KIND[c.kind] || ['bad', c.kind || '—']; if (c.kind === 'http_error' && c.code) k = ['bad', 'Ошибка ' + c.code + (c.code === 502 ? ' Bad Gateway' : c.code === 503 ? ' (сервис недоступен)' : c.code === 403 ? ' (доступ запрещён)' : c.code === 404 ? ' (страница не найдена)' : '')]; return k; }

  function verdict(d, ru, ab) {
    var c = ru, k = c && c.kind, certBad = c && c.https && c.https.error === 'cert', fix = [], icon, cls, title, text = '', err = '';
    var abOk = ab && (ab.kind === 'ok' || ab.kind === 'shield'), ruOk = k === 'ok' || k === 'shield';
    if (ruOk && !certBad) { icon = '✅'; cls = 'ok'; title = 'Сайт открывается'; text = 'Из России сайт отвечает' + (c.ms ? ' за ' + (c.ms / 1000).toFixed(1).replace('.', ',') + ' с' : '') + (k === 'shield' ? ', перед ним стоит защита от ботов — посетители её проходят, а наша проверка дальше не смотрит.' : '.'); }
    else if (k === 'unlinked') { icon = '🟠'; cls = 'warn'; title = 'Сервер работает, но вместо сайта — «домен не прилинкован»'; text = 'Хостинг отвечает, а домен не привязан к папке с сайтом. Файлы, скорее всего, на месте.';
      fix = ['Зайдите в панель хостинга. Если там «аккаунт восстанавливается» — подождите.', 'Раздел «Сайты» → у папки сайта «Прикрепить домен» → выберите свой домен. Привязка — около 10 минут.', 'Нет домена в списке — он прикреплён к другой (часто пустой) папке: открепите и прикрепите к папке с сайтом.', '<a href="/journal/beget-posle-vosstanovleniya-3-oshibki/">Подробная инструкция</a>']; }
    else if (k === 'broken') { icon = '🟠'; cls = 'warn'; title = 'Сайт открывается с ошибкой PHP'; text = 'Сервер и сайт отвечают, но программа сайта падает. Чаще всего после переезда или восстановления сменилась версия PHP.'; err = c.error_line;
      fix = ['Панель хостинга → настройки сайта → верните версию PHP, на которой сайт работал раньше (для старого Битрикса и WordPress обычно 7.4).', 'Deprecated и Warning — предупреждения: выключите показ ошибок посетителям (WP_DEBUG, debug в Битриксе).', '<a href="/journal/beget-posle-vosstanovleniya-3-oshibki/">Разбор ошибок PHP</a>']; }
    else if (k === 'dberror') { icon = '🟠'; cls = 'warn'; title = 'Сайт не может подключиться к базе данных'; text = 'Сервер работает, а база данных недоступна: не запущена, сменился пароль или адрес.'; err = c.error_line;
      fix = ['Если хостинг недавно восстанавливался — часто проходит само в течение часа.', 'Держится несколько часов — напишите в поддержку хостинга и приложите текст ошибки.', '<a href="/journal/beget-502-oshibka-bazy-dannyh/">Что значат ошибки базы и 502</a>']; }
    else if (k === 'stub') { icon = '🟠'; cls = 'warn'; title = 'Вместо сайта — заглушка'; text = 'Сервер отвечает, но показывает страницу хостинга или регистратора: «сайт отключён», «хостинг не оплачен», «домен припаркован» или временную страницу.';
      fix = ['Проверьте оплату хостинга и домена в личных кабинетах.', 'Если сайт переносили — проверьте, что домен указывает на новый сервер (A-запись).']; }
    else if (certBad && (c.via === 'https-nocert' || c.redirect_to_bad_https || (c.http && /^https/.test(c.http.to || '')))) { icon = '🟠'; cls = 'warn'; title = 'Нет действующего сертификата, а сайт перекидывает на https'; text = 'Браузер покажет посетителям «Подключение не защищено» — большинство уйдёт.';
      fix = ['Выпустите бесплатный сертификат Let&#39;s Encrypt в панели хостинга (вместе с www и поддоменами).', 'Пока сертификата нет — временно выключите редирект на https.', '<a href="/journal/beget-posle-vosstanovleniya-3-oshibki/">Как это сделать на Beget</a>']; }
    else if (certBad) { icon = '🟠'; cls = 'warn'; title = 'Сайт открывается, но сертификат недействителен'; text = 'Браузер предупредит посетителей о небезопасном подключении.'; fix = ['Выпустите бесплатный сертификат Let&#39;s Encrypt в панели хостинга.']; }
    else if (k === 'nodns') { icon = '🔴'; cls = 'bad'; title = 'Домен не найден'; text = 'У домена нет IP-адреса в DNS: домен не оплачен, ещё не делегирован или записи DNS удалены.'; fix = ['Проверьте у регистратора, что домен оплачен и делегирован.', 'Проверьте A-запись домена в DNS.']; }
    else { icon = '🔴'; cls = 'bad'; title = 'Сайт не открывается'; text = k === 'http_error' ? 'Сервер отвечает ошибкой ' + c.code + '.' : 'Сервер не отвечает на наши запросы из России.';
      fix = ['Если сайт на хостинге после сбоя — проверьте, включён ли сервер (ниже, в блоке «Хостинг»).', 'Есть своя копия — сайт можно поднять на другом хостинге, не дожидаясь.', 'Копии нет — <a href="/beget/vosstanovit/#' + encodeURIComponent(d) + '">проверьте, что сохранилось в веб-архиве</a>.']; }
    var note = '';
    if (ruOk && ab && !abOk && ab.kind) note = '🌍 <b>Из-за рубежа сайт не открывается</b> (' + esc(kindOf(ab)[1].toLowerCase()) + '), а из России — да. Посетители из других стран и с VPN, скорее всего, его не увидят: хостинг или защита сайта закрывают зарубежные адреса. <a href="/journal/pochemu-sajt-ne-otkryvaetsya-v-rossii/">Почему так бывает</a>';
    if (!ruOk && abOk) note = '🇷🇺 <b>Из России сайт не открывается, а из-за рубежа — открывается.</b> Похоже на блокировку или фильтрацию на пути из России. <a href="/journal/pochemu-sajt-ne-otkryvaetsya-v-rossii/">Разбор причин</a>';
    return '<div class="card verdict ' + cls + '"><div class="ic">' + icon + '</div><div><h2>' + title + '</h2><p style="margin:6px 0 0">' + text + '</p>' +
      (err ? '<code class="errl">' + esc(err) + '</code>' : '') + (fix.length ? '<ol class="fix">' + fix.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' : '') +
      (note ? '<div class="note">' + note + '</div>' : '') + '</div></div>';
  }

  function pt(where, flag, c) {
    if (!c) return '<div class="pt"><div class="w">' + flag + ' ' + where + '</div><div class="s bad">нет данных</div><div class="m">точка проверки не ответила</div></div>';
    var k = kindOf(c), m = [];
    if (c.code) m.push('код ' + c.code); if (c.ms) m.push((c.ms / 1000).toFixed(2).replace('.', ',') + ' с');
    if (c.https && c.https.error === 'cert') m.push('сертификат недействителен');
    return '<div class="pt"><div class="w">' + flag + ' ' + where + '</div><div class="s ' + k[0] + '">' + esc(k[1]) + '</div><div class="m">' + esc(m.join(' · ') || ' ') + '</div></div>';
  }

  function facts(d, r) {
    var c = r.check || {}, s = r.server || {}, out = [], hl = HOST_LINKS[r.hoster];
    var hv = r.hoster || (s.as_name ? s.as_name.replace(/^AS-?|-AS\b/g, '').split(',')[0] : 'не определили');
    out.push(['Хостинг', esc(hv) + (r.hoster && HOST_LINKS[r.hoster] ? ' · <a href="' + hl + '" target="_blank" rel="noopener sponsored">сайт хостинга</a> <small style="color:var(--muted);font-weight:400">' + esc(AD_NOTE[r.hoster] || 'Реклама') + '</small>' : ''), (s.ip ? 'IP ' + esc(s.ip) : '') + (s.ptr ? ' · ' + esc(s.ptr) : '') + (s.asn ? '<br>сеть AS' + esc(s.asn) + ' ' + esc((s.as_name || '').split(' - ')[0]) : '')]);
    if (r.beget && r.beget.known) {
      var st = r.beget.state === 'up' ? '🟢 сервер включён' : r.beget.state === 'down' ? '🔴 сервер не отвечает' : 'нет данных';
      out.push(['Сервер Beget', st, 'в его сети отвечают ' + r.beget.net_up + ' из ' + r.beget.net_total + ' · <a href="/beget/server/#' + esc(s.ip) + '">карта сети</a>']);
    } else if (r.hostmon && r.hostmon.level) {
      out.push(['Хостинг сейчас', r.hostmon.level === 'ok' ? '🟢 работает штатно' : r.hostmon.level === 'warn' ? '🟡 частичные сбои' : '🔴 сбой', 'панель ' + (r.hostmon.panel ? 'открывается' : 'не открывается') + ' · DNS ' + r.hostmon.dns_ok + '/' + r.hostmon.dns_total + ' · сайтов из выборки работает ' + r.hostmon.sites_ok + ' из ' + r.hostmon.sites_total]);
    }
    if (c.cert) {
      var cd = c.cert.days, ok = c.cert.match && cd > 0;
      out.push(['Сертификат', ok ? (cd < 15 ? '🟡 истекает через ' + days(cd) : '🟢 действует ещё ' + days(cd)) : (!c.cert.match ? '🔴 выдан на другой адрес' : '🔴 истёк'), esc(c.cert.issuer || '') + (c.cert.names && c.cert.names.length ? ' · ' + esc(c.cert.names.slice(0, 3).join(', ')) : '')]);
    } else if (c.ports && !c.ports['443']) out.push(['Сертификат', '🟡 https не работает', 'порт 443 закрыт — сайт открывается только по http']);
    var di = r.domain_info || {};
    if (di.registrar) out.push(['Домен', esc(di.registrar) + (di.days_left != null ? (di.days_left < 30 ? ' · 🟡 оплачен ещё ' + days(di.days_left) : ' · оплачен до ' + esc(di.paid_till.split('-').reverse().join('.'))) : ''), (di.registrar_site ? 'управлять DNS и продлением: ' + esc(di.registrar_site) : '') + (di.created ? (di.registrar_site ? ' · ' : '') + 'зарегистрирован ' + esc(di.created.split('-').reverse().join('.')) : '')]);
    var ml = r.mail || {};
    if (ml.mx) out.push(['Почта домена', ml.provider ? esc(ml.provider) : esc(ml.mx[0]), esc(ml.mx.join(', '))]);
    else if (ml.none) out.push(['Почта домена', 'не принимает письма', 'у домена явно отключена почта (MX «.»)']);
    else out.push(['Почта домена', 'MX-записей нет', 'письма на адреса домена, скорее всего, не доходят']);
    var dn = r.dns || {};
    out.push(['DNS', dn.ns && dn.ns.length ? esc(dn.ns[0].replace(/^[^.]+\./, '')) : '—', (dn.ns || []).map(esc).join(', ') + (dn.www === false ? '<br>🟡 у www.' + esc(d) + ' нет записи — адрес с www не откроется' : '')]);
    if (c.cms) out.push(['Движок', esc(c.cms), c.title ? '«' + esc(c.title.slice(0, 70)) + '»' : '']);
    if (r.archive && r.archive.last) out.push(['Веб-архив', 'последний снимок ' + esc(r.archive.last), '<a href="/beget/vosstanovit/#' + encodeURIComponent(d) + '">можно ли восстановить сайт по архиву</a>']);
    else if (r.archive && r.archive.none) out.push(['Веб-архив', 'снимков нет', 'восстановить по архиву не получится — нужна своя копия']);
    return '<div class="card"><h2>Где размещён сайт и что с ним</h2><div class="facts">' + out.map(function (f) { return '<div class="f"><div class="k">' + f[0] + '</div><div class="v">' + f[1] + '</div>' + (f[2] ? '<div class="d">' + f[2] + '</div>' : '') + '</div>'; }).join('') + '</div></div>';
  }

  function cta(d, okNow) {
    return '<div class="card cta"><div><h2>🔔 ' + (okNow ? 'Следить за ' + esc(dshow(d)) : 'Узнать, когда ' + esc(dshow(d)) + ' заработает') + '</h2><p>' +
      (okNow ? 'Бот @rebornlab_bot проверяет сайт каждые 10 минут и сразу напишет в Telegram, если он упадёт, откроется с ошибкой или пропадёт сертификат.' : 'Бот @rebornlab_bot проверяет сайт каждые 10 минут и напишет в Telegram, как только он откроется.') +
      ' Бесплатно, без рекламы.</p></div><a class="btn btn-acc" href="' + botUrl(d) + '" target="_blank" rel="noopener" data-goal="hc_watch">Следить в боте</a></div>';
  }

  var busy = false;
  function check(raw) {
    var d = norm(raw); if (!/\./.test(d) || busy) return;
    busy = true; $('q').value = d; history.replaceState(null, '', '#' + d); goal('hc_check');
    $('res').className = 'on'; $('wait').style.display = ''; $('out').innerHTML = ''; $('wd').textContent = dshow(d);
    [].forEach.call(document.querySelectorAll('#steps li'), function (li) { li.className = ''; });
    var t1 = setTimeout(function () { step('dns'); }, 1200);
    var ru = null, ab = null, nr = 0;
    function done() { if (++nr < 2) return; clearTimeout(t1); busy = false; render(d, ru, ab); }
    fetch(RU + '?d=' + encodeURIComponent(d), {cache: 'no-store'}).then(function (r) { return r.json().then(function (j) { j._st = r.status; return j; }); })
      .then(function (j) { ru = j; step('dns'); step('ru'); step('info'); }).catch(function () { ru = {error: 'net'}; }).then(done);
    fetch(AB + '?d=' + encodeURIComponent(d) + '&mode=quick', {cache: 'no-store'}).then(function (r) { return r.json(); })
      .then(function (j) { ab = j; step('ab'); }).catch(function () { ab = null; }).then(done);
  }
  function render(d, ru, ab) {
    $('wait').style.display = 'none';
    if (!ru || ru.error) {
      var m = ru && ru.error === 'limit' ? 'Слишком много проверок подряд — подождите несколько минут.' : ru && ru.error === 'bad_domain' ? 'Не похоже на адрес сайта. Введите домен, например mysite.ru.' : ru && ru.error === 'busy' ? 'Сейчас проверяем много сайтов — попробуйте через минуту.' : 'Проверка не удалась — попробуйте ещё раз через минуту.';
      $('out').innerHTML = '<div class="card verdict bad"><div class="ic">⚠️</div><div><h2>' + m + '</h2></div></div>'; return;
    }
    var c = ru.check || {}, okNow = c.kind === 'ok' || c.kind === 'shield';
    $('out').innerHTML = verdict(d, c, ab) +
      '<div class="card"><h2>Открывается ли сайт</h2><p class="sub">Проверили ' + new Date((ru.checked_at || Date.now() / 1000) * 1000).toLocaleTimeString('ru-RU', {timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit'}) + ' МСК' + (ru.cached ? ' (результат последних 3 минут)' : '') + '</p><div class="pts">' +
      pt('Из России', '🇷🇺', c) + pt('Из-за рубежа (Индонезия)', '🌍', ab) + '</div></div>' + cta(d, okNow) + facts(d, ru);
    $('out').scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  $('pq').addEventListener('submit', function (e) { e.preventDefault(); check($('q').value); });
  [].forEach.call(document.querySelectorAll('[data-ex]'), function (a) { a.addEventListener('click', function () { check(a.getAttribute('data-ex')); }); });
  if (location.hash.length > 3) check(decodeURIComponent(location.hash.slice(1)));

  // статусы хостингов: Beget — begetwatch, остальные — hostmon
  Promise.all([
    fetch('https://api.rebornlab.ru/beget.json', {cache: 'no-store'}).then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch('/hm/status.json', {cache: 'no-store'}).then(function (r) { return r.json(); }).catch(function () { return null; })
  ]).then(function (a) {
    var b = a[0], h = a[1], cards = [];
    if (b) {
      var p = Math.round(100 * b.sites_up / b.sites_total), cls = p > 85 ? 'ok' : p > 30 ? 'warn' : 'bad';   // по сайтам: в сетях много пустых адресов
      cards.push('<a class="h hl" href="/beget/"><div class="n"><i class="' + cls + '"></i>Beget</div><div class="l">' + (cls === 'ok' ? 'работает' : cls === 'warn' ? 'частичные сбои' : 'серьёзный сбой') + ' · сайтов открывается ' + p + '%</div></a>');
    }
    if (h && h.providers) {
      var ks = Object.keys(h.providers), rank = {down: 0, warn: 1, ok: 2};
      ks.sort(function (a, b2) { return (rank[h.providers[a].level] - rank[h.providers[b2].level]) || 0; });
      ks.forEach(function (k) {
        var x = h.providers[k], cls = x.level === 'ok' ? 'ok' : x.level === 'warn' ? 'warn' : 'bad';
        var sl = x.sites_total >= 3 ? 'сайтов открывается ' + x.sites_ok + ' из ' + x.sites_total : (x.dns_total ? 'DNS ' + x.dns_ok + ' из ' + x.dns_total : 'панель ' + (x.panel ? 'открывается' : 'не открывается'));
        cards.push('<a class="h hl" href="' + HB + k + '/"><div class="n"><i class="' + cls + '"></i>' + esc(x.name) + '</div><div class="l">' + (cls === 'ok' ? 'работает' : cls === 'warn' ? 'частичные сбои' : 'сбой') + ' · ' + sl + '</div></a>');
      });
    }
    if (cards.length) $('hosts').innerHTML = cards.join('');
    var t = Math.max(b ? b.updated : 0, h ? h.updated : 0);
    if (t) $('hupd').innerHTML = 'Наш независимый мониторинг: панели управления, DNS и выборка реальных сайтов, обновлено в ' + new Date(t * 1000).toLocaleTimeString('ru-RU', {timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit'}) + ' МСК. Не официальные данные хостингов. Сначала — хостинги со сбоями.';
  });
})();
</script>
'''

SEO = json.loads((ROOT / 'src' / 'seo-hosting.json').read_text())   # тексты: YandexGPT Lite + наша чистка (12.11), главные — вручную


def md2html(md):
    out = []
    for b in re.split(r'\n\s*\n', md.strip()):
        b = b.strip()
        inl = lambda t: re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
        if b.startswith('### '):
            out.append(f'<h3>{inl(b[4:])}</h3>')
        elif b.startswith('## '):
            out.append(f'<h2>{inl(b[3:])}</h2>')
        elif re.match(r'^\d+\.\s', b):
            out.append('<ol>' + ''.join(f'<li>{inl(re.sub(r"^\d+\.\s*", "", l))}</li>' for l in b.split('\n') if l.strip()) + '</ol>')
        elif re.match(r'^[*-]\s', b):
            out.append('<ul>' + ''.join(f'<li>{inl(re.sub(r"^[*-]\s*", "", l))}</li>' for l in b.split('\n') if l.strip()) + '</ul>')
        else:
            out.append(f'<p>{inl(b)}</p>')
    return '\n'.join(out)


def svg_flow(title, src_lbl, targets, dst_lbl, note=''):
    """схема «как мы проверяем»: слева точка проверки, в середине что проверяем, справа результат. Рисуется кодом — точная, без ИИ-картинок"""
    n = len(targets); H = 120 + n * 86; cy = H / 2
    g = [f'<svg viewBox="0 0 980 {H}" role="img" aria-label="{title}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">',
         '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#c6f24e"/></marker></defs>',
         f'<rect x="1" y="1" width="978" height="{H - 2}" rx="18" fill="#0f1113" stroke="rgba(237,235,230,.08)"/>',
         f'<rect x="28" y="{cy - 44}" width="230" height="88" rx="14" fill="#16181b" stroke="#c6f24e" stroke-opacity=".6"/>',
         f'<text x="143" y="{cy - 8}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="17" font-weight="700" fill="#edebe6">{src_lbl[0]}</text>',
         f'<text x="143" y="{cy + 18}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="13.5" fill="#9a9890">{src_lbl[1]}</text>',
         f'<rect x="722" y="{cy - 44}" width="230" height="88" rx="14" fill="#16181b" stroke="#c6f24e" stroke-opacity=".6"/>',
         f'<text x="837" y="{cy - 8}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="17" font-weight="700" fill="#edebe6">{dst_lbl[0]}</text>',
         f'<text x="837" y="{cy + 18}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="13.5" fill="#9a9890">{dst_lbl[1]}</text>']
    for i, (a, b2, ok) in enumerate(targets):
        y = 60 + i * 86 + 18
        col = '#c6f24e' if ok else '#ff7a6b'
        g.append(f'<path d="M258 {cy} C 300 {cy}, 300 {y + 26}, 340 {y + 26}" fill="none" stroke="{col}" stroke-opacity=".7" stroke-width="2" marker-end="url(#ar)"/>')
        g.append(f'<rect x="346" y="{y}" width="300" height="52" rx="12" fill="#16181b" stroke="rgba(237,235,230,.12)"/>')
        g.append(f'<circle cx="368" cy="{y + 26}" r="6" fill="{col}"/>')
        g.append(f'<text x="384" y="{y + 22}" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="15" font-weight="600" fill="#edebe6">{a}</text>')
        g.append(f'<text x="384" y="{y + 41}" font-family="SF Mono,Menlo,monospace" font-size="11.5" fill="#9a9890">{b2}</text>')
        g.append(f'<path d="M646 {y + 26} C 686 {y + 26}, 686 {cy}, 716 {cy}" fill="none" stroke="#c6f24e" stroke-opacity=".45" stroke-width="2" marker-end="url(#ar)"/>')
    if note:
        g.append(f'<text x="490" y="{H - 18}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="12.5" fill="#6a6862">{note}</text>')
    g.append('</svg>')
    return '\n'.join(g)


def seo_block(md, fig_svg, fig_cap, intro_md=''):
    full = (intro_md.strip() + '\n\n' + md.strip()).strip()
    parts = re.split(r'\n(?=## )', full, maxsplit=1)
    first = md2html(parts[0]); rest = md2html(parts[1]) if len(parts) > 1 else ''
    return (f'<article class="card seo">{first}<figure class="fig">{fig_svg}<figcaption>{fig_cap}</figcaption></figure>{rest}</article>')


SEO_CSS = """<style>
  .seo {{ padding: 30px 34px; }} .seo h2 {{ font-size: clamp(21px, 2.4vw, 26px); margin: 28px 0 10px; letter-spacing: -.01em; }} .seo h2:first-child {{ margin-top: 0; }}
  .seo p, .seo li {{ color: #cfd3cf; font-size: 16.5px; line-height: 1.65; max-width: 48em; }} .seo b {{ color: var(--text); }}
  .seo ul, .seo ol {{ padding-left: 22px; }} .seo li {{ margin: 6px 0; }}
  .fig {{ margin: 22px 0 8px; }} .fig figcaption {{ color: var(--muted); font-size: 13.5px; margin-top: 8px; text-align: center; }}
  @media (max-width: 720px) {{ .seo {{ padding: 22px 18px; }} }}
</style>""".replace('{{', '{').replace('}}', '}')
pv_fig = svg_flow('Как работает проверка сайта', ('Ваш сайт', 'адрес из поля выше'),
                  [('Сервер в России, без VPN', 'как обычный посетитель', True), ('Сервер за рубежом', 'как посетитель с VPN', True),
                   ('DNS, сертификат, домен, почта', 'whois · MX · NS · SSL', True)], ('Итог + что делать', 'и бот @rebornlab_bot'),
                  'Две точки проверки показывают разницу «без VPN» и «с VPN»: сайт может открываться только в одной из них')
script = script.replace('__HB__', HB).replace('__HOST_LINKS__', json.dumps(HOST_LINKS, ensure_ascii=False)).replace('__AD_NOTE__', json.dumps(AD_NOTE, ensure_ascii=False))
main = main.replace('__HB__', HB).replace('__SEO__', seo_block(SEO['_proverka'], pv_fig, 'Схема: две точки проверки — из России без VPN и из-за рубежа — плюс проверка DNS, сертификата, домена и почты'))
head = head.replace('</style>', '</style>\n' + SEO_CSS, 1)
html = head + hdr + '\n' + main + '\n' + foot + mainjs + '\n' + script + '</body>\n</html>\n'
out = ROOT / PV.strip('/') / 'index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print('готово:', out, len(html) // 1024, 'КБ')

# ===================== 12.11: страницы хостингов — /hosting/ и /hosting/<slug>/ =====================
# Данные — те же, что в мониторинге (tkanimix/server/hostmon/hostmon.py, P): панель и DNS-серверы проверены dig 12.11.
# Живой статус — /hm/status.json (раз в 30 мин из России без VPN), история 7 дней — полоса «как на статус-страницах».
HOSTS = [
    ('regru', 'REG.RU', 'Хостинг и домены', 'https://www.reg.ru/user/account/', ['ns1.reg.ru', 'ns2.reg.ru']),
    ('timeweb', 'Timeweb', 'Хостинг и облако', 'https://hosting.timeweb.ru/', ['ns1.timeweb.ru', 'ns2.timeweb.ru', 'ns3.timeweb.org', 'ns4.timeweb.org']),
    ('spaceweb', 'SpaceWeb', 'Хостинг', 'https://cp.sweb.ru/', ['ns1.sweb.ru', 'ns2.sweb.ru', 'ns4.sweb.ru']),
    ('ru-center', 'RU-CENTER', 'Домены и хостинг', 'https://www.nic.ru/manager/', ['ns3.nic.ru', 'ns4.nic.ru', 'ns8.nic.ru']),
    ('jino', 'Джино', 'Хостинг', 'https://cp.jino.ru/', ['ns1.jino.ru', 'ns2.jino.ru']),
    ('sprinthost', 'Sprinthost', 'Хостинг', 'https://cp.sprinthost.ru/', ['ns1.sprinthost.ru', 'ns2.sprinthost.ru']),
    ('hostland', 'Hostland', 'Хостинг', 'https://panel.hostland.ru/', ['ns.hostland.ru', 'ns3.hostland.ru']),
    ('mchost', 'Макхост', 'Хостинг', 'https://cp.mchost.ru/', ['ns1.mchost.ru', 'ns2.mchost.ru']),
    ('majordomo', 'Majordomo', 'Хостинг', 'https://hms.majordomo.ru/', ['ns.majordomo.ru', 'ns2.majordomo.ru', 'ns3.majordomo.ru']),
    ('ihc', 'IHC', 'Хостинг', 'https://my.ihc.ru/', ['ns1.ihc.ru', 'ns2.ihc.ru']),
    ('netangels', 'NetAngels', 'Хостинг', 'https://panel.netangels.ru/', ['ns1.netangels.ru', 'ns2.netangels.ru']),
    ('masterhost', 'Masterhost', 'Хостинг', 'https://cp.masterhost.ru/', ['ns.masterhost.ru', 'ns1.masterhost.ru', 'ns2.masterhost.ru']),
    ('ruweb', 'RuWeb', 'Хостинг', 'https://ruweb.net/', ['ns1.ruweb.net', 'ns2.ruweb.net']),
    ('tilda', 'Tilda', 'Конструктор сайтов', 'https://tilda.ru/login/', []),
    ('selectel', 'Selectel', 'Облако', 'https://my.selectel.ru/', ['ns1.selectel.org', 'ns2.selectel.org', 'ns3.selectel.org', 'ns4.selectel.org']),
    ('yandex-cloud', 'Yandex Cloud', 'Облако', 'https://console.yandex.cloud/', ['ns1.yandexcloud.net', 'ns2.yandexcloud.net']),
    ('vk-cloud', 'VK Cloud', 'Облако', 'https://msk.cloud.vk.com/app/', ['ns1.mcs.mail.ru', 'ns2.mcs.mail.ru']),
    ('cloud-ru', 'Cloud.ru', 'Облако', 'https://console.cloud.ru/', []),
    ('serverspace', 'Serverspace', 'Облако', 'https://my.serverspace.ru/', []),
    ('firstvds', 'FirstVDS', 'VPS', 'https://my.firstvds.ru/', ['ns1.firstvds.ru', 'ns2.firstvds.ru']),
    ('vdsina', 'VDSina', 'VPS', 'https://cp.vdsina.ru/', ['ns1.vdsina.ru', 'ns2.vdsina.ru']),
    ('adminvps', 'AdminVPS', 'VPS', 'https://my.adminvps.ru/', ['ns1.adminvps.ru', 'ns2.adminvps.ru']),
    ('aeza', 'Aeza', 'VPS', 'https://my.aeza.net/', []),
    ('justhost', 'JustHost', 'VPS', 'https://justhost.ru/billing/', ['ns1.justhost.ru', 'ns2.justhost.ru']),
    ('fornex', 'Fornex', 'VPS и хостинг', 'https://fornex.com/my/', ['ns1.fornex.com', 'ns2.fornex.com']),
    ('hostkey', 'HOSTKEY', 'Серверы', 'https://invapi.hostkey.com/', ['ns1.hostkey.ru', 'ns2.hostkey.ru']),
    ('4vps', '4VPS', 'VPS', 'https://4vps.su/account', []),
]
NO_SITES = {'timeweb'}   # сайты клиентов не проверяем: хостинг закрывает наши проверки (Ник 11.11)
style_block = head[head.index('<style>'):head.index('</style>') + 8]
HCSS = '''<style>
  .hs {{ display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; align-items: stretch; }}
  .big {{ display: flex; gap: 16px; align-items: center; }} .big .dotb {{ width: 22px; height: 22px; border-radius: 50%; background: var(--muted); flex: none; }}
  .dotb.ok {{ background: var(--acc); box-shadow: 0 0 18px rgba(198,242,78,.7); }} .dotb.warn {{ background: #ffcc4d; box-shadow: 0 0 18px rgba(255,204,77,.6); }} .dotb.bad {{ background: #ff7a6b; box-shadow: 0 0 18px rgba(255,122,107,.6); }}
  .big b {{ font-size: clamp(24px, 3.4vw, 34px); letter-spacing: -.02em; }}
  .rows {{ margin-top: 16px; display: grid; gap: 10px; }} .row {{ display: flex; justify-content: space-between; gap: 14px; padding: 12px 14px; background: var(--card-2); border-radius: 12px; font-size: 15px; }}
  .row span:first-child {{ color: var(--muted); }} .row .g {{ color: var(--acc); }} .row .y {{ color: #ffcc4d; }} .row .r {{ color: #ff7a6b; }}
  .strip {{ display: flex; gap: 2px; height: 34px; align-items: stretch; margin-top: 10px; }} .strip i {{ flex: 1; border-radius: 2px; background: var(--card-2); }}
  .strip i.o {{ background: rgba(198,242,78,.75); }} .strip i.w {{ background: #ffcc4d; }} .strip i.d {{ background: #ff7a6b; }}
  .strip-l {{ display: flex; justify-content: space-between; color: var(--muted); font-size: 13px; margin-top: 6px; }}
  .tabs {{ display: flex; gap: 8px; flex-wrap: wrap; margin: 4px 0 14px; }} .tabs button {{ background: var(--card-2); color: var(--text); border: 1px solid var(--line); border-radius: 999px; padding: 7px 14px; cursor: pointer; font-size: 14px; }}
  .tabs button.on {{ border-color: var(--acc); color: var(--acc); }}
  .ad {{ font-size: 12px; color: var(--muted); }}
  .facts2 {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }}
  @media (max-width: 720px) {{ .hs {{ grid-template-columns: 1fr; }} }}
</style>'''.replace('{{', '{').replace('}}', '}')


def page(title, desc, url, h1, body_main, body_script, lds, og_title=None):
    robots_ = '' if PUBLISH else '<meta name="robots" content="noindex,nofollow">\n'
    ldh = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    return (f'<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'{robots_}<title>{title}</title>\n<meta name="description" content="{desc}">\n<link rel="canonical" href="https://rebornlab.ru{url}">\n'
            f'<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">\n<meta property="og:title" content="{og_title or h1}">\n'
            f'<meta property="og:description" content="{desc}">\n<meta property="og:image" content="https://rebornlab.ru/assets/og.jpg">\n{css_link}\n{ldh}\n'
            f'{style_block}\n{HCSS}\n{SEO_CSS}\n</head>\n<body>\n{hdr}\n{body_main}\n{foot}{mainjs}\n{body_script}</body>\n</html>\n')


def crumbs(items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': 'https://rebornlab.ru' + u} for i, (n, u) in enumerate(items)]}


def faq_ld(f):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub(r'<[^>]+>', '', a)}} for q, a in f]}


BOT_CTA = ('<div class="card cta"><div><h2>🔔 Узнавайте первым, когда сайт упал или заработал</h2><p>Бесплатный бот @rebornlab_bot '
           'проверяет ваш сайт каждые 10 минут и сразу пишет в Telegram. Без рекламы и регистрации.</p></div>'
           '<a class="btn btn-acc" href="https://t.me/rebornlab_bot" target="_blank" rel="noopener" data-goal="hosting_bot">Открыть бота</a></div>')
CHECK_FORM = ('<form class="pq" data-pv="{pv}" onsubmit="event.preventDefault();var v=this.q.value.trim();if(v)location.href=this.dataset.pv+\'#\'+encodeURIComponent(v);">'
              '<input name="q" type="text" inputmode="url" placeholder="{ph}" aria-label="Адрес сайта" required>'
              '<button class="btn btn-acc" type="submit">Проверить без VPN</button></form>')

HOST_JS = r'''<script>
(function () {
  var KEY = '__KEY__', HB = '__HB__';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function hm(t) { return new Date(t * 1000).toLocaleTimeString('ru-RU', {timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit'}); }
  function pl(n) { var m = n % 10, c = n % 100; return n + ' ' + (m === 1 && c !== 11 ? 'проверка' : m >= 2 && m <= 4 && (c < 12 || c > 14) ? 'проверки' : 'проверок'); }
  fetch('/hm/status.json', {cache: 'no-store'}).then(function (r) { return r.json(); }).then(function (h) {
    var x = (h.providers || {})[KEY]; if (!x) return;
    var cls = x.level === 'ok' ? 'ok' : x.level === 'warn' ? 'warn' : 'bad';
    var word = cls === 'ok' ? 'работает' : cls === 'warn' ? 'частичные сбои' : 'не работает';
    document.getElementById('st-dot').className = 'dotb ' + cls;
    document.getElementById('st-w').textContent = x.name + ' ' + word;
    document.getElementById('st-t').textContent = 'проверено в ' + hm(h.updated) + ' МСК из России, без VPN · обновляется каждые 30 минут';
    var rows = [];
    rows.push(['Панель управления', x.panel ? '<span class="g">открывается</span>' : '<span class="r">не открывается</span>']);
    if (x.dns_total) rows.push(['DNS-серверы для доменов', '<span class="' + (x.dns_ok === x.dns_total ? 'g' : x.dns_ok ? 'y' : 'r') + '">отвечают ' + x.dns_ok + ' из ' + x.dns_total + '</span>']);
    if (!x.sites_checked) rows.push(['Сайты клиентов', 'не проверяем — хостинг ограничивает наши проверки']);
    else if (x.sites_total) rows.push(['Сайты клиентов из нашей выборки', '<span class="' + (x.sites_ok / x.sites_total >= .85 ? 'g' : x.sites_ok / x.sites_total >= .5 ? 'y' : 'r') + '">открываются ' + x.sites_ok + ' из ' + x.sites_total + '</span>' + (x.sites_total < 10 ? ' <small style="color:var(--muted)">(выборка мала — статус по ней не решаем)</small>' : '')]);
    else rows.push(['Сайты клиентов', 'выборка пока собирается — проверьте свой сайт выше']);
    document.getElementById('st-rows').innerHTML = rows.map(function (r) { return '<div class="row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join('');
    var hist = (h.history || []).filter(function (p) { return p[KEY]; }).slice(-96), bad = 0;
    document.getElementById('strip').innerHTML = hist.map(function (p) { var l = p[KEY].l; if (l !== 'o') bad++; return '<i class="' + l + '" title="' + hm(p.t) + ' — ' + (l === 'o' ? 'работает' : l === 'w' ? 'частичные сбои' : 'сбой') + '"></i>'; }).join('');
    document.getElementById('strip-n').textContent = hist.length ? (bad ? 'сбоев за период: ' + bad + ' из ' + pl(hist.length) : 'сбоев не было — ' + pl(hist.length) + ' подряд') : 'история копится';
    // другие хостинги: сначала со сбоями
    var ks = Object.keys(h.providers).filter(function (k) { return k !== KEY; }), rank = {down: 0, warn: 1, ok: 2};
    ks.sort(function (a, b) { return rank[h.providers[a].level] - rank[h.providers[b].level]; });
    document.getElementById('others').innerHTML = ks.map(function (k) { var y = h.providers[k], c = y.level === 'ok' ? 'ok' : y.level === 'warn' ? 'warn' : 'bad'; return '<a class="h hl" href="' + HB + k + '/"><div class="n"><i class="' + c + '"></i>' + esc(y.name) + '</div><div class="l">' + (c === 'ok' ? 'работает' : c === 'warn' ? 'частичные сбои' : 'сбой') + '</div></a>'; }).join('') + '<a class="h hl" href="/beget/"><div class="n"><i></i>Beget</div><div class="l">свой подробный мониторинг</div></a>';
  }).catch(function () {});
})();
</script>
'''

hub_cards = []
for slug, name, typ, panel, ns in HOSTS:
    host = re.sub(r'^https?://', '', panel).split('/')[0]
    nsl = ', '.join(ns)
    sites_txt = ('Сайты клиентов этого хостинга мы не проверяем: он ограничивает наши проверки. Поэтому статус — по панели управления и DNS-серверам.'
                 if slug in NO_SITES else 'Ещё проверяем выборку реальных сайтов, которые работают у этого хостинга: открываются ли они без VPN.')
    faq = [
        (f'Как понять, что не работает именно {name}, а не мой сайт?', f'Посмотрите статус выше: если панель {name} открывается, DNS-серверы отвечают и сайты других клиентов открываются — хостинг в целом работает, и дело в конкретном сайте. Проверьте свой сайт в поле на этой странице: покажем, что видит посетитель и какая ошибка, и подскажем, как её исправить.'),
        (f'Где панель управления {name}?', f'Вход в панель — {host}. Если панель не открывается, а сайты работают, — сбой затронул только панель: сайты и почта обычно продолжают работать.'),
    ]
    if ns:
        faq.append((f'Какие DNS-серверы у {name}?', f'Для доменов на DNS {name} обычно указывают: {nsl}. Мы раз в 30 минут проверяем, что эти серверы отвечают. Если не отвечают все — сайты на таких доменах перестают открываться у новых посетителей.'))
    faq += [
        (f'Сайт на {name} не открывается с VPN — почему?', 'Хостинг или защита сайта могут закрывать доступ с зарубежных адресов. Наша проверка сайта показывает обе точки — из России без VPN и из-за рубежа, — так видно, в этом ли дело.'),
        (f'Как узнать, когда {name} или мой сайт снова заработает?', 'Добавьте сайт в бесплатного бота @rebornlab_bot: он проверяет его каждые 10 минут и сразу пишет в Telegram, когда сайт упадёт или заработает.'),
    ]
    ad = ''
    if name in HOST_LINKS:
        ad = (f'<p style="margin:14px 0 0"><a class="btn btn-ghost" href="{HOST_LINKS[name]}" target="_blank" rel="noopener sponsored">Сайт {name} →</a> '
              f'<span class="ad">{AD_NOTE.get(name, "Реклама")}</span></p>')
    faq_h = ''.join(f'<details class="qa"><summary>{q}</summary><p>{a}</p></details>' for q, a in faq)
    TYPE_P = {
        'Хостинг': f'У виртуального хостинга сайты, базы данных и почта клиентов живут на общих серверах {name}. Поэтому сбой сервера хостинга сразу виден по сайтам клиентов, а сбой панели — нет: сайты продолжают работать, просто владельцы не могут зайти в настройки.',
        'Облако': f'В облаке {name} сайты работают на виртуальных серверах клиентов. Если не открывается панель {name}, это ещё не значит, что ваши серверы выключены: чаще всего сайты продолжают работать. Поэтому мы смотрим и на панель, и на реальные сайты.',
        'VPS': f'На VPS у {name} каждый клиент сам настраивает свой сервер. Сбой панели {name} не останавливает уже запущенные серверы, а вот проблемы в сети хостинга видны сразу по всем сайтам — их мы и ловим по выборке.',
        'Конструктор сайтов': f'Сайты на {name} работают на серверах самого конструктора. Если {name} недоступна, не открываются сразу все сайты на ней, и на стороне владельца сделать ничего нельзя — остаётся ждать восстановления сервиса.',
    }
    tp = TYPE_P.get(typ) or (TYPE_P['Облако'] if 'облак' in typ.lower() else TYPE_P['VPS'] if 'vps' in typ.lower() or 'Серверы' in typ else TYPE_P['Хостинг'])
    if 'Домены' in typ:
        tp = f'{name} — прежде всего регистратор доменов. Если не отвечают DNS-серверы {name}, домены на них перестают открываться у новых посетителей, даже если сам сайт размещён у другого хостинга. Поэтому для {name} главное в мониторинге — DNS.'
    lst = [f'**Панель управления** — открываем {host}, как обычный пользователь.']
    lst.append(f'**DNS-серверы** — опрашиваем {nsl}: они отвечают за то, чтобы домены клиентов открывались.' if ns else '**DNS** — у этого сервиса мы его не проверяем: клиенты используют разные DNS.')
    lst.append('**Сайты клиентов** — не проверяем: хостинг ограничивает наши проверки.' if slug in NO_SITES else '**Сайты клиентов** — открываем выборку реальных сайтов, которые работают у этого хостинга.')
    intro = f'## Как мы проверяем {name}\n\nМониторинг {name} идёт раз в 30 минут с сервера в России без VPN — так, как сайты видит обычный посетитель:\n\n' + '\n'.join('- ' + x for x in lst) + f'\n\n{tp}'
    ai = SEO.get(slug, '')
    ai = '\n\n'.join(b for b in re.split(r'\n(?=## )', ai) if not re.match(r'## (Что мы проверяем|Как узнать о сбое)', b))   # эти разделы уже есть выше/в блоке бота
    targets = [('Панель управления', host, True), (('DNS-серверы' if ns else 'DNS не проверяем'), (', '.join(ns[:2]) + (' …' if len(ns) > 2 else '')) if ns else 'разные у клиентов', bool(ns)),
               ('Сайты клиентов', 'выборка реальных сайтов' if slug not in NO_SITES else 'не проверяем', slug not in NO_SITES)]
    fig = svg_flow(f'Как мы проверяем {name}', ('Сервер в России', 'без VPN · каждые 30 мин'), targets, (f'Статус {name}', 'здесь и в боте'),
                   (f'Мониторинг {name}: красная точка — этот пункт у {name} не проверяем' if not all(t[2] for t in targets) else f'Независимый мониторинг {name} · REBORN LAB'))
    seo_h = seo_block(ai, fig, f'Схема мониторинга {name}: что именно мы проверяем и откуда', intro)
    url = f'{HB}{slug}/'
    h1 = f'Проверка {name}: работает ли {name} сейчас без VPN'   # 12.11 Ник: в H1 — «Проверка», в title — «Мониторинг», в тексте сначала «мониторинг'
    body = f'''<main class="pw">
  <span class="live"><span class="dot"></span>мониторинг {name} · {typ.lower()} · из России без VPN</span>
  <h1>{h1}</h1>
  <p class="lead">Мониторинг {name} из России без VPN: раз в 30 минут открываем панель управления {name} и опрашиваем его DNS-серверы — как обычный посетитель. {sites_txt}</p>
  <div class="hs">
    <div class="card"><div class="big"><span class="dotb" id="st-dot"></span><b id="st-w">Загружаем статус {name}…</b></div>
      <p class="sub" id="st-t" style="margin:8px 0 0"></p><div class="rows" id="st-rows"></div>{ad}</div>
    <div class="card"><h2>Последние 48 часов</h2><p class="sub">Каждая полоска — одна проверка. Зелёный — работает, жёлтый — частичные сбои, красный — сбой.</p>
      <div class="strip" id="strip"></div><div class="strip-l"><span id="strip-n"></span><span>сейчас →</span></div></div>
  </div>
  <div class="card"><h2>Проверить свой сайт на {name}</h2><p class="sub">Статус хостинга и вашего сайта могут отличаться. Проверим из России без VPN и из-за рубежа, покажем ошибку и как её исправить.</p>
    {CHECK_FORM.format(pv=PV, ph="Адрес сайта на " + name)}</div>
  <div class="card"><h2>{name}: что мы знаем</h2><div class="facts2">
    <div class="f"><div class="k">Услуга</div><div class="v">{typ}</div></div>
    <div class="f"><div class="k">Панель управления</div><div class="v">{host}</div></div>
    {f'<div class="f"><div class="k">DNS для доменов</div><div class="v" style="font-size:15px">{nsl}</div></div>' if ns else ''}
    <div class="f"><div class="k">Что проверяем</div><div class="v" style="font-size:15px">панель{", DNS" if ns else ""}{"" if slug in NO_SITES else ", сайты клиентов"}</div><div class="d">из России, без VPN, каждые 30 минут</div></div>
  </div></div>
  {BOT_CTA}
  {seo_h}
  <div class="card"><h2>Вопросы о {name}</h2>{faq_h}</div>
  <div class="card"><h2>Другие хостинги сейчас <a class="lnk" href="{HB}" style="font-size:15px;font-weight:500;margin-left:8px">все →</a></h2><div class="hosts compact" id="others"></div></div>
  <p class="hint">Мы не связаны с {name} и не представляем его. Ответ панели и DNS не гарантирует работу всех сайтов и услуг хостинга.{(' ' + AD_FOOT[name]) if name in AD_FOOT else ''}</p>
</main>'''
    title = f'Мониторинг {name}: не работает {name} сегодня? Статус сейчас без VPN'
    desc = f'Мониторинг {name}: работает ли {name} прямо сейчас — панель управления{", DNS-серверы" if ns else ""}{"" if slug in NO_SITES else " и сайты клиентов"} — проверка из России без VPN каждые 30 минут. Проверьте свой сайт и получите уведомление в Telegram.'
    lds = [crumbs([('Главная', '/'), ('Мониторинг хостингов', HB), (name, url)]), faq_ld(faq)]
    o = ROOT / url.strip('/') / 'index.html'
    o.parent.mkdir(parents=True, exist_ok=True)
    o.write_text(page(title, desc, url, h1, body, HOST_JS.replace('__KEY__', slug).replace('__HB__', HB), lds))
    hub_cards.append((slug, name, typ))

# хаб /hosting/
hub_faq = [
    ('Как узнать, какой хостинг сейчас не работает?', 'Посмотрите список выше: хостинги со сбоями стоят первыми. Цвет — итог последней проверки: панель управления, DNS-серверы и выборка сайтов клиентов, открываем всё из России без VPN.'),
    ('Хостинг работает, а мой сайт — нет. Почему?', 'Статус хостинга не гарантирует работу каждого сайта: сайт может не открываться из-за своей ошибки, сертификата, версии PHP или привязки домена. Проверьте свой сайт — покажем, в чём дело и как исправить.'),
    ('Почему важно проверять без VPN?', 'Большинство посетителей открывают сайты без VPN. С VPN сайт может открываться, а у людей — нет (и наоборот). Мы проверяем из России без VPN, а проверка сайта дополнительно показывает, открывается ли он из-за рубежа.'),
    ('Как часто обновляются данные?', 'Каждые 30 минут. Beget — отдельно, подробный мониторинг каждые 15 минут на странице rebornlab.ru/beget/.'),
]
hub_main = f'''<main class="pw">
  <span class="live"><span class="dot"></span>27 хостингов и облаков + Beget · из России без VPN · каждые 30 минут</span>
  <h1>Проверка хостингов: какой хостинг не работает сейчас</h1>
  <p class="lead">Мониторинг хостингов из России без VPN: раз в 30 минут открываем панели управления, опрашиваем DNS-серверы и проверяем сайты клиентов — как обычный посетитель. Сначала — хостинги со сбоями.</p>
  <div class="card"><h2>Не открывается ваш сайт?</h2><p class="sub">Хостинг может работать, а сайт — нет. Проверим ваш адрес из России без VPN и из-за рубежа и подскажем, как исправить.</p>
    {CHECK_FORM.format(pv=PV, ph="Адрес сайта, например mysite.ru")}</div>
  <div class="card"><div class="tabs" id="tabs"><button class="on" data-t="all">Все</button><button data-t="host">Хостинг</button><button data-t="cloud">Облака и VPS</button><button data-t="bad">Со сбоями</button></div>
    <p class="sub" id="hupd">Загружаем…</p><div class="hosts" id="all"></div></div>
  {BOT_CTA}
  __HUBSEO__
  <div class="card"><h2>Вопросы</h2>{''.join(f'<details class="qa"><summary>{q}</summary><p>{a}</p></details>' for q, a in hub_faq)}</div>
  <p class="hint">Мы не связаны с хостингами из списка. Ответ панели и DNS не гарантирует работу всех сайтов и услуг хостинга.</p>
</main>'''
TYPES = {s: ('host' if t in ('Хостинг', 'Хостинг и домены', 'Домены и хостинг', 'Хостинг и облако', 'Конструктор сайтов') else 'cloud') for s, n, t in hub_cards}
hub_js = r'''<script>
(function () {
  var HB = '__HB__', TYPES = __TYPES__, H = null, T = 'all', BG = null;
  fetch('https://api.rebornlab.ru/beget.json', {cache: 'no-store'}).then(function (r) { return r.json(); }).then(function (b) { var p = Math.round(100 * b.sites_up / b.sites_total); BG = {p: p, c: p > 85 ? 'ok' : p > 30 ? 'warn' : 'bad'}; draw(); }).catch(function () {});
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function draw() {
    if (!H) return;
    var ks = Object.keys(H.providers), rank = {down: 0, warn: 1, ok: 2};
    ks.sort(function (a, b) { return rank[H.providers[a].level] - rank[H.providers[b].level]; });
    var cards = ks.filter(function (k) { var x = H.providers[k]; return T === 'all' || (T === 'bad' ? x.level !== 'ok' : TYPES[k] === T); }).map(function (k) {
      var x = H.providers[k], c = x.level === 'ok' ? 'ok' : x.level === 'warn' ? 'warn' : 'bad', d = [];
      d.push('панель ' + (x.panel ? 'открывается' : '<b style="color:#ff7a6b">не открывается</b>'));
      if (x.dns_total) d.push('DNS ' + x.dns_ok + '/' + x.dns_total);
      if (x.sites_total >= 3) d.push('сайтов ' + x.sites_ok + '/' + x.sites_total);
      return '<a class="h hl" href="' + HB + k + '/"><div class="n"><i class="' + c + '"></i>' + esc(x.name) + '</div><div class="l">' + esc(x.type || '') + ' · ' + (c === 'ok' ? 'работает' : c === 'warn' ? 'частичные сбои' : 'сбой') + '<br>' + d.join(' · ') + '</div></a>';
    });
    if (BG && (T === 'all' || T === 'host' || (T === 'bad' && BG.c !== 'ok'))) cards.unshift('<a class="h hl" href="/beget/"><div class="n"><i class="' + BG.c + '"></i>Beget</div><div class="l">Хостинг · ' + (BG.c === 'ok' ? 'работает' : BG.c === 'warn' ? 'частичные сбои' : 'серьёзный сбой') + '<br>сайтов из выборки открывается ' + BG.p + '% · подробный мониторинг</div></a>');
    document.getElementById('all').innerHTML = cards.join('') || '<div class="h"><div class="l">Сбоев сейчас нет 🎉</div></div>';
  }
  [].forEach.call(document.querySelectorAll('#tabs button'), function (b) { b.addEventListener('click', function () { T = b.dataset.t; [].forEach.call(document.querySelectorAll('#tabs button'), function (x) { x.className = x === b ? 'on' : ''; }); draw(); }); });
  fetch('/hm/status.json', {cache: 'no-store'}).then(function (r) { return r.json(); }).then(function (h) {
    H = h; var bad = Object.keys(h.providers).filter(function (k) { return h.providers[k].level !== 'ok'; }).length;
    document.getElementById('hupd').textContent = 'Проверено в ' + new Date(h.updated * 1000).toLocaleTimeString('ru-RU', {timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit'}) + ' МСК · со сбоями сейчас: ' + bad + ' (без учёта Beget) · нажмите на хостинг — подробности и история';
    draw();
  }).catch(function () {});
})();
</script>
'''
hub_fig = svg_flow('Как устроен мониторинг хостингов', ('Сервер в России', 'без VPN · каждые 30 мин'),
                   [('Панели управления', '27 хостингов и облаков', True), ('DNS-серверы', 'серверы доменов клиентов', True), ('Сайты клиентов', 'выборка реальных сайтов', True)],
                   ('Статус и история', 'на сайте и в боте'), 'Независимый мониторинг REBORN LAB · Beget — отдельный, каждые 15 минут')
hub_main = hub_main.replace('__HUBSEO__', seo_block(SEO['_hub'], hub_fig, 'Схема: что мы проверяем у каждого хостинга'))
hub_url = HB
o = ROOT / hub_url.strip('/') / 'index.html'
o.parent.mkdir(parents=True, exist_ok=True)
o.write_text(page('Мониторинг хостингов: какой хостинг не работает сейчас — статус без VPN', 'Мониторинг хостингов: работают ли REG.RU, Timeweb, SpaceWeb, Джино, Selectel и ещё 20+ хостингов прямо сейчас: панели, DNS и сайты клиентов — наша проверка из России без VPN каждые 30 минут.', hub_url,
                  'Проверка хостингов: какой хостинг не работает сейчас', hub_main, hub_js.replace('__HB__', HB).replace('__TYPES__', json.dumps(TYPES)),
                  [crumbs([('Главная', '/'), ('Мониторинг хостингов', hub_url)]), faq_ld(hub_faq)]))
print('хостингов:', len(hub_cards), '+ хаб', hub_url)
