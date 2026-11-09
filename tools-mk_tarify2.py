#!/usr/bin/env python3
"""Новая страница «Восстановление сайта»: одна форма → отчёт о сайте → вариант → примерная цена → бесплатное демо (идея Ника, 09.11.2026).
ЧЕРНОВИК: demo/tarify-new/index.html (noindex, /demo/ закрыт в robots, нет в меню и sitemap). Заявки в черновике НЕ отправляются.
Проверка — настоящая (api.rebornlab.ru/restore), пока считает только до 100 страниц. Запуск: python3 tools-mk_tarify2.py"""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / 'demo' / 'tarify-new' / 'index.html'
src = (ROOT / 'beget' / 'vosstanovit' / 'index.html').read_text()

head = src[:src.index('<style>')]
head = re.sub(r'<title>.*?</title>', '<title>Восстановление сайта: проверка и примерная цена — REBORN LAB</title>', head, flags=re.S)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Введите адрес сайта: покажем, что сохранилось, какие есть варианты и сколько это примерно стоит.">', head)
head = re.sub(r'<link rel="canonical" href="[^"]*">', '', head)
head = head.replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">', 1)
style_end = src.index('</style>') + len('</style>')
seg = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', '', src[style_end:src.index('<!--HDR:START-->')], flags=re.S)
hdr = src[src.index('<!--HDR:START-->'):src.index('<!--HDR:END-->') + len('<!--HDR:END-->')]
hdr = re.sub(r'<div class="bbar">.*?</div></div>(?=<!--HDR:END-->)', '', hdr, flags=re.S)
footer = src[src.index('<footer'):src.index('</footer>') + len('</footer>')]

CSS = '''
  .tn-banner { background: #c6f24e; color: #111; text-align: center; padding: 10px 16px; font: 600 14px sans-serif; }
  .tn-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 24px; margin: 18px 0; }
  .tn-step { font: 13px var(--mono); color: var(--acc); margin: 0 0 8px; }
  .tn-card h2 { margin: 0 0 14px; font-size: 24px; }
  .tn-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .tn-row input { flex: 1 1 260px; min-width: 0; font: 18px var(--mono); padding: 15px 16px; border-radius: 12px; border: 1px solid var(--line); background: transparent; color: var(--fg); }
  .tn-ex { margin: 12px 0 0; font-size: 14px; color: var(--muted); }
  .tn-ex button { font: inherit; color: var(--acc); background: none; border: 1px dashed var(--line); border-radius: 999px; padding: 4px 12px; margin: 4px 6px 0 0; cursor: pointer; }
  .tn-kp { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .tn-kp div { border: 1px solid var(--line); border-radius: 12px; padding: 14px; } .tn-kp b { display: block; font-size: 26px; line-height: 1.15; overflow-wrap: anywhere; } .tn-kp span { color: var(--muted); font-size: 13px; }
  .tn-note { margin: 14px 0 0; font-size: 15px; line-height: 1.55; color: var(--muted); } .tn-note b { color: var(--fg); }
  .tn-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
  .tn-opt { display: block; border: 1px solid var(--line); border-radius: 14px; padding: 18px; cursor: pointer; }
  .tn-opt:has(input:checked) { border-color: var(--acc); box-shadow: inset 0 0 0 1px var(--acc); }
  .tn-opt input { accent-color: var(--acc); margin-right: 8px; } .tn-opt b { font-size: 18px; } .tn-opt p { margin: 8px 0 0; font-size: 14.5px; line-height: 1.5; color: var(--muted); }
  .tn-sub { margin-top: 16px; display: none; } .tn-sub.on { display: block; }
  .tn-chk { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 15.5px; } .tn-chk label { display: inline-flex; gap: 8px; align-items: center; cursor: pointer; } .tn-chk input { accent-color: var(--acc); width: 18px; height: 18px; }
  .tn-price { font-size: clamp(34px, 7vw, 52px); font-weight: 700; letter-spacing: -.02em; color: var(--acc); line-height: 1.1; margin: 4px 0 10px; }
  .tn-btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; } .tn-btns > * { flex: 1 1 240px; text-align: center; justify-content: center; }
  .tn-ghost { display: inline-flex; align-items: center; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--line); color: var(--fg); text-decoration: none; }
  .tn-msg { margin: 12px 0 0; color: var(--acc); font-size: 15px; min-height: 1.4em; }
  .tn-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px 22px; padding: 0; margin: 0; list-style: none; } .tn-grid li { line-height: 1.5; padding-left: 24px; position: relative; } .tn-grid li::before { content: "✓"; position: absolute; left: 0; color: var(--acc); }
  .tn-tbl { width: 100%; border-collapse: collapse; font-size: 15px; } .tn-tbl th, .tn-tbl td { border-bottom: 1px solid var(--line); padding: 12px 10px 12px 0; text-align: left; vertical-align: top; line-height: 1.45; } .tn-tbl th { color: var(--muted); font-weight: 500; } .tn-w { overflow-x: auto; }
  .tn-flow { counter-reset: s; list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; } .tn-flow li { counter-increment: s; line-height: 1.5; } .tn-flow li::before { content: counter(s); display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: var(--acc); color: #111; font-weight: 700; margin-bottom: 10px; } .tn-flow b { display: block; }
  #tnReport, #tnNext { display: none; } #tnReport.on, #tnNext.on { display: block; }
  @media (max-width: 600px) { .tn-card { padding: 18px; } .tn-tbl { font-size: 14px; } }
</style>'''
style = src[src.index('<style>'):style_end].replace('</style>', CSS)

MAIN = '''<div class="tn-banner">ЧЕРНОВИК для Николая: страница не опубликована, скрыта от поисковиков, заявки отсюда не отправляются</div>
<main class="bw">
  <span class="live"><span class="dot"></span>восстановление сайтов · REBORN LAB</span>
  <h1>Узнайте, можно ли вернуть ваш сайт и сколько это стоит</h1>
  <p class="lead">Введите адрес. Покажем, что сохранилось, какие есть варианты и примерную цену. Проверка бесплатная и ни к чему не обязывает.</p>

  <section class="tn-card">
    <p class="tn-step">Шаг 1 · ваш сайт</p>
    <form class="tn-row" id="tnForm"><input id="tnSite" placeholder="мой-сайт.ru" autocomplete="url" inputmode="url" aria-label="Адрес сайта" required><button class="btn btn-acc" type="submit">Проверить сайт</button></form>
    <p class="tn-ex">Или посмотрите на примере:
      <button type="button" data-ex="small">лендинг, 12 страниц</button><button type="button" data-ex="mid">сайт с каталогом, 310</button><button type="button" data-ex="big">магазин, 4 800</button></p>
  </section>

  <section class="tn-card" id="tnReport" aria-live="polite"><p class="tn-step">Отчёт</p><h2 id="tnRepTitle">Что сохранилось</h2><div class="tn-kp" id="tnKp"></div><p class="tn-note" id="tnRepNote"></p></section>

  <div id="tnNext">
    <section class="tn-card">
      <p class="tn-step">Шаг 2 · каким должен стать сайт</p>
      <div class="tn-opts">
        <label class="tn-opt"><input type="radio" name="v" value="asis" checked><b>Как было</b><p>Ваш дизайн, тексты и адреса страниц. Заявки, https и телефон работают. Админки нет, правки вносим мы.</p></label>
        <label class="tn-opt"><input type="radio" name="v" value="design"><b>Обновлённый дизайн</b><p>То же содержимое и адреса, но современный вид. Особенно если старый дизайн устарел или сохранился плохо.</p></label>
        <label class="tn-opt"><input type="radio" name="v" value="cms"><b>С админкой</b><p>Собираем сайт на CMS и переносим содержимое, чтобы вы правили его сами.</p></label>
      </div>
      <div class="tn-sub" id="tnCms"><div class="tn-chk" role="group" aria-label="Система управления">
        <label><input type="radio" name="c" value="WordPress" checked>WordPress</label><label><input type="radio" name="c" value="MODX">MODX</label><label><input type="radio" name="c" value="1С-Битрикс">1С-Битрикс</label><label><input type="checkbox" id="tnShop">Нужен магазин: корзина и заказы</label></div></div>
    </section>

    <section class="tn-card">
      <p class="tn-step">Шаг 3 · что у вас есть</p>
      <div class="tn-chk">
        <label><input type="checkbox" data-m="copy">Копия сайта</label><label><input type="checkbox" data-m="db">База данных</label><label><input type="checkbox" data-m="photo">Фото</label><label><input type="checkbox" data-m="price">Прайс или выгрузка товаров</label><label><input type="checkbox" data-m="lic">Лицензия CMS</label></div>
      <p class="tn-note">Если ничего нет, это нормально: соберём из веб-архива и Яндекс Картинок. Всё, что найдётся, сделает сайт полнее.</p>
    </section>

    <section class="tn-card">
      <p class="tn-step">Примерная цена</p>
      <div class="tn-price" id="tnPrice">—</div>
      <p class="tn-note" id="tnPriceNote"></p>
      <div class="tn-btns"><button class="btn btn-acc" type="button" id="tnDemo">Получить бесплатное демо, 10 страниц</button><a class="tn-ghost" href="https://t.me/Reborn_Lab" target="_blank" rel="noopener">Написать напрямую: @Reborn_Lab</a></div>
      <p class="tn-msg" id="tnMsg"></p>
    </section>
  </div>

  <h2>Что будет в любом варианте</h2>
  <ul class="tn-grid"><li>Те же адреса страниц: это важно для поиска</li><li>Формы, заявки приходят вам на почту</li><li>Защищённое соединение https</li><li>Нормальный вид на телефоне</li><li>Ваши счётчики Метрики, если они сохранились</li><li>Размещение на нашем сервере в России</li></ul>

  <h2>Нужна ли вам CMS</h2>
  <div class="tn-w"><table class="tn-tbl"><thead><tr><th></th><th>Без CMS</th><th>С CMS (WordPress, MODX, Битрикс)</th></tr></thead><tbody>
    <tr><td><b>Что это</b></td><td>Готовый сайт из страниц, как он выглядел</td><td>Сайт с панелью управления</td></tr>
    <tr><td><b>Кто правит</b></td><td>Мы, по вашей просьбе</td><td>Вы сами</td></tr>
    <tr><td><b>Скорость запуска</b></td><td>Быстрее</td><td>Дольше: содержимое переносится вручную и скриптами</td></tr>
    <tr><td><b>Кому подходит</b></td><td>Сайт нужно вернуть, а менять его редко</td><td>Часто меняются цены, товары, статьи</td></tr>
    <tr><td><b>Стоимость</b></td><td>Ниже</td><td>Выше, Битрикс требует вашу лицензию</td></tr>
  </tbody></table></div>
  <p class="tn-note">Старую админку, заказы и пользователей можно вернуть только из вашей копии с базой данных. Без неё собираем сайт заново и переносим содержимое из архива.</p>

  <h2>Как работаем</h2>
  <ol class="tn-flow"><li><b>Проверка</b>Смотрим, что сохранилось, и называем точную цену.</li><li><b>Бесплатное демо</b>10 страниц без CMS на временном адресе. Смотрите, подходит ли.</li><li><b>Аванс 50%</b>Только если демо понравилось и вы готовы продолжать.</li><li><b>Сборка и запуск</b>Доделываем, показываем, подключаем домен. Затем остаток оплаты.</li></ol>

  <h2>Частые вопросы</h2>
  <details class="qa"><summary>Цена на странице окончательная?</summary><p>Нет, это примерная оценка по объёму. Точную цену называем после просмотра сайта, до начала работы.</p></details>
  <details class="qa"><summary>Всё ли вернётся?</summary><p>Вернём то, что сохранилось. Часть картинок и цен может отсутствовать или устареть. В отчёте и демо это будет видно заранее.</p></details>
  <details class="qa"><summary>Сохранятся ли позиции в поиске?</summary><p>Адреса и тексты сохраняем, это снижает риск потерь. Гарантировать позиции не может никто.</p></details>
  <details class="qa"><summary>Что с почтой на домене?</summary><p>Смотрим, где она работает. Если почта рабочая, не трогаем её. Если упала вместе с хостингом, поможем настроить заново.</p></details>
</main>'''

JS = r'''<script>
(function () {
  var $ = function (i) { return document.getElementById(i); }, S = { pages: null, over: false, images: null, name: '', ex: false };
  var EX = {
    small: { name: 'Пример: лендинг', pages: 12, images: 20, last: 'октябрь 2026', cms: 'нет', note: '' },
    mid: { name: 'Пример: сайт с каталогом', pages: 310, images: 295, last: 'июль 2026', cms: '1С-Битрикс', note: '' },
    big: { name: 'Пример: интернет-магазин', pages: 4800, images: 1550, last: 'август 2026', cms: '1С-Битрикс', note: 'Часть цен в карточках может быть устаревшей: страницы сохранялись в разное время.' }
  };
  var BANDS = [20, 300, 1500, Infinity];
  var P = { asis: [[1500, 3000], [4000, 6000], [8000, 10000], [10000, 0]], design: [[3000, 5000], [6000, 9000], [10000, 14000], [14000, 0]], cms: [[7000, 9000], [10000, 15000], [15000, 25000], [20000, 0]] };
  function rub(n) { return String(n).replace(/\B(?=(\d{3})+$)/g, ' '); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function val(n) { var e = document.querySelector('input[name=' + n + ']:checked'); return e ? e.value : ''; }
  function kp(v, l) { return '<div><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }
  function price() {
    if (S.pages === null) return;
    var i = 0; while (S.pages > BANDS[i]) i++;
    var v = val('v'), r = P[v][i], from = S.over || !r[1], cms = v === 'cms', shop = cms && $('tnShop').checked;
    $('tnCms').classList.toggle('on', cms);
    $('tnPrice').textContent = (from || shop ? 'от ' + rub(r[0]) : rub(r[0]) + ' – ' + rub(r[1])) + ' ₽';
    var n = ['Точную цену назовёт Николай после просмотра сайта.'], m = function (k) { return document.querySelector('[data-m=' + k + ']').checked; };
    if (S.over) n.push('Страниц больше 100, поэтому показана нижняя граница.');
    if (shop) n.push('Магазин считаем отдельно: корзина, заказы, доставка.');
    if (cms && val('c') === '1С-Битрикс') n.push(m('lic') ? 'Лицензия у вас есть, это подходит.' : 'Для Битрикса нужна ваша лицензия.');
    if (m('copy') && m('db')) n.push('С копией и базой можно вернуть родную админку: часто это быстрее и дешевле.');
    else if (m('copy')) n.push('Копия ускорит работу. Для родной админки нужна ещё база данных.');
    if (S.images !== null && S.pages > 50 && S.images < S.pages * .2 && !m('photo')) n.push('Картинок сохранилось мало: ваши фото очень помогут.');
    $('tnPriceNote').textContent = n.join(' ');
  }
  function show(d) {
    S = { pages: d.pages, over: !!d.over, images: d.images, name: d.name };
    $('tnRepTitle').textContent = d.name;
    $('tnKp').innerHTML = kp(d.over ? '100+' : rub(d.pages), 'страниц в веб-архиве') + kp(d.images === null ? '—' : (d.imagesPlus ? d.images + '+' : rub(d.images)), d.imgLabel || 'картинок') + kp(d.last || '—', 'последний снимок') + kp(d.cms || '—', d.cmsLabel || 'движок сайта');
    $('tnRepNote').innerHTML = d.note || '';
    $('tnReport').classList.add('on'); $('tnNext').classList.add('on'); price();
    $('tnReport').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function month(t) { if (!t) return ''; t = String(t); return t.slice(6, 8) + '.' + t.slice(4, 6) + '.' + t.slice(0, 4); }
  function ask(d, tries) {
    return fetch('https://api.rebornlab.ru/restore?d=' + encodeURIComponent(d), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.queued) { if (tries > 60) throw new Error('долго'); $('tnRepNote').textContent = j.archive_down ? 'Веб-архив сейчас недоступен, ждём его…' : (j.running ? 'Проверяем, веб-архив отвечает до минуты…' : 'Ваша проверка в очереди…'); return new Promise(function (ok) { setTimeout(ok, 4000); }).then(function () { return ask(d, tries + 1); }); }
      return j;
    });
  }
  $('tnForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var d = $('tnSite').value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!d || d.indexOf('.') < 0) { $('tnSite').focus(); return; }
    $('tnRepTitle').textContent = d; $('tnKp').innerHTML = ''; $('tnRepNote').textContent = 'Проверяем…'; $('tnNext').classList.remove('on'); $('tnReport').classList.add('on');
    ask(d, 0).then(function (r) {
      if (r.error) { $('tnRepNote').textContent = 'Пока не получилось: ' + r.error; return; }
      var note = r.live ? '<b>Сайт сейчас открывается.</b> Если он работает как надо, восстанавливать его не нужно.' : '<b>Сайт сейчас не открывается.</b>';
      if (r.registrar) note += ' Домен: ' + esc(r.registrar) + '.';
      if (r.pages > 100) note += ' <i>В черновике проверка считает только до 100 страниц; в рабочей версии будет полный подсчёт, разделы и движок сайта.</i>';
      show({ name: d, pages: Math.max(r.pages || 0, r.pages > 100 ? 101 : 0), over: r.pages > 100, images: r.yandex_images == null ? null : r.yandex_images, imagesPlus: r.yandex_images >= 30, imgLabel: 'картинок в Яндексе', last: month(r.last), cms: r.host || '—', cmsLabel: 'хостинг', note: note });
    }).catch(function () { $('tnRepNote').textContent = 'Проверка сейчас не отвечает. Попробуйте позже или напишите нам.'; });
  });
  document.querySelectorAll('[data-ex]').forEach(function (b) { b.addEventListener('click', function () { show(EX[b.dataset.ex]); }); });
  document.querySelectorAll('#tnNext input').forEach(function (i) { i.addEventListener('change', price); });
  $('tnDemo').addEventListener('click', function () { $('tnMsg').textContent = 'Это черновик: заявка не отправляется. В рабочей версии здесь будут контакт, согласие и отправка вместе с отчётом.'; });
})();
</script>
</body>
</html>
'''
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(head + style + seg + hdr + '\n' + MAIN + '\n' + footer + '\n' + JS)
print('черновик:', OUT)
