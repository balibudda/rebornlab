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
      var payload = { topics: topics, text: text.trim(), contact: contact.trim(), page: location.pathname, agree: true, hp: (f.querySelector('input[name=company]') || {}).value || '' };
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
