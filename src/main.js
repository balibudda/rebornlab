/* 08.11: метки антиспама для заявок (время на странице, было ли движение) */
var RL_T0 = Date.now(), RL_HUMAN = false; ['mousemove', 'touchstart', 'keydown', 'scroll'].forEach(function (ev) { window.addEventListener(ev, function () { RL_HUMAN = true; }, {once: true, passive: true}); });
// REBORN LAB — small, dependency-free interactions.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- hero: «idea → system → product» ----------
  // Points drift in from the left as loose ideas, link up into a network in the middle
  // and lock into an ordered grid (a product) on the right. One canvas, ~80 points.
  var cv = document.getElementById('lab');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), pts = [], run = true, t0 = 0;
    var N = window.innerWidth < 760 ? 46 : 84;
    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed(p, start) {
      p.x = start ? Math.random() * W : -20 - Math.random() * W * 0.3;
      p.y = H * (0.12 + Math.random() * 0.76);
      p.vy = (Math.random() - 0.5) * 0.25;
      p.sp = 0.25 + Math.random() * 0.45;
      var cols = 6, rows = 5, i = Math.floor(Math.random() * cols * rows);
      p.gx = W * 0.66 + (i % cols) * (W * 0.05);           // grid target on the right
      p.gy = H * 0.26 + Math.floor(i / cols) * (H * 0.11);
    }
    function init() { size(); pts = []; for (var i = 0; i < N; i++) { var p = {}; seed(p, true); pts.push(p); } }
    function step(ts) {
      if (!run) return;
      var dt = Math.min(32, ts - (t0 || ts)); t0 = ts;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], k = Math.max(0, (p.x - W * 0.5) / (W * 0.25)); // 0 = free, 1 = locked to grid
        k = Math.min(1, k);
        p.x += p.sp * dt * 0.06 * (1 - k * 0.85);
        p.y += p.vy * dt * 0.06 * (1 - k);
        if (k > 0) { p.x += (p.gx - p.x) * 0.02 * k; p.y += (p.gy - p.y) * 0.03 * k; }
        if (p.x > W + 30 || (k >= 1 && Math.random() < 0.0015)) seed(p, false);
        p.k = k;
      }
      // links: only in the «system» band, fade out in the ordered product zone
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var A = pts[a], B = pts[b], dx = A.x - B.x, dy = A.y - B.y, d = dx * dx + dy * dy, lim = 120 * 120;
          if (d < lim) {
            var mid = (A.x + B.x) / 2 / W, band = Math.max(0, 1 - Math.abs(mid - 0.52) / 0.32);
            var al = (1 - d / lim) * 0.35 * band;
            if (al > 0.01) { ctx.strokeStyle = 'rgba(237,235,230,' + al + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
          }
        }
      }
      for (var j = 0; j < pts.length; j++) {
        var q = pts[j], acc = q.k > 0.6;
        ctx.fillStyle = acc ? 'rgba(198,242,78,' + (0.35 + 0.55 * q.k) + ')' : 'rgba(237,235,230,0.55)';
        if (acc) { ctx.fillRect(q.x - 2.5, q.y - 2.5, 5, 5); } else { ctx.beginPath(); ctx.arc(q.x, q.y, 1.8, 0, 6.283); ctx.fill(); }
      }
      requestAnimationFrame(step);
    }
    init();
    window.addEventListener('resize', function () { init(); });
    if (reduce) { for (var s = 0; s < 400; s++) { run = true; } step(16); run = false; }
    else {
      requestAnimationFrame(step);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { var vis = e[0].isIntersecting; if (vis && !run) { run = true; t0 = 0; requestAnimationFrame(step); } run = vis; }).observe(cv);
      }
    }
  }

  // ---------- reveal on scroll ----------
  var els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  } else { els.forEach(function (e) { e.classList.add('in'); }); }

  // ---------- mobile menu ----------
  var hdr = document.querySelector('.hdr'), burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () { var o = hdr.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });

  // ---------- product system diagram ----------
  var info = document.getElementById('node-info');
  document.querySelectorAll('.node').forEach(function (n) {
    n.addEventListener('click', function () {
      document.querySelectorAll('.node').forEach(function (x) { x.classList.toggle('on', x === n); });
      if (info) info.textContent = n.getAttribute('data-info');
    });
  });

  // ---------- task form: chips + send ----------
  document.querySelectorAll('[data-chips]').forEach(function (row) {
    row.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      b.classList.toggle('on');
    });
  });
  document.querySelectorAll('form[data-lead]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var topics = [].map.call(f.querySelectorAll('.chip.on'), function (c) { return c.textContent; });
      var text = (f.querySelector('textarea') || {}).value || '';
      var contact = (f.querySelector('input[name=contact]') || {}).value || '';
      var ok = f.querySelector('.ok-msg'), btn = f.querySelector('button[type=submit]');
      if (text.trim().length < 5 && !topics.length) { f.querySelector('textarea').focus(); return; }
      if (contact.trim().length < 3) { var ci = f.querySelector('input[name=contact]'); ci && ci.focus(); return; }
      var ag = f.querySelector('input[name=agree]');
      if (ag && !ag.checked) { f.classList.add('need-agree'); ag.focus(); return; }
      f.classList.remove('need-agree');
      btn.disabled = true; btn.textContent = 'Отправляю…';
      var payload = { topics: topics, text: text.trim(), contact: contact.trim(), page: location.pathname, agree: true, hp: (f.querySelector('input[name=company]') || {}).value || '', k: RL_T0.toString(36), t: Date.now() - RL_T0, h: RL_HUMAN ? 1 : 0 };   // 08.11: метки антиспама
      fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw 0; ok.style.display = 'block'; f.reset(); f.querySelectorAll('.chip.on').forEach(function (c) { c.classList.remove('on'); }); if (window.ym && window.RL_METRIKA) ym(window.RL_METRIKA, 'reachGoal', 'lead'); })
        .catch(function () { window.open('https://t.me/Reborn_Lab', '_blank'); })
        .then(function () { btn.disabled = false; btn.textContent = btn.getAttribute('data-label'); });
    });
  });
  document.querySelectorAll('input[name=agree]').forEach(function (a) { a.addEventListener('change', function () { if (a.checked) a.closest('form').classList.remove('need-agree'); }); });

  // ---------- cookie consent: Metrika loads only after «Согласен» ----------
  var ck = document.getElementById('cookie'), agreed = false;
  try { agreed = localStorage.getItem('rl_cookie_ok') === '1'; } catch (e) {}
  if (agreed) { window.RL_LOAD_METRIKA && window.RL_LOAD_METRIKA(); }
  else if (ck) {
    ck.hidden = false;
    // 12.11: плашка не должна закрывать кнопки форм — под неё отступ, а при заполнении формы она уезжает наверх и становится маленькой
    var ckPad = function () { document.body.style.paddingBottom = ck.hidden ? '' : (ck.offsetHeight + 32) + 'px'; };
    ckPad(); addEventListener('resize', ckPad);
    document.addEventListener('focusin', function (e) { if (!ck.hidden && e.target.closest && e.target.closest('form') && !e.target.closest('.cookie')) { ck.classList.add('mini'); ckPad(); } });
    document.getElementById('cookie-ok').addEventListener('click', function () {
      try { localStorage.setItem('rl_cookie_ok', '1'); } catch (e) {}
      ck.hidden = true; ckPad(); window.RL_LOAD_METRIKA && window.RL_LOAD_METRIKA();
    });
  }

  document.querySelectorAll('[data-goal]').forEach(function (a) {
    a.addEventListener('click', function () { if (window.ym && window.RL_METRIKA) ym(window.RL_METRIKA, 'reachGoal', a.getAttribute('data-goal')); });
  });
})();

// 09.11: живые цифры в блоке «Ситуация с Бегет» на главной
(function () {
  var p = document.getElementById('bnow-p'); if (!p || !window.fetch) return;
  fetch('https://api.rebornlab.ru/beget.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.sites_total || d.sites_up == null || !d.ips_total_all) return;
    p.innerHTML = 'По нашим замерам отвечает <b>' + d.hosting_up_all + ' из ' + d.ips_total_all + '</b> адресов серверов, открывается <b>' + d.sites_up + ' из ' + d.sites_total + '</b> сайтов выборки.';
  }).catch(function () {});
})();

// 09.11: поиск по всему сайту (кнопка-лупа в шапке, индекс /search.json грузится при первом открытии)
(function () {
  var btn = document.querySelector('[data-search]'); if (!btn) return;
  var box = document.createElement('div'); box.className = 'srch'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Поиск по сайту');
  box.innerHTML = '<div class="srch-box"><div class="srch-top"><input type="search" placeholder="Что ищете: почта, сервер, 502, копия…" aria-label="Поиск по сайту" autocomplete="off"><button class="srch-x" type="button" aria-label="Закрыть">×</button></div><div class="srch-r"></div></div>';
  document.body.appendChild(box);
  var input = box.querySelector('input'), res = box.querySelector('.srch-r'), data = null, sel = -1;
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[?!%,;:«»"()]/g, ' ').replace(/\s+/g, ' ').trim().replace(/beget|багет|бегете|бегета|бегету|бегетом/g, 'бегет'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function row(x) { return '<a href="' + esc(x.u) + '"><i>' + esc(x.k) + '</i><b>' + esc(x.t) + '</b>' + (x.d ? '<span>' + esc(x.d) + '</span>' : '') + '</a>'; }
  function hint() { res.innerHTML = '<div class="srch-e">Введите слово, адрес сайта или IP сервера.</div>'; }
  function run() {
    sel = -1;
    var raw = input.value.trim(), q = norm(raw); if (!q) return hint();
    var out = '', v = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v) || /^[a-zа-яё0-9-]+(\.[a-zа-яё0-9-]+)+$/i.test(v)) out = row({ u: '/beget/server/#' + encodeURIComponent(v), k: 'Проверка', t: 'Проверить сервер: ' + v, d: 'Покажем, включён ли сервер' });
    // 10.11: запросы по смыслу — сразу нужная страница первой строкой
    var I = [[/мониторинг|статус|ситуаци|какие сайты работа|что с бегет|онлайн|восстановлен.*хостинг|очеред/, { u: '/beget/', k: 'Бегет', t: 'Статус и мониторинг серверов Бегет', d: 'Что работает прямо сейчас: серверы, сайты, VPS' }],
             [/сервер|айпи|\bip\b|ping|пинг|доступност|проверить|проверка|работа(ет)? ли/, { u: '/beget/server/', k: 'Проверка', t: 'Мониторинг серверов Бегет по IP', d: 'Включён ли ваш сервер, имя сервера, соседи по сети' }],
             [/восстанов|архив|копи|вернуть сайт|пропал/, { u: '/beget/vosstanovit/', k: 'Проверка', t: 'Можно ли восстановить сайт без копии', d: 'Проверим веб-архив и Яндекс Картинки' }],
             [/бот|уведом|отслежива|сообщит/, { u: 'https://t.me/rebornlab_bot', k: 'Бот', t: 'Бот @rebornlab_bot — напишет, когда сайт заработает', d: 'Бесплатно, проверка каждые 10 минут' }]];
    for (var ii = 0; ii < I.length; ii++) if (I[ii][0].test(q)) { out += row(I[ii][1]); break; }
    if (!data) { res.innerHTML = out || '<div class="srch-e">Загружаем…</div>'; return; }
    // 10.11: служебные слова не нужны, окончания срезаем, совпадение не всех слов — тоже результат (ранжируем по числу совпадений)
    var STOP = ' что как где когда почему зачем делать сделать мой моя мое мои ваш наш это этот эта есть ли или и в на с со к по о об от до у за из для не нет же бы то так уже ещё еще можно нужно надо мне меня я вы мы он она они ';
    function stem(x) { return x.length > 4 ? x.replace(/(ами|ями|ого|его|ому|ему|ыми|ими|ах|ях|ов|ев|ей|ий|ый|ой|ая|яя|ое|ее|ые|ие|ую|юю|ом|ем|ам|ям|а|я|о|е|ы|и|у|ю|ь)$/, '') : x; }
    var w = q.replace(/[^a-zа-я0-9.\s-]/g, ' ').split(/\s+/).filter(function (x) { return x && STOP.indexOf(' ' + x + ' ') < 0; }).map(stem);
    var list = w.length ? data.map(function (x) {
      var t = norm(x.t), d = norm(x.d), s = 0, hit = 0;
      for (var i = 0; i < w.length; i++) { if (t.indexOf(w[i]) >= 0) { s += 3; hit++; } else if (d.indexOf(w[i]) >= 0) { s += 1; hit++; } }
      if (!hit) return null;
      if (t.indexOf(q) === 0) s += 3;
      return { x: x, s: s + hit * 10 };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 8) : [];
    out += list.map(function (r) { return row(r.x); }).join('');
    if (!out) {   // ничего не совпало — показываем самое нужное, а не тупик
      out = '<div class="srch-e">Точного ответа не нашли. Возможно, поможет это:</div>' + [
        { u: '/beget/voprosy/', k: 'Ответы', t: 'Сайт не работает: вопросы и ответы', d: '61 вопрос — что делать с сайтом, почтой, доменом' },
        { u: '/beget/server/', k: 'Проверка', t: 'Мониторинг серверов Бегет по IP', d: 'Включён ли ваш сервер' },
        { u: '/beget/vosstanovit/', k: 'Проверка', t: 'Можно ли восстановить сайт без копии', d: 'Проверим веб-архив' },
        { u: '/journal/pochemu-sajt-ne-otkryvaetsya-v-rossii/', k: 'Журнал', t: 'Почему сайт не открывается в России или с VPN', d: 'Частые причины и что проверить самому' }
      ].map(row).join('') + '<div class="srch-e">Не нашли ответ — напишите <a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener">@Reborn_Lab</a>.</div>';
    }
    res.innerHTML = out;
    logQ(raw, list.length);
  }
  // 10.11 Ник: история поиска — анонимно (без IP и адресов сайтов), чтобы видеть, что ищут, и улучшать ответы. Счёт: ssh vpn-id rl-search-stats
  var lastQ = '', qTimer = null;
  function logQ(raw, n) {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      var v = String(raw || '').replace(/\S+@\S+/g, '[почта]').replace(/\+?\d[\d\s()-]{6,}\d/g, '[номер]').replace(/^https?:\/\//i, '').trim().slice(0, 120);
      if (v.length < 3 || v === lastQ) return; lastQ = v;
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v) || /^[a-zа-яё0-9-]+(\.[a-zа-яё0-9-]+)+$/i.test(v)) v = '[адрес сайта или IP]';
      try { (new Image()).src = 'https://api.rebornlab.ru/q?ip=-&k=' + (n ? 's' : 'n') + '&v=' + encodeURIComponent(v) + '&p=' + encodeURIComponent(location.pathname); } catch (e) {}
    }, 1500);
  }
  function open(q) { if (typeof q === 'string') input.value = q; box.classList.add('on'); document.body.classList.add('srch-lock'); run(); setTimeout(function () { input.focus(); }, 30);
    if (!data) fetch('/search.json').then(function (r) { return r.json(); }).then(function (d) { data = d; run(); }).catch(function () { data = []; }); }
  function close() { box.classList.remove('on'); document.body.classList.remove('srch-lock'); btn.focus(); }
  btn.addEventListener('click', function () { open(); });
  window.RL_SEARCH = open;
  box.querySelector('.srch-x').addEventListener('click', close);
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  input.addEventListener('input', run);
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('on')) { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); open(); } return; }
    if (e.key === 'Escape') return close();
    var a = res.querySelectorAll('a'); if (!a.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : a.length - 1 + (sel < 0 ? 1 : 0))) % a.length; a.forEach(function (x, i) { x.classList.toggle('sel', i === sel); }); }
    if (e.key === 'Enter') { e.preventDefault(); location.href = (a[sel < 0 ? 0 : sel]).href; }
  });
  // переход из поиска к вопросу на /beget/voprosy/?q=…
  var q = new URLSearchParams(location.search).get('q'), qs = document.getElementById('qs');
  if (q && qs) { qs.value = q; qs.dispatchEvent(new Event('input', { bubbles: true })); var d = document.querySelector('details.qa:not([style*="none"])'); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } }
})();


// 10.11.2026: поиск в блоке «Ситуация с Бегет» на главной — IP или адрес сайта сразу на проверку сервера, остальное — в поиск по сайту
(function () {
  var f = document.querySelector('[data-bnow-s]'); if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = f.q.value.trim(); if (!raw) return f.q.focus();
    var v = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v) || /^[a-zа-яё0-9-]+(\.[a-zа-яё0-9-]+)+$/i.test(v)) { location.href = '/beget/server/#' + encodeURIComponent(v); return; }
    if (window.RL_SEARCH) window.RL_SEARCH(raw); else location.href = '/beget/voprosy/';
  });
})();

// 10.11.2026: ИИ-консультант (окошко на всех страницах). Сервер — api.rebornlab.ru/chat (vpn-id, служба rl-chat).
// Включается переключателем CHAT_ON ниже (на всех страницах) или тестовой ссылкой ?chat=1.
(function () {
  var CHAT_ON = true;   // 10.11 включено (ChatGPT gpt-5-mini, Claude — когда пополним). Было: включить, когда на vpn-id заработает ключ (/etc/rl-chat.env); до этого — только ?chat=1
  var on = CHAT_ON || /[?&]chat=1/.test(location.search);
  if (!on) return;
  var API = '/api/chat', LEAD = '/api/lead';
  var sid = ''; try { sid = sessionStorage.getItem('rl_chat_sid') || ''; } catch (e) {}
  if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); try { sessionStorage.setItem('rl_chat_sid', sid); } catch (e) {} }
  var hist = []; try { hist = JSON.parse(sessionStorage.getItem('rl_chat_hist') || '[]'); } catch (e) {}
  var est = null;
  function save() { try { sessionStorage.setItem('rl_chat_hist', JSON.stringify(hist.slice(-20))); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) { return esc(s).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)»])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/@Reborn_Lab/g, '<a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener">@Reborn_Lab</a>').replace(/\n/g, '<br>'); }
  var btn = document.createElement('button'); btn.className = 'rlc-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Ник на связи — спросить');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 5h16v11H9l-5 4z"/></svg><span>Ник на связи</span>';
  var box = document.createElement('div'); box.className = 'rlc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Ник на связи — помощник REBORN LAB');
  box.innerHTML = '<div class="rlc-hd"><div><b>Ник на связи</b><span>Отвечает ИИ-помощник · лично напишет Николай</span></div><button type="button" class="rlc-x" aria-label="Закрыть">×</button></div>' +
    '<div class="rlc-log" aria-live="polite"></div>' +
    '<div class="rlc-chips"><button type="button">Восстановить сайт</button><button type="button">Сайт не открывается</button><button type="button" data-lead="1">Связаться с Николаем</button></div>' +
    '<div class="rlc-lead" hidden><div class="rlc-lh"><b>Написать Николаю</b><button type="button" class="rlc-back">← к чату</button></div><input type="text" name="site" placeholder="Адрес сайта, если есть" autocomplete="off"><textarea name="q" rows="3" placeholder="Ваш вопрос или задача"></textarea><div class="rlc-ct"><select name="ct" aria-label="Как связаться"><option>Почта</option><option>Telegram</option><option>WhatsApp</option></select><input type="text" name="c" placeholder="name@mail.ru" autocomplete="off"></div><label><input type="checkbox" name="a"> Согласен на <a href="/consent/" target="_blank">обработку данных</a></label><div class="rlc-bt"><button type="button" class="btn btn-acc rlc-send-lead">Отправить Николаю</button></div><span class="rlc-note">Мы не звоним — Николай посмотрит сайт и напишет на почту, в Telegram или WhatsApp.</span></div>' +
    '<form class="rlc-in"><input type="text" placeholder="Адрес сайта и вопрос" maxlength="1000" aria-label="Ваш вопрос"><button type="submit" class="btn btn-acc" aria-label="Отправить">→</button></form>' +
    '<div class="rlc-ft">Хотите, чтобы ответил человек? <button type="button" class="rlc-lead-btn">Написать Николаю</button></div>';
  document.body.appendChild(btn); document.body.appendChild(box);
  var log = box.querySelector('.rlc-log'), form = box.querySelector('.rlc-in'), inp = form.querySelector('input'), busy = false;
  function add(role, text) { var d = document.createElement('div'); d.className = 'rlc-m ' + (role === 'user' ? 'u' : 'a'); d.innerHTML = fmt(text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function render() { log.innerHTML = ''; if (!hist.length) add('assistant', 'Здравствуйте! Я ИИ-помощник Николая из REBORN LAB. Подскажу, что с вашим сайтом и можно ли его вернуть. Напишите адрес сайта и вопрос — проверим. А если удобнее сразу поговорить с человеком, нажмите «Написать Николаю».'); hist.forEach(function (m) { add(m.role, m.content); }); }
  function ask(text) {
    if (busy || !text.trim()) return; busy = true;
    hist.push({ role: 'user', content: text.trim() }); save(); add('user', text.trim());
    var w = add('assistant', '…'); w.classList.add('wait');
    box.querySelector('.rlc-chips').hidden = true;
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: sid, messages: hist.slice(-16), page: location.pathname }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { w.classList.remove('wait'); var t = d.reply || 'Не получилось ответить — напишите админу @Reborn_Lab.'; w.innerHTML = fmt(t); hist.push({ role: 'assistant', content: t }); save();
        if (d.lead && !log.querySelector('.rlc-cta')) { var cb = document.createElement('button'); cb.type = 'button'; cb.className = 'btn btn-acc rlc-cta'; cb.textContent = 'Написать Николаю'; cb.addEventListener('click', openLead); w.appendChild(cb); } })
      .catch(function () { w.classList.remove('wait'); w.innerHTML = fmt('Нет связи. Напишите админу @Reborn_Lab.'); })
      .then(function () { busy = false; log.scrollTop = log.scrollHeight; });
  }
  function openLead() {
    var l = box.querySelector('.rlc-lead'), sf = l.querySelector('input[name=site]'), qf = l.querySelector('textarea[name=q]');
    if (!sf.value) hist.forEach(function (m) { if (m.role === 'user') { var x = m.content.match(/([a-zа-яё0-9-]+\.)+(ru|рф|com|net|org|su|info|pro|online|site|shop|store|biz|me|io|by|kz|ua)\b/i); if (x) sf.value = x[0]; } });
    if (!qf.value) { var us = hist.filter(function (m) { return m.role === 'user' && !/^(Восстановить сайт|Сайт не открывается)$/.test(m.content); }).map(function (m) { return m.content; }); qf.value = us.slice(-2).join('\n'); }
    l.hidden = false; form.hidden = true; box.querySelector('.rlc-ft').hidden = true; box.querySelector('.rlc-chips').hidden = true;
    setTimeout(function () { (sf.value ? (qf.value ? ctIn : qf) : sf).focus(); }, 30);
  }
  function closeLead() { box.querySelector('.rlc-lead').hidden = true; form.hidden = false; box.querySelector('.rlc-ft').hidden = false; setTimeout(function () { inp.focus(); }, 30); }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); var t = inp.value.trim(); if (!t) return;
    var em = t.match(/[^\s@]+@[^\s@]+\.[a-zа-я]{2,}/i), tg = t.match(/(?:^|\s)@([a-z0-9_]{4,32})\b/i) || t.match(/t\.me\/([a-z0-9_]{4,32})/i), ph = t.match(/(?:\+7|\b8|\b7)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/);   // только телефон РФ, не IP
    if (em || tg || ph) {   // 11.11: контакт не отправляем в ИИ — в форму, где есть согласие
      inp.value = '';
      if (em) { ctSel.value = 'Почта'; ctIn.value = em[0]; } else if (tg) { ctSel.value = 'Telegram'; ctIn.value = '@' + tg[1]; } else { ctSel.value = 'WhatsApp'; ctIn.value = ph[0].trim(); }
      add('assistant', 'Спасибо! Контакт перенесли в форму — отметьте согласие на обработку данных и нажмите «Отправить Николаю», он напишет вам лично.');
      openLead(); return;
    }
    inp.value = ''; ask(t);
  });
  box.querySelectorAll('.rlc-chips button').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.lead) { openLead(); } else ask(b.textContent); }); });
  box.querySelector('.rlc-lead-btn').addEventListener('click', openLead);
  box.querySelector('.rlc-back').addEventListener('click', closeLead);
  var ctSel = box.querySelector('select[name=ct]'), ctIn = box.querySelector('input[name=c]');
  var PH = { 'Почта': 'name@mail.ru', 'Telegram': '@ваш_ник', 'WhatsApp': '+7 900 000-00-00' };
  ctSel.addEventListener('change', function () { ctIn.placeholder = PH[ctSel.value]; ctIn.focus(); });
  function leadData() {
    var l = box.querySelector('.rlc-lead'), c = ctIn.value.trim(), a = l.querySelector('input[name=a]');
    if (c.length < 3) { ctIn.focus(); return null; }
    if (ctSel.value === 'Почта' && !/^[^\s@]+@[^\s@]+\.[a-zа-я]{2,}$/i.test(c)) { ctIn.focus(); ctIn.classList.add('bad'); return null; }
    ctIn.classList.remove('bad');
    if (!a.checked) { l.classList.add('need'); return null; }
    var site = ''; hist.forEach(function (m) { if (m.role === 'user') { var x = m.content.match(/([a-zа-яё0-9-]+\.)+(ru|рф|com|net|org|su|info|pro|online|site|shop|store|biz|me|io|by|kz|ua)\b/i); if (x) site = x[0]; } });
    var sv = l.querySelector('input[name=site]').value.trim(), qv = l.querySelector('textarea[name=q]').value.trim(); if (sv) site = sv;
    if (!sv && !qv && !hist.length) { l.querySelector('textarea[name=q]').focus(); return null; }
    var text = ((sv ? 'Сайт: ' + sv + '\n' : '') + (qv ? 'Вопрос: ' + qv + '\n' : '') + (hist.length ? '\nИз чата на сайте:\n' + hist.slice(-12).map(function (m) { return (m.role === 'user' ? '👤 ' : '🤖 ') + m.content; }).join('\n') : '')).replace(/https?:\/\/\S+/g, '[ссылка]');   // антиспам заявок режет >2 ссылок
    return { l: l, contact: ctSel.value + ': ' + c, text: text.slice(0, 3500), site: site };
  }
  function fail(l, msg) { l.insertAdjacentHTML('beforeend', '<p class="rlc-err">' + (msg || 'Не отправилось') + ' — или напишите <a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener">@Reborn_Lab</a>.</p>'); }
  box.querySelector('.rlc-send-lead').addEventListener('click', function () {
    var d = leadData(); if (!d) return;
    fetch(LEAD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topics: ['ИИ-консультант'], text: d.text, contact: d.contact, page: location.pathname, agree: true, hp: '', k: RL_T0.toString(36), t: Date.now() - RL_T0, h: RL_HUMAN ? 1 : 0 }) })
      .then(function (r) { if (r.ok) { d.l.innerHTML = '<p>✅ Готово! Николай напишет вам (' + esc(d.contact) + ').</p><button type="button" class="rlc-lead-btn">← вернуться к чату</button>'; d.l.querySelector('button').addEventListener('click', function () { d.l.hidden = true; form.hidden = false; box.querySelector('.rlc-ft').hidden = false; }); try { if (window.ym && window.RL_METRIKA) ym(window.RL_METRIKA, 'reachGoal', 'chat_lead'); } catch (e) {} } else fail(d.l); })
      .catch(function () { fail(d.l); });
  });
  function open() { box.classList.add('on'); btn.classList.add('hide'); if (!log.children.length) render(); setTimeout(function () { inp.focus(); }, 50); try { if (window.ym && window.RL_METRIKA) ym(window.RL_METRIKA, 'reachGoal', 'chat_open'); } catch (e) {} }
  btn.addEventListener('click', open);
  box.querySelector('.rlc-x').addEventListener('click', function () { box.classList.remove('on'); btn.classList.remove('hide'); });
  window.RL_CHAT = function (q) { open(); if (q) ask(q); };
  var pm = location.search.match(/[?&]oplata=([a-f0-9]{6,12})/);   // возврат из ЮKassa
  if (pm) {
    open();
    var pw = add('assistant', 'Проверяю оплату…'), tries = 0;
    (function chk() {
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'paystatus', pid: pm[1] }) }).then(function (r) { return r.json(); }).then(function (x) {
        if (x.status === 'paid') { pw.innerHTML = fmt('✅ Оплата получена, спасибо! Админ напишет вам в ближайшее время и покажет демо' + (x.site ? ' сайта ' + x.site : '') + '. Если удобнее — напишите сами @Reborn_Lab.'); try { if (window.ym && window.RL_METRIKA) ym(window.RL_METRIKA, 'reachGoal', 'chat_paid'); } catch (e) {} }
        else if (x.status === 'canceled') pw.innerHTML = fmt('Оплата не прошла или отменена. Можно попробовать ещё раз кнопкой «Оставить заявку» или написать @Reborn_Lab.');
        else if (++tries < 12) setTimeout(chk, 5000);
        else pw.innerHTML = fmt('Оплата пока в обработке. Как только она пройдёт, админ получит уведомление и напишет вам.');
      }).catch(function () { pw.innerHTML = fmt('Не получилось проверить оплату — напишите @Reborn_Lab.'); });
    })();
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
})();

// 12.11.2026 (Ник): «Поделиться страницей» в подвале всех страниц. Ссылка — api.rebornlab.ru/s/<путь>: там роботы Telegram/VK/WhatsApp
// получают превью (до нашего российского сервера Telegram не достаёт), а человек по ссылке сразу попадает на оригинал rebornlab.ru (301).
;(function () {
  var box = document.querySelector('[data-pageshare]'); if (!box) return
  var p = location.pathname
  if (document.querySelector('.share') || /^\/demo\//.test(p) || location.hostname !== 'rebornlab.ru') { box.remove(); return }   // у статей свой блок
  var url = 'https://api.rebornlab.ru/s' + p, u = encodeURIComponent(url), t = encodeURIComponent(document.title.replace(/\s+—\s+REBORN LAB$/, ''))
  var H = {tg: 'https://t.me/share/url?url=' + u + '&text=' + t, vk: 'https://vk.com/share.php?url=' + u + '&title=' + t, wa: 'https://wa.me/?text=' + t + '%20' + u, ok: 'https://connect.ok.ru/offer?url=' + u + '&title=' + t}
  box.querySelectorAll('[data-sh]').forEach(function (a) {
    var k = a.getAttribute('data-sh')
    if (H[k]) a.href = H[k]
    else if (k === 'copy') a.onclick = function () { try { navigator.clipboard.writeText(url) } catch (e) {} a.textContent = 'Ссылка скопирована' }
  })
})()

// 12.11.2026 (Ник): «Добавить в мониторинг» — любой сайт, IP или подсеть; сразу на мониторинг (rebornlab.ru/api/check?watch=…, служба hostcheck),
// потом мягко — подписка в боте. Лента «только что добавили» — ?feed=1 (адреса частично скрыты). Один блок на /monitoring-saitov/, /hosting/*, главной.
;(function () {
  var boxes = document.querySelectorAll('[data-watch]'); if (!boxes.length) return
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c] }) }
  function b64(v) { return btoa(unescape(encodeURIComponent(v))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 62) }
  function ago(t) { var m = Math.max(0, Math.round((Date.now() / 1000 - t) / 60)); return m < 1 ? 'только что' : m < 60 ? m + ' мин' : m < 1440 ? Math.round(m / 60) + ' ч' : Math.round(m / 1440) + ' дн' }
  var KIND = {site: 'сайт', ip: 'сервер', net: 'подсеть'}
  function feed() {
    fetch('/api/check?feed=1', {cache: 'no-store'}).then(function (r) { return r.json() }).then(function (f) {
      var html = (f.items || []).slice(0, 8).map(function (x) {
        var c = x.up === true ? 'ok' : x.up === false ? 'bad' : 'wait'
        return '<li><i class="' + c + '"></i><b>' + esc(x.a) + '</b> <span>' + KIND[x.k] + (x.h ? ' · ' + esc(x.h) : '') + ' · ' + ago(x.t) + '</span></li>'
      }).join('') || '<li class="wbx-e">Пока пусто — добавьте первым</li>'
      boxes.forEach(function (b) { var u = b.querySelector('[data-wfeed]'); if (u) u.innerHTML = html; var t = b.querySelector('[data-wtot]'); if (t && f.total) t.textContent = '· на мониторинге ' + f.total })
    }).catch(function () {})
  }
  function add(a, box) {
    var r = box.querySelector('.wbx-r'); r.hidden = false; r.className = 'wbx-r'; r.innerHTML = 'Добавляем ' + esc(a) + '…'
    try { if (window.ym && window.RL_METRIKA) ym(window.RL_METRIKA, 'reachGoal', 'watch_site') } catch (e) {}
    fetch('/api/check?watch=' + encodeURIComponent(a), {cache: 'no-store'}).then(function (x) { return x.json() }).then(function (j) {
      if (j.ok) {
        var bot = 'https://t.me/rebornlab_bot?start=w_' + b64(j.addr)
        r.className = 'wbx-r ok'
        r.innerHTML = '✅ <b>' + esc(j.addr) + '</b> ' + (j.already ? 'уже на мониторинге' : 'на мониторинге') + (j.hoster ? ' · хостинг ' + esc(j.hoster) : '') +
          '. Статус появится в ленте ниже в течение 30 минут.' + (j.key && j.key !== 'beget' ? ' <a href="/hosting/' + esc(j.key) + '/">Статус ' + esc(j.hoster) + ' →</a>' : j.key === 'beget' ? ' <a href="/beget/server/">Мониторинг Бегет →</a>' : '') +
          '<div class="wbx-bot"><span>Хотите узнавать о сбое первым? Бот напишет в Telegram, когда ' + (j.kind === 'site' ? 'сайт' : 'сервер') + ' упадёт или заработает.</span>' +
          '<a class="btn btn-acc" href="' + bot + '" target="_blank" rel="noopener" data-goal="watch_bot">🔔 Получать уведомления</a></div>'
        feed()
      } else {
        r.className = 'wbx-r bad'
        r.innerHTML = j.error === 'blocked' ? '⛔ Это хостинг ' + esc(j.hoster) + ': он закрывает наши проверки, поэтому следить за ним мы не можем.' :
          j.error === 'nodns' ? 'Не нашли такой домен в DNS — проверьте адрес.' : j.error === 'private' ? 'Это внутренний адрес — проверяем только сайты и серверы в интернете.' :
          j.error === 'limit' ? 'Слишком много добавлений подряд — подождите несколько минут.' : 'Не похоже на адрес сайта, IP или подсеть. Пример: mysite.ru, 45.130.41.12 или 45.130.41.0/24.'
      }
    }).catch(function () { r.className = 'wbx-r bad'; r.textContent = 'Не получилось — попробуйте через минуту.' })
  }
  window.RL_WATCH_ADD = function (a) { var b = boxes[0]; if (b) { b.querySelector('input[name=a]').value = a; add(a, b); b.scrollIntoView({behavior: 'smooth', block: 'center'}) } }
  boxes.forEach(function (box) {
    var f = box.querySelector('.wbx-f'), h = box.getAttribute('data-host')
    if (h) f.querySelector('input').placeholder = 'Сайт на ' + h + ' или IP сервера'
    f.addEventListener('submit', function (e) {   // 12.11: исправляем опечатки сами — «site..com», пробелы, http://, путь
      e.preventDefault(); var inp = f.querySelector('input')
      var v = inp.value.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/\s+/g, '').replace(/,/g, '.').replace(/\.{2,}/g, '.')
      if (!/\/\d+$/.test(v)) v = v.split('/')[0]
      v = v.replace(/^\.+|\.+$/g, ''); inp.value = v; if (v) add(v, box)
    })
  })
  feed(); setInterval(feed, 60000)
})()
