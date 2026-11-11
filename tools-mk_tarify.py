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
 ('Лендинг из веб-архива', 'Тариф 1', 'Одностраничный сайт или промо-страница', ['Одна страница: возвращаем тексты, блоки и прежний адрес', 'Изображения — из доступных архивных копий и ваших материалов', 'Рабочая форма заявок на вашу почту', 'Обычно — в тот же день']),
 ('Возврат вашего WordPress из копии', 'Тариф 2', 'Если у вас есть полная копия сайта: файлы и база данных. 1С-Битрикс и другие CMS — стоимость по согласованию', ['Разворачиваем копию на новом хостинге', 'Админка, заказы и пользователи — как были', 'Подключаем домен и https', 'Цена — для готовой рабочей копии; если копия неполная или повреждена, стоимость согласуем отдельно']),
 ('Сайт или каталог из веб-архива', 'Тариф 3', 'Многостраничный сайт, каталог, блог — когда копии нет', ['Восстанавливаем доступные страницы, тексты, заголовки и изображения', 'Сохраняем прежнюю структуру и адреса страниц', 'Формы заявок настраиваем заново', 'Админка и база пользователей без оригинальной копии не восстанавливаются: правки вносим мы', 'Для очень больших сайтов (сотни страниц) стоимость согласуем заранее']),
 ('Новый сайт на WordPress с админкой', 'Тариф 4', 'Если нужен сайт, который вы будете править сами', ['Сайт на WordPress с адаптивным дизайном и админкой', 'Переносим содержимое из архива или копии с теми же адресами страниц', 'Хостинг — ваш, поможем выбрать и настроить', 'Интернет-магазин, сложные интеграции, нестандартные функции и большой объём контента — рассчитываем отдельно']),
]
FAQ = [
 ('Вы работаете только с WordPress?', 'Нет — с любыми CMS: WordPress, 1С-Битрикс, Joomla, MODX, OpenCart, Drupal, Tilda и самописными сайтами. Если есть копия, возвращаем сайт на родном движке (для 1С-Битрикс нужна ваша лицензия). Если копии нет, собираем сайт по веб-архиву независимо от того, на чём он был, а при необходимости делаем новый сайт с админкой — в том числе интернет-магазин.'),
 ('Можно ли восстановить интернет-магазин?', 'Витрину — каталог, описания, цены на дату снимка — можно собрать по веб-архиву. Заказы, покупателей и админку вернуть можно только из резервной копии. Если копии нет, сделаем новый магазин с админкой, корзиной, оплатой и доставкой и перенесём в него каталог; стоимость считаем по задаче.'),
 ('Вы хостинг-провайдер? Где будет работать сайт после восстановления?', 'Нет, мы не хостинг-провайдер и хостинг не продаём. Чтобы сайт снова заработал как можно скорее, можем на время разместить его на своём сервере — бесплатно на время переезда, пока вы спокойно выбираете, где ему жить дальше. Затем переносим сайт туда, куда скажете: к прежнему хостингу, когда он снова заработает, или к любому другому. Помогаем с переездом: файлы, база, домен, почта, сертификат. Все файлы и доступы — у вас, сайт ни к чему у нас не привязан.'),
 ('Можно ли работать с вами и дальше?', 'Да, если захотите. Можем поддерживать сайт: правки, обновления, резервные копии, помощь, если что-то перестанет работать, — и делать новое, когда понадобится. Это только по желанию: после восстановления вы нам ничем не обязаны.'),
 ('Как понять, какой тариф нужен?', 'Пришлите адрес сайта — бесплатно проверим, что сохранилось, и скажем, какой вариант подойдёт. Сами можете посмотреть на странице «можно ли восстановить сайт».'),
 ('Сохранятся ли позиции в Яндексе и Google?', 'Гарантировать позиции не может никто — поисковики сами переобходят страницы и пересчитывают выдачу. Мы сохраняем прежние адреса страниц, структуру и содержимое, чтобы минимизировать риск потери поискового трафика.'),
 ('Что нельзя вернуть из веб-архива?', 'Базу заказов и заявок, личные кабинеты, админку. Сайт возвращается «витриной»: все страницы и тексты на месте, формы заявок делаются заново. Когда появится копия от хостинга, можно вернуть родную админку.'),
 ('Где будет работать сайт?', 'На нашем сервере или на вашем хостинге — как удобнее. Домен остаётся вашим, мы только направляем его на новый сервер.'),
 ('А если хостинг потом всё починит?', 'Тогда можно спокойно вернуть сайт обратно или оставить как есть. Восстановленный сайт — это мост, чтобы вы не теряли клиентов и позиции, пока ждёте.'),
 ('Как оплатить?', 'После того как мы проверим сайт и вы согласуете вариант. Обычно оплата — когда сайт уже работает на временном адресе и вы его посмотрели.'),
]

cards = ''.join(f'<div class="plan"><b class="pn">{E(n)}</b><div class="pp">{E(p)}</div><p class="pd">{E(d)}</p><ul>' + ''.join(f'<li>{E(x)}</li>' for x in items) + f'</ul><a class="btn pick" href="#contact" data-plan="{E(n)} — {E(p)}">Выбрать</a></div>' for n, p, d, items in PLANS)
plan_opts = ''.join(f'<option>{E(n)} — {E(p)}</option>' for n, p, _, _ in PLANS) + '<option>Свой запрос / не знаю — подскажите</option>'
faq = ''.join(f'<details class="qa"><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
ld = {'@context': 'https://schema.org', '@graph': [
    {'@type': 'Service', 'name': 'Восстановление сайта после сбоя хостинга', 'provider': {'@type': 'Organization', 'name': 'REBORN LAB', 'url': 'https://rebornlab.ru/'},
     'areaServed': 'RU', 'offers': [{'@type': 'Offer', 'name': n, 'price': re.sub(r'\D', '', p), 'priceCurrency': 'RUB'} for n, p, _, _ in PLANS]},
    {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}]}

src = (ROOT / 'beget' / 'vosstanovit' / 'index.html').read_text()
head = src[:src.index('<style>')]
head = re.sub(r'<title>.*?</title>', '<title>Восстановление сайта Бегет после сбоя хостинга: тарифы и сроки. Быстро, в порядке очереди</title>', head, flags=re.S)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Восстановим сайт после сбоя хостинга: лендинг из веб-архива, возврат WordPress из копии, сайт или каталог из архива, новый WordPress с админкой. Бесплатная проверка, цену называем до начала работ. Те же адреса страниц — позиции в поиске сохраняются.">', head)
head = re.sub(r'<link rel="canonical" href="[^"]*">', '' if DRAFT else '<link rel="canonical" href="https://rebornlab.ru/vosstanovlenie-sajta/">', head)
head = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Восстановление сайта после сбоя хостинга — тарифы">', head)
head = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="Бесплатная проверка, цену называем до начала работ. Те же адреса страниц и тексты — позиции в поиске сохраняются.">', head)
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
  .me { background: var(--card); border: 1px solid var(--line); border-left: 3px solid var(--acc); border-radius: var(--r); padding: 18px 22px; margin: 12px 0 16px; }
  .me p { margin: 0 0 10px; line-height: 1.6; } .me p:last-child { margin: 0; } .me-s { color: var(--muted); font-size: 14px; }
  .contacts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 14px 0 18px; }
  .ct { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border: 1px solid var(--line); border-radius: var(--r); background: var(--card); color: var(--fg); text-decoration: none; }
  .ct:hover { border-color: var(--acc); } .ct span { color: var(--acc); }
  .tform { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 22px; margin: 0 0 18px; position: relative; }
  .tgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 14px 0; } .tgrid .wide { grid-column: 1 / -1; }
  .tform label span { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  .tform input:not([type=checkbox]), .tform textarea { width: 100%; font: inherit; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); }
  .plan ul { flex: 1; }
  .plan .pick { display: block; margin-top: 18px; text-align: center; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--acc); color: var(--acc); background: rgba(198,242,78,.08); font-weight: 700; text-decoration: none; }
  .plan .pick:hover { background: var(--acc); color: #111; }
  .tform select { -webkit-appearance: none; appearance: none; text-align: left; text-align-last: left; width: 100%; font: inherit; line-height: 1.3; padding: 12px 40px 12px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c6f24e' stroke-width='2' fill='none'/%3E%3C/svg%3E") no-repeat right 14px center; color: var(--fg); cursor: pointer; }
  .tform .agree { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--muted); margin: 0 0 14px; } .tform .agree a { color: var(--acc); }
  .tform.need-agree .agree { color: #ff9b9b; } .tmsg { margin: 10px 0 0; font-size: 14px; }
  @media (max-width: 600px) { .tgrid { grid-template-columns: 1fr; } }
</style>''')
seg = src[style_end:src.index('<!--HDR:START-->')]
seg = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', seg, count=1, flags=re.S)
hdr = src[src.index('<!--HDR:START-->'):src.index('<!--HDR:END-->') + len('<!--HDR:END-->')]
hdr = re.sub(r'<div class="bbar">.*?</div></div>(?=<!--HDR:END-->)', '', hdr, flags=re.S)   # без полосы раздела /beget
banner = '<div style="background:#c6f24e;color:#111;text-align:center;padding:10px;font:600 14px sans-serif">ЧЕРНОВИК для Ника — не опубликован, скрыт от поисковиков</div>' if DRAFT else ''
main = f'''{banner}<main class="bw">
  <span class="live"><span class="dot"></span>восстановление сайтов · REBORN LAB</span>
  <h1>Восстановление сайта после сбоя Beget: тарифы и сроки</h1>
  <p class="lead">Сайт перестал работать, а доступ к хостингу потерян? Не спешите начинать всё с нуля. Восстановим сайт из резервной копии или доступных архивных материалов: вернём страницы, тексты, изображения и прежние адреса, настроим формы заявок и подключим сайт к новому серверу. Сначала бесплатно проверим, что можно восстановить, — стоимость согласуем заранее.</p>
  <div class="kpis"><div class="kpi"><div class="v">Бесплатно</div><div class="l">предварительная проверка</div></div><div class="kpi"><div class="v">4 тарифа</div><div class="l">под разный объём сайта, цену называем после проверки</div></div><div class="kpi"><div class="v">Сначала результат</div><div class="l">смотрите сайт на временном адресе до оплаты</div></div></div>
  <div class="plans">{cards}</div>
  <h2>Что ещё мы делаем — всё от А до Я</h2>
  <div class="plans">
    <div class="plan"><b class="pn">Как было — один в один</b><p class="pd" style="margin-top:8px">Возвращаем ваш родной дизайн: те же цвета, шрифты, картинки и блоки. Клиенты увидят привычный сайт.</p></div>
    <div class="plan"><b class="pn">Новый современный дизайн</b><p class="pd" style="margin-top:8px">Если старого дизайна не сохранилось или хочется обновиться — делаем современный сайт на ваших текстах: удобный на телефоне, быстрый, с теми же адресами страниц.</p></div>
    <div class="plan"><b class="pn">Переезд и домен</b><p class="pd" style="margin-top:8px">Новый хостинг или наш сервер: направляем домен, подключаем https, помогаем перенести настройки почты. По возможности переключаем без перерыва в работе.</p></div>
    <div class="plan"><b class="pn">Заявки и почта</b><p class="pd" style="margin-top:8px">Рабочие формы заявок на вашу почту, защита от спама, письма с подписью домена — чтобы не попадали в спам.</p></div>
    <div class="plan"><b class="pn">Закон и аналитика</b><p class="pd" style="margin-top:8px">Помогаем разместить политику обработки персональных данных, формы согласия и уведомление о cookie (состав документов согласуем с вами). Ваши счётчики Метрики и подтверждение Вебмастера — как были.</p></div>
    <div class="plan"><b class="pn">SEO и присмотр</b><p class="pd" style="margin-top:8px">Сохраняем адреса, заголовки и тексты, чтобы минимизировать риск потери поискового трафика. Подключаем бесплатный мониторинг: узнаете о сбое раньше клиентов.</p></div>
  </div>
  <h2>Сайт на любой CMS: WordPress, 1С-Битрикс, Joomla, MODX, OpenCart, Tilda и самописные</h2>
  <div class="plans">
    <div class="plan"><b class="pn">Есть копия — возвращаем вашу CMS</b><p class="pd" style="margin-top:8px">Если сохранились файлы и база данных, разворачиваем сайт на его родном движке — WordPress, 1С-Битрикс, Joomla, MODX, OpenCart и других — с админкой, товарами и пользователями. Для коммерческих CMS вроде 1С-Битрикс нужна ваша действующая лицензия.</p></div>
    <div class="plan"><b class="pn">Копии нет — соберём сайт в любом случае</b><p class="pd" style="margin-top:8px">Родную админку Битрикса или другой CMS без копии вернуть нельзя — её нет в веб-архиве. Но сам сайт мы соберём по архиву на любом движке: те же страницы, тексты, адреса и внешний вид.</p></div>
    <div class="plan"><b class="pn">Нужна админка или магазин — сделаем новый</b><p class="pd" style="margin-top:8px">Сделаем сайт с админкой заново и перенесём содержимое — в том числе интернет-магазин с каталогом, корзиной и заказами. Настроим всё: оплату, доставку, формы, почту. Стоимость считаем по задаче.</p></div>
  </div>
  <h2>Почему REBORN LAB</h2>
  <div class="plans">
    <div class="plan"><b class="pn">Не просто копируем сайт</b><p class="pd" style="margin-top:8px">Стараемся восстановить привычную структуру, адреса страниц и внешний вид.</p></div>
    <div class="plan"><b class="pn">Не привязываем к одному хостингу</b><p class="pd" style="margin-top:8px">Размещаем восстановленный сайт там, где удобно вам.</p></div>
    <div class="plan"><b class="pn">Сначала показываем результат</b><p class="pd" style="margin-top:8px">Вы проверяете сайт на временном адресе до переключения основного домена.</p></div>
  </div>
  <h2>Как это работает</h2>
  <ol class="steps3"><li>Вы присылаете адрес сайта — бесплатно проверяем, что сохранилось в веб-архиве и Яндекс Картинках.</li><li>Предлагаем вариант и называем цену заранее — без сюрпризов.</li><li>Собираем сайт и показываем на временном адресе — вы смотрите и принимаете.</li><li>Переключаем домен на новый сервер, подключаем https и почту для заявок.</li></ol>
  <div class="help" style="margin:30px 0 8px;font-size:15px;line-height:1.6">💚 REBORN LAB — это прежде всего проект, созданный для помощи владельцам сайтов. Наши инструменты мониторинга и проверки остаются бесплатными. Если вам потребуется техническая помощь с восстановлением сайта, мы готовы предложить свои услуги на прозрачных условиях. Но пользоваться бесплатными инструментами можно независимо от того, обращаетесь вы к нам за услугами или нет.</div>
  <h2 id="contact">Связаться со мной</h2>
  <div class="me">
    <p><b>Вы общаетесь с живым человеком, а не с компанией.</b> Меня зовут Николай, и с вами на связи буду я сам: отвечаю, разговариваю, принимаю все ваши правки и веду диалог до результата.</p>
    <p><b>Общаемся письменно — без звонков.</b> Голосовые сообщения приветствуются: слушаю и отвечаю. Так всё остаётся в переписке, и ничего не теряется.</p>
    <p><b>Скажите точно, что вам нужно, — и сделаем.</b> Если это технически возможно, реализуем без лишних согласований. Понимаю, что делаю и как вам помочь, поэтому решаю вопросы быстро.</p>
    <p class="me-s">Общаюсь по-человечески — без канцелярита, могу и смайлик поставить 🙂</p>
  </div>
  <div class="contacts">
    <a class="ct" href="https://t.me/Reborn_Lab" target="_blank" rel="noopener" data-goal="tarify_tg"><b>Telegram</b><span>@Reborn_Lab</span></a>
    <a class="ct" href="https://wa.me/6281998871268" target="_blank" rel="noopener" data-goal="tarify_wa"><b>WhatsApp</b><span>+62 819 9887-1268</span></a>
    <a class="ct" href="mailto:info@rebornlab.ru?subject=%D0%92%D0%BE%D1%81%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%81%D0%B0%D0%B9%D1%82%D0%B0" data-goal="tarify_mail"><b>Почта</b><span>info@rebornlab.ru</span></a>
  </div>
  <form class="tform" id="tform" novalidate>
    <b class="pn">Короткая заявка — напишу вам сам</b>
    <p class="me-s" style="margin:6px 0 0">Удобнее всего общаться письменно — в WhatsApp или Telegram. Звонков нет, голосовые — пожалуйста.</p>
    <div class="tgrid">
      <label class="wide"><span>Что нужно</span><select name="plan">{plan_opts}</select></label>
      <label class="wide"><span>Адрес сайта *</span><input name="site" placeholder="мой-сайт.ru" required></label>
      <label><span>Где удобнее общаться</span><select name="via"><option>WhatsApp</option><option>Telegram</option><option>Другое</option></select></label>
      <label><span>Почта, Telegram или WhatsApp *</span><input name="contact" placeholder="name@mail.ru, @ник или +7…" required></label>
      <label class="wide"><span>Комментарий</span><textarea name="text" rows="3" placeholder="Что случилось с сайтом, есть ли копия"></textarea></label>
    </div>
    <input name="company" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
    <label class="agree"><input type="checkbox" name="agree"> <span>Согласен на обработку персональных данных по <a href="/consent/" target="_blank">согласию</a> и <a href="/privacy/" target="_blank">политике конфиденциальности</a></span></label>
    <button class="btn btn-acc" type="submit">Отправить заявку</button>
    <p class="tmsg" id="tmsg"></p>
  </form>
  <p class="sub"><a href="/beget/vosstanovit/" style="color:var(--acc)">Проверить сайт бесплатно →</a></p>
  <h2>Частые вопросы</h2>
  {faq}
  <p class="sub" style="margin-top:24px">Бесплатно и без обязательств: <a href="/beget/vosstanovit/" style="color:var(--acc)">проверка «можно ли восстановить сайт»</a>, <a href="/beget/server/" style="color:var(--acc)">проверка сервера по IP</a> и бот <a href="https://t.me/rebornlab_bot" style="color:var(--acc)">@rebornlab_bot</a> — напишет, когда сайт снова откроется.</p>
</main>
'''
after = src[src.index('</main>') + len('</main>'):]
after = after[:after.index('<script>\n(function () {')] + '''<script>
(function () {
  var f = document.getElementById('tform'), msg = document.getElementById('tmsg'); if (!f) return;
  document.querySelectorAll('.pick').forEach(function (b) { b.addEventListener('click', function () { var sel = f.plan; for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === b.dataset.plan) sel.selectedIndex = i; setTimeout(function () { f.site.focus(); }, 400); }); });
  var PH = {'WhatsApp': '+7 999 123-45-67', 'Telegram': '@ваш_ник', 'Другое': 'как с вами связаться'}; f.via.addEventListener('change', function () { f.contact.placeholder = PH[f.via.value]; }); f.contact.placeholder = PH[f.via.value];
  var T0 = Date.now(), HUMAN = false; ['mousemove', 'touchstart', 'keydown', 'scroll'].forEach(function (ev) { addEventListener(ev, function () { HUMAN = true; }, {once: true, passive: true}); });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var site = f.site.value.trim(), contact = f.contact.value.trim(), ag = f.agree;
    if (!site || !contact) { msg.textContent = 'Укажите адрес сайта и как с вами связаться.'; return; }
    if (!ag.checked) { f.classList.add('need-agree'); msg.textContent = 'Отметьте согласие на обработку данных.'; return; }
    f.classList.remove('need-agree');
    var btn = f.querySelector('button'); btn.disabled = true; msg.textContent = 'Отправляем…';
    fetch('/api/lead', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({topics: ['Восстановление сайта', f.plan.value], text: 'Тариф: ' + f.plan.value + '\\nСайт: ' + site + (f.text.value.trim() ? '\\n' + f.text.value.trim() : ''), contact: f.via.value + ': ' + contact, page: location.pathname, agree: true, hp: f.company.value || '', k: T0.toString(36), t: Date.now() - T0, h: HUMAN ? 1 : 0})})
      .then(function (r) { if (!r.ok) throw 0; f.innerHTML = '<p style="font-size:18px;margin:0">✓ Заявка отправлена — напишем вам в ближайшее время.</p>'; try { ym(window.RL_METRIKA, 'reachGoal', 'tarify_lead'); } catch (x) {} })
      .catch(function () { btn.disabled = false; msg.innerHTML = 'Не получилось отправить. Напишите нам в <a href="https://t.me/Reborn_Lab" style="color:var(--acc)">Telegram</a>, <a href="https://wa.me/6281998871268" style="color:var(--acc)">WhatsApp</a> или на <a href="mailto:info@rebornlab.ru" style="color:var(--acc)">info@rebornlab.ru</a>.'; });
  });
})();
</script>
</body>
</html>
'''
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(head + style + seg + hdr + '\n' + main + after)
print('готово:', OUT, '| H1:', (head + main).count('<h1'))
