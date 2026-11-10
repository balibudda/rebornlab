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
      if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(contact)) { var ce = f.querySelector('input[name=contact]'); ce && (ce.value = '', ce.placeholder = 'Почту не принимаем — укажите Telegram или телефон', ce.focus()); return; }   // 09.11 (Ник): почту не собираем
      var ag = f.querySelector('input[name=agree]');
      if (ag && !ag.checked) { f.classList.add('need-agree'); ag.focus(); return; }
      f.classList.remove('need-agree');
      btn.disabled = true; btn.textContent = 'Отправляю…';
      var payload = { topics: topics, text: text.trim(), contact: contact.trim(), page: location.pathname, agree: true, hp: (f.querySelector('input[name=company]') || {}).value || '', k: RL_T0.toString(36), t: Date.now() - RL_T0, h: RL_HUMAN ? 1 : 0 };   // 08.11: метки антиспама
      fetch('https://api.rebornlab.ru/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
    document.getElementById('cookie-ok').addEventListener('click', function () {
      try { localStorage.setItem('rl_cookie_ok', '1'); } catch (e) {}
      ck.hidden = true; window.RL_LOAD_METRIKA && window.RL_LOAD_METRIKA();
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
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/beget|багет|бегете|бегета|бегету|бегетом/g, 'бегет'); }
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
    var w = q.split(/\s+/).map(function (x) { return x.length > 4 ? x.slice(0, -1) : x; });
    var list = data.map(function (x) {
      var t = norm(x.t), d = norm(x.d), s = 0;
      for (var i = 0; i < w.length; i++) { if (t.indexOf(w[i]) >= 0) s += 3; else if (d.indexOf(w[i]) >= 0) s += 1; else return null; }
      if (t.indexOf(q) === 0) s += 3;
      return { x: x, s: s };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
    out += list.map(function (r) { return row(r.x); }).join('');
    res.innerHTML = out || '<div class="srch-e">Ничего не нашлось. Посмотрите <a href="/beget/voprosy/">все вопросы и ответы</a> или <a href="/journal/">журнал</a>.</div>';
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
