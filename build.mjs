// REBORN LAB static site generator — no dependencies. `node build.mjs` → writes the site into ./ (GitHub Pages root).
// Sources: src/data.mjs (projects, services…), content/journal/*.md (articles with front matter), src/styles.css, src/main.js.
// New article = new .md file in content/journal → `node build.mjs` → commit + push.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { SITE, PROJECTS, SERVICES, PROBLEMS, MARKET, START_SMALL, JOURNAL_CATEGORIES } from './src/data.mjs'

const ROOT = path.dirname(new URL(import.meta.url).pathname)
const OUT = ROOT
const GENERATED_DIRS = ['oferta', 'consent-order', 'proverka-sajta', 'services', 'projects', 'journal', 'about', 'contact', 'privacy', 'consent', 'assets']
const today = new Date().toISOString().slice(0, 10)

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function write(rel, html) {
  const f = path.join(OUT, rel)
  mkdirSync(path.dirname(f), { recursive: true })
  writeFileSync(f, html)
}
const ru = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

// tiny markdown → html (headings, paragraphs, lists, quotes, bold/italic/code/links)
function md(src) {
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, h) => `<a href="${h}"${/^https?:/.test(h) && !h.startsWith(SITE.url) ? ' rel="noopener" target="_blank"' : ''}>${a}</a>`)
  const out = []
  const blocks = src.trim().split(/\n\s*\n/)
  for (const b of blocks) {
    const lines = b.split('\n')
    if (/^#{2,3} /.test(b)) { const lvl = b.match(/^#+/)[0].length; out.push(`<h${lvl} id="${slugify(b.replace(/^#+ /, ''))}">${inline(b.replace(/^#+ /, ''))}</h${lvl}>`) }
    else if (lines.every((l) => /^\s*[-*] /.test(l))) out.push('<ul>' + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('') + '</ul>')
    else if (lines.every((l) => /^\s*\d+\. /.test(l))) out.push('<ol>' + lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\. /, ''))}</li>`).join('') + '</ol>')
    else if (lines.every((l) => /^> ?/.test(l))) out.push('<blockquote><p>' + inline(lines.map((l) => l.replace(/^> ?/, '')).join(' ')) + '</p></blockquote>')
    else out.push('<p>' + inline(lines.join(' ')) + '</p>')
  }
  return out.join('\n')
}
function slugify(s) {
  const tr = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' }
  return s.toLowerCase().split('').map((c) => tr[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}
function frontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { meta: {}, body: raw }
  const meta = {}
  for (const l of m[1].split('\n')) { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '') }
  return { meta, body: m[2] }
}

// ---------- brand ----------
const MARK = `<svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true"><path d="M1 15h10" stroke="#edebe6" stroke-width="2" stroke-linecap="round"/><circle cx="14.5" cy="15" r="2" fill="#c6f24e"/><path d="M18 15c4 0 5-9 11-9" stroke="#edebe6" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`
const LOGO = `<a class="logo" href="/" aria-label="REBORN LAB — на главную">${MARK}<b>REBORN</b><span>LAB</span></a>`

const svIcon = (s) => `<svg class="sv-ico" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.icon || ''}</svg>`
const svPains = (s) => s.pains ? `<div class="sv-pain"><b>Если у вас:</b><ul>${s.pains.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''
const HAS_SELLER = !!(SITE.operator && SITE.operatorInn)   // оферта и данные продавца — только с реквизитами
const NAV = [['/proverka-sajta/', 'Проверка сайта'], ['/projects/', 'Проекты'], ['/services/', 'Услуги'], ['/journal/', 'Журнал'], ['/about/', 'О лаборатории']]

function shell({ title, description, canonical, body, jsonLd = [], ogType = 'website', image = '/assets/og.jpg', current = '', noindex = false }) {
  const url = SITE.url + canonical
  const metrika = SITE.metrikaId ? `<script>window.RL_METRIKA=${SITE.metrikaId};window.RL_LOAD_METRIKA=function(){(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${SITE.metrikaId}','ym');ym(${SITE.metrikaId},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true})};</script>` : ''
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow, noarchive">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="REBORN LAB">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE.url}${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE.url}${image}">
<meta name="theme-color" content="#08090a">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="REBORN LAB — Журнал" href="/rss.xml">
<link rel="stylesheet" href="/assets/styles.css">
${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
${metrika}
</head>
<body>
<header class="hdr"><div class="wrap">
  ${LOGO}
  <nav class="nav" aria-label="Основное меню">${NAV.map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ''}>${t}</a>`).join('')}<a class="nav-cta" href="/contact/" data-goal="cta_menu">Обсудить идею →</a></nav>
  <a class="hdr-cta" href="/contact/" data-goal="cta_header">Обсудить идею</a>
  <button class="burger" aria-label="Меню" aria-expanded="false">☰</button>
</div></header>
<main>
${body}
</main>
<footer class="ftr"><div class="wrap">
  <div>${LOGO}<p style="margin:14px 0 0;max-width:30em">Цифровые продукты · AI · Автоматизация · Разработка · SEO/GEO · Дизайн.<br>Принесите задачу — соберём решение.</p><p>© ${new Date().getFullYear()} REBORN LAB · <a href="/privacy/">Политика конфиденциальности</a> · <a href="/consent/">Согласие на обработку данных</a></p></div>
  <div><a href="/proverka-sajta/">Проверка сайта</a><a href="/projects/">Проекты</a><a href="/services/">Услуги</a><a href="/journal/">Журнал</a><a href="/about/">О лаборатории</a><a href="/contact/">Контакты</a></div>
  <div><a href="https://t.me/${SITE.telegram}" rel="noopener" target="_blank">Telegram @${SITE.telegram}</a><a href="https://github.com/balibudda" rel="noopener" target="_blank">GitHub</a><a href="/rss.xml">RSS журнала</a></div>
</div></footer>
<div class="cookie" id="cookie" hidden><p>Сайт использует cookie и Яндекс Метрику (включая Вебвизор) для статистики посещаемости. Нажимая «Согласен», вы соглашаетесь с этим. Подробнее — в <a href="/privacy/">политике конфиденциальности</a>.</p><button type="button" class="btn btn-acc" id="cookie-ok">Согласен</button></div>
<script src="/assets/main.js" defer></script>
</body>
</html>`
}

const ORG = { '@context': 'https://schema.org', '@type': 'Organization', name: 'REBORN LAB', url: SITE.url, logo: SITE.url + '/assets/logo.png', description: SITE.tagline, sameAs: [`https://t.me/${SITE.telegram}`, 'https://github.com/balibudda'] }
const crumbsLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE.url + u })) })
const crumbs = (items) => `<div class="crumbs">${items.map(([n, u], i) => i < items.length - 1 ? `<a href="${u}">${esc(n)}</a> / ` : esc(n)).join('')}</div>`

// ---------- reusable blocks ----------
const byslug = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]))
function projCard(p, big = false) {
  const shot = p.image ? `<img src="/assets/projects/${p.image}" alt="${esc(p.name)} — скриншот" loading="lazy" width="1200" height="750">` : `<svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true"><rect x="22" y="8" width="76" height="64" rx="12" fill="none" stroke="#2a2e33"/><path d="M40 40h14" stroke="#edebe6" stroke-width="2" stroke-linecap="round"/><circle cx="60" cy="40" r="3" fill="#c6f24e"/><path d="M66 40c6 0 8-12 16-12" stroke="#edebe6" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`
  return `<a class="proj rv${big ? ' big' : ''}" href="/projects/${p.slug}/" data-goal="project_${p.slug}"${p.private ? ' rel="nofollow" data-nosnippet' : ''}>
    <div class="shot${p.image ? '' : ' empty'}">${p.status ? `<span class="status">${esc(p.status)}</span>` : ''}${shot}</div>
    <div class="body"><div class="kind">${esc(p.kind)}</div><h3>${esc(p.name)}</h3><p>${esc(p.lead)}</p>
      <div class="tags">${p.stack.slice(0, big ? 8 : 4).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
      <span class="card-link">Как сделано <span class="arrow">→</span></span></div></a>`
}
function leadForm(id, label = 'Разобрать задачу') {
  return `<form data-lead id="${id}" novalidate>
    <div class="chips" data-chips>${['Есть идея', 'Нужен сайт', 'Автоматизировать бизнес', 'Нужен AI', 'Нужно продвижение', 'Другая задача'].map((c) => `<button type="button" class="chip">${c}</button>`).join('')}</div>
    <label class="sr" for="${id}-t">Опишите задачу</label>
    <textarea class="ym-disable-keys" id="${id}-t" name="text" placeholder="Опишите проблему или идею обычными словами. Например: «заявок много, менеджеры не успевают отвечать»"></textarea>
    <div class="form-row"><label class="sr" for="${id}-c">Контакт</label><input class="ym-disable-keys" type="text" id="${id}-c" name="contact" placeholder="Telegram, телефон или email — как с вами связаться" style="flex:1;min-width:220px"></div>
    <input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
    <label class="agree"><input type="checkbox" name="agree" required> <span>Даю <a href="/consent/" target="_blank">согласие на обработку персональных данных</a> и принимаю <a href="/privacy/" target="_blank">политику конфиденциальности</a></span></label>
    <div class="form-row"><button class="btn btn-acc" type="submit" data-label="${label} →">${label} <span class="arrow">→</span></button><a class="btn btn-ghost" href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener" data-goal="telegram">Написать в Telegram</a></div>
    <p class="ok-msg">Получили ✓ Разберём задачу и ответим вам лично.</p>
    <p class="hint">Отвечаем лично. Без спама и обязательств — сначала разбираемся, потом предлагаем.</p>
    <p class="err-msg">Отметьте согласие на обработку данных — без него мы не можем принять заявку.</p>
  </form>`
}

// ---------- journal ----------
const JDIR = path.join(ROOT, 'content', 'journal')
const POSTS = (existsSync(JDIR) ? readdirSync(JDIR).filter((f) => f.endsWith('.md')) : []).map((f) => {
  const { meta, body } = frontMatter(readFileSync(path.join(JDIR, f), 'utf8'))
  return { ...meta, slug: meta.slug || f.replace(/\.md$/, ''), html: md(body), words: body.split(/\s+/).length }
}).filter((p) => p.date <= today && p.draft !== 'true').sort((a, b) => (a.date < b.date ? 1 : -1))
const postCard = (p) => `<a class="post rv" href="/journal/${p.slug}/"><div class="meta">${esc(JOURNAL_CATEGORIES[p.category] || p.category)} · ${ru(p.date)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></a>`

// ---------- HOME ----------
const SYS_NODES = [
  ['IDEA', 'Идея или проблема — с этого начинается любой проект. Можно прийти даже без ТЗ.'],
  ['UX', 'Сценарии: кто пользователь, что он хочет сделать, где он застрянет.'],
  ['DESIGN', 'Интерфейс и визуальный язык, которые понятны с первого взгляда.'],
  ['FRONTEND', 'Быстрый интерфейс на сайте, в приложении или в Telegram.'],
  ['BACKEND', 'Логика, база данных, оплаты, личные кабинеты, API.'],
  ['AI', 'Интеллект там, где он экономит время: ответы, поиск, обработка данных.'],
  ['AUTOMATION', 'Всё, что повторяется, делается само: заявки, уведомления, отчёты.'],
  ['SEO / GEO', 'Чтобы продукт находили — в поиске и в ответах AI-ассистентов.'],
  ['ANALYTICS', 'Цифры, по которым видно, что работает и что улучшать.'],
  ['PRODUCT', 'Работающий продукт, который приносит результат и развивается.'],
]
const featured = PROJECTS.filter((p) => p.featured)
const home = shell({
  title: 'REBORN LAB — цифровая лаборатория: сайты, сервисы, AI и автоматизация',
  description: 'Принесите задачу — соберём решение. Сайты, веб-сервисы, AI-ассистенты, автоматизация, SEO и GEO под конкретную задачу бизнеса. Реальные проекты и честный разбор.',
  canonical: '/',
  jsonLd: [ORG, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'REBORN LAB', url: SITE.url, inLanguage: 'ru' }],
  body: `
<section class="hero" aria-labelledby="h1">
  <canvas id="lab" aria-hidden="true"></canvas>
  <div class="wrap">
    <a class="pv-pill" href="/proverka-sajta/" data-goal="pill_proverka"><span class="pv-new">Новое</span> Бесплатная проверка сайта на штрафы 152-ФЗ <span class="arrow">→</span></a>
    <div class="kicker">Digital laboratory · идея → система → продукт</div>
    <h1 id="h1">Скажите, что нужно. <em>Остальное соберём.</em></h1>
    <p class="sub">Сайты, веб-сервисы, AI, автоматизация, SEO и внутренние системы — придумываем и собираем под вашу задачу. Можно прийти без ТЗ: с идеей или с проблемой.</p>
    <div class="row">
      <a class="btn btn-acc" href="#task" data-goal="cta_hero">Разобрать задачу <span class="arrow">→</span></a>
      <a class="btn btn-ghost" href="#made">Что мы уже сделали</a>
    </div>
    <a class="pv-promo rv" href="/proverka-sajta/" data-goal="promo_proverka"><span class="pv-new">Новое</span><span class="pv-promo-t"><b>Проверим ваш сайт на штрафы по 152-ФЗ — бесплатно</b><span>Формы без согласия, Google Analytics, политика — штраф до 6 млн ₽. Документы под сайт — 999 ₽, перенос с Tilda — 1 999 ₽.</span></span><span class="btn btn-acc">Проверить сайт <span class="arrow">→</span></span></a>
    <div class="hero-meta"><span><i>●</i> ${PROJECTS.length} реальных проектов</span><span>AI · Web · Automation · SEO/GEO · Design</span><span>от прототипа до продукта</span></div>
  </div>
</section>
<div class="rline"></div>

<section class="sec" id="made"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Made by Reborn Lab</div><h2>Уже работает <em>вживую</em></h2></div><p>Не макеты для портфолио, а продукты с пользователями, оплатами, приложениями и трафиком из поиска. Нажмите на проект — расскажем, как сделано.</p></div>
  <div class="grid-proj">
    ${projCard(featured[0], true)}
    ${featured.slice(1).map((p) => projCard(p)).join('\n')}
  </div>
  <p style="margin-top:26px" class="rv"><a class="btn btn-ghost" href="/projects/">Все проекты <span class="arrow">→</span></a></p>
</div></section>

<section class="sec" style="padding-top:10px"><div class="wrap">
  <div class="sl-logo rv"><img src="/assets/svoya-liniya-logo.jpg" alt="" width="88" height="88" loading="lazy"></div>
</div></section>

<section class="sec" style="padding-top:20px"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Что мы можем</div><h2>Не одна технология, <em>а целая лаборатория</em></h2></div><p>Под задачу собираем нужную связку: где-то хватит сайта, где-то нужен AI, где-то — автоматизация и интеграции. Чаще всего — всё вместе.</p></div>
  <div class="caps">
    ${SERVICES.map((s) => `<a class="cap rv" href="/services/${s.slug}/"><div class="sv-top">${svIcon(s)}<span class="code">${s.code}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.lead)}</p>${svPains(s)}</a>`).join('\n')}
    <a class="cap ask rv" href="#task"><span class="code">06</span><h3>Ваша задача</h3><p>Не нашли своё? Это нормально. Опишите проблему — предложим, что можно сделать.</p><span class="card-link" style="margin-top:auto">Разобрать задачу <span class="arrow">→</span></span></a>
  </div>
</div></section>
<div class="rline"></div>

<section class="sec" id="task"><div class="wrap pain">
  <div>
    <div class="kicker rv">Не знаете, что именно нужно?</div>
    <h2 class="rv" style="font-size:clamp(32px,4.4vw,56px);line-height:1.04;letter-spacing:-.03em;margin:12px 0 18px">Это нормально. <em style="font-style:normal;color:var(--acc)">Опишите, что болит.</em></h2>
    <p class="muted rv" style="font-size:17.5px;margin:0 0 26px">Не нужно знать технологии. Расскажите проблему обычными словами — мы разберём её и предложим решение. Вот как это обычно выглядит:</p>
    <div class="pairs">${PROBLEMS.map(([q, a]) => `<div class="pair rv"><span class="q">«${esc(q)}»</span><span class="to">→</span><span class="a">${esc(a)}</span></div>`).join('')}</div>
  </div>
  <div class="ask-box rv"><div class="kicker">Расскажите, что болит</div><h3>У меня есть идея / проблема…</h3>${leadForm('f-task')}</div>
</div></section>

<section class="sec" style="padding-top:20px"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Из чего может состоять продукт</div><h2>От идеи <em>до продукта</em></h2></div><p>Нажмите на этап — расскажем, что в нём происходит. Не обязательно проходить все: начинаем с того, что нужно вам.</p></div>
  <div class="flow rv">${SYS_NODES.map(([n, d], i) => `<button type="button" class="node${i === 0 ? ' on' : ''}" data-info="${esc(d)}">${n}</button>${i < SYS_NODES.length - 1 ? '<span class="lnk">→</span>' : ''}`).join('')}</div>
  <p class="node-info rv" id="node-info">${esc(SYS_NODES[0][1])}</p>
  <div class="rv" style="margin-top:60px"><div class="kicker">AI — не игрушка</div><h3 style="font-size:clamp(26px,3vw,38px);letter-spacing:-.02em;margin:10px 0 6px">Встраиваем интеллект в существующие процессы</h3><p class="muted" style="max-width:44em">AI работает не сам по себе, а связан с тем, что у вас уже есть: сайтом, CRM, Telegram, базой данных и аналитикой.</p></div>
  <div class="arch rv">
    <div class="cell"><b>WEBSITE</b>Заявки и вопросы клиентов</div><div class="cell"><b>TELEGRAM</b>Чаты, боты, уведомления</div><div class="cell"><b>DOCUMENTS</b>Файлы, регламенты, базы знаний</div>
    <div class="cell core"><b style="color:var(--acc)">AI AGENT</b>понимает запрос → находит данные → отвечает или выполняет действие</div>
    <div class="cell"><b>CRM</b>Клиент и сделка создаются сами</div><div class="cell"><b>DATABASE</b>Всё сохраняется и связывается</div><div class="cell"><b>ANALYTICS</b>Видно, что работает</div>
  </div>
</div></section>
<div class="rline"></div>

<section class="sec"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Что сейчас актуально</div><h2>Бизнес хочет <em>автоматизировать</em> прямо сейчас</h2></div><p>Спрос на AI и автоматизацию в России растёт быстрее всего остального рынка цифровых услуг.</p></div>
  <div class="stats">${MARKET.stats.map(([n, t]) => `<div class="stat rv"><b>${n}</b><span>${esc(t)}</span></div>`).join('')}</div>
  <div class="wants rv">${MARKET.wants.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
  <p class="src">Рост спроса в 2025 году к 2024. Источник: <a href="${MARKET.source}" rel="noopener" target="_blank">${esc(MARKET.sourceName)}</a>.</p>
</div></section>

<section class="sec" style="padding-top:20px"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Не нужно покупать всё</div><h2>Можно <em>начать с малого</em></h2></div><p>Никаких обязательных пакетов. Начинаем с того шага, который даст результат быстрее всего.</p></div>
  <div class="small">${START_SMALL.map(([a, b]) => `<div class="rv"><b>${esc(a)}</b><span>→ ${esc(b)}</span></div>`).join('')}</div>
</div></section>
<div class="rline"></div>

${POSTS.length ? `<section class="sec"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Lab notes</div><h2>Журнал <em>лаборатории</em></h2></div><p>Разборы, кейсы и практические инструкции: AI, автоматизация, сайты, SEO и GEO — без воды.</p></div>
  <div class="posts">${POSTS.slice(0, 3).map(postCard).join('')}</div>
  <p style="margin-top:26px" class="rv"><a class="btn btn-ghost" href="/journal/">Все материалы <span class="arrow">→</span></a></p>
</div></section>` : ''}

<section class="sec final" id="contact"><div class="wrap"><div class="final-box rv">
  <div class="kicker">У вас есть идея?</div>
  <h2>Принесите её. <em>Даже если звучит странно.</em></h2>
  <p class="muted" style="font-size:18px;max-width:40em;margin:0">Разберём задачу, предложим архитектуру и покажем, как превратить её в работающий цифровой продукт.</p>
  <div class="contact-grid"><div>${leadForm('f-final', 'Запустить проект')}</div>
  <div class="contact-side"><div><div class="kicker">Напрямую</div><p style="font-size:20px;margin:8px 0 0"><a href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener" data-goal="telegram">Telegram @${SITE.telegram}</a></p></div><p>Отвечаем лично. Сначала разбираемся в задаче, потом называем срок и стоимость — без навязанных пакетов.</p></div></div>
</div></div></section>`,
})
write('index.html', home)

// ---------- SERVICES ----------
write('services/index.html', shell({
  title: 'Услуги REBORN LAB — разработка, AI, автоматизация, SEO/GEO, дизайн',
  description: 'Разработка сайтов и веб-сервисов, внедрение AI, автоматизация бизнеса, SEO и GEO, UI/UX-дизайн. Собираем решение под задачу, а не продаём пакеты.',
  canonical: '/services/', current: '/services/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Услуги', '/services/']])],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Услуги', '/services/']])}<h1>Что мы <span style="color:var(--acc)">собираем</span></h1><p class="sub">Под каждую задачу — своя связка. Выберите направление или просто опишите задачу.</p></div>
  <section class="sec" style="padding-top:10px"><div class="wrap">
  <div class="sv-info rv">
    <div class="sv-big"><div class="kicker">Живая статистика нашей проверки</div><div class="sv-num"><span id="sv-pct">56</span>%</div>
      <p>сайтов нарушают закон о персональных данных — из <b id="sv-n">689</b> проверенных нами на <span id="sv-d">19.10.2026</span></p>
      <a class="btn btn-acc" href="/proverka-sajta/" data-goal="sv_info_proverka">Проверить свой сайт бесплатно <span class="arrow">→</span></a></div>
    <div class="sv-bars" id="sv-bars">
      <div class="sv-bar" data-code="consent_not_separate"><span>Согласие не отдельным документом</span><i style="--w:28%"></i><b>28%</b></div>
      <div class="sv-bar" data-code="foreign_trackers"><span>Google Analytics — данные уходят за границу</span><i style="--w:25%"></i><b>25%</b></div>
      <div class="sv-bar" data-code="form_no_consent"><span>Форма заявки без согласия</span><i style="--w:17%"></i><b>17%</b></div>
      <div class="sv-bar" data-code="no_policy"><span>Нет политики обработки данных</span><i style="--w:8%"></i><b>8%</b></div>
      <div class="sv-bar" data-code="meta_logo" hidden><span>Значки Instagram / Facebook</span><i style="--w:0%"></i><b>0%</b></div>
      <div class="sv-bar" data-code="whatsapp" hidden><span>Кнопка WhatsApp, которая не работает в РФ</span><i style="--w:0%"></i><b>0%</b></div>
      <div class="sv-bar" data-code="hosting_risk"><span>Сайт за Cloudflare — может не открываться</span><i style="--w:3%"></i><b>3%</b></div>
    </div>
  </div>
  <div class="sv-flow rv"><div class="kicker" style="margin-bottom:14px">Как работаем — без риска для вас</div><ol>
    <li><b>Бесплатная проверка</b><span>законы, техника, доступность в России</span></li>
    <li><b>Отчёт</b><span>что не так, на какой странице и почему</span></li>
    <li><b>Бесплатное демо</b><span>новый дизайн на вашем же контенте</span></li>
    <li><b>Делаем</b><span>быстро: от 999 ₽ и от пары дней</span></li>
    <li><b>Сопровождаем</b><span>обновления, законы, доступность</span></li></ol></div>
  <div class="sv-prices rv"><a href="/proverka-sajta/"><b>0 ₽</b><span>проверка сайта</span></a><a href="/proverka-sajta/#order"><b>999 ₽</b><span>документы по 152-ФЗ</span></a>
    <a href="/proverka-sajta/#order"><b>1 999 ₽</b><span>перенос с Tilda</span></a><a href="/services/redesign/"><b>Демо бесплатно</b><span>редизайн сайта</span></a></div>
  </div></section>
  <script>fetch('https://proverka.rebornlab.ru/stats.json').then(function(r){return r.json()}).then(function(d){if(!d||!d.checked)return;
  document.getElementById('sv-pct').textContent=d.violations_pct;document.getElementById('sv-n').textContent=d.checked;document.getElementById('sv-d').textContent=d.date;
  d.items.forEach(function(it){var el=document.querySelector('.sv-bar[data-code="'+it.code+'"]');if(!el)return;el.hidden=!it.pct;el.querySelector('i').style.setProperty('--w',it.pct+'%');el.querySelector('b').textContent=it.pct+'%'})}).catch(function(){})</script>
  <div class="wrap"><a class="pv-promo rv" href="/proverka-sajta/" data-goal="promo_proverka_services"><span class="pv-new">Новое</span><span class="pv-promo-t"><b>Проверим ваш сайт на штрафы по 152-ФЗ — бесплатно</b><span>Формы без согласия, Google Analytics, политика — штраф до 6 млн ₽. Документы под сайт — 999 ₽, перенос с Tilda — 1 999 ₽.</span></span><span class="btn btn-acc">Проверить сайт <span class="arrow">→</span></span></a><div class="caps">${SERVICES.map((s) => `<a class="cap rv" href="/services/${s.slug}/"><div class="sv-top">${svIcon(s)}<span class="code">${s.code} · ${esc(s.short)}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.lead)}</p>${svPains(s)}<ul>${s.items.slice(0, 4).map((i) => `<li>${esc(i)}</li>`).join('')}</ul><span class="card-link">Подробнее <span class="arrow">→</span></span></a>`).join('')}
  <a class="cap ask rv" href="/contact/"><span class="code">06</span><h3>Другая задача</h3><p>Опишите её — предложим решение.</p></a></div></div>
  <section class="sec"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Не знаете, что выбрать? <em>Опишите задачу.</em></h2>${leadForm('f-svc')}</div></div></section>`,
}))
for (const s of SERVICES) {
  const proofs = s.proof.map((k) => byslug[k]).filter(Boolean)
  write(`services/${s.slug}/index.html`, shell({
    title: `${s.seoTitle} — REBORN LAB`,
    description: s.lead,
    canonical: `/services/${s.slug}/`, current: '/services/',
    jsonLd: [crumbsLd([['Главная', '/'], ['Услуги', '/services/'], [s.title, `/services/${s.slug}/`]]),
      { '@context': 'https://schema.org', '@type': 'Service', name: s.seoTitle, description: s.lead, provider: { '@type': 'Organization', name: 'REBORN LAB', url: SITE.url }, areaServed: 'RU', serviceType: s.title },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: s.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
    body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Услуги', '/services/'], [s.title, '']])}<div class="kicker sv-k" style="margin-top:18px">${svIcon(s)} ${s.code} · ${esc(s.short)}</div><h1>${esc(s.seoTitle)}</h1><p class="sub">${esc(s.lead)}</p>${svPains(s).replace('sv-pain', 'sv-pain big')}<p style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">${s.slug === 'site-fix' ? '<a class="btn btn-acc" href="/proverka-sajta/" data-goal="cta_service_proverka">Проверить сайт бесплатно <span class="arrow">→</span></a><a class="btn btn-ghost" href="#task">Обсудить задачу</a>' : s.slug === 'redesign' ? '<a class="btn btn-acc" href="#task" data-goal="cta_service_demo">Получить бесплатное демо <span class="arrow">→</span></a>' : '<a class="btn btn-acc" href="#task" data-goal="cta_service">Обсудить задачу <span class="arrow">→</span></a>'}</p></div>
    <section class="sec" style="padding-top:30px"><div class="wrap"><div class="kicker rv">Что входит</div><div class="wants rv">${s.items.map((i) => `<span>${esc(i)}</span>`).join('')}</div></div></section>
    ${proofs.length ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">Доказательства</div><h2>Как мы это <em>уже делали</em></h2></div></div><div class="grid-proj">${proofs.map((p) => projCard(p)).join('')}</div></div></section>` : ''}
    <section class="sec" style="padding-top:0"><div class="wrap" style="max-width:860px"><div class="kicker rv">Частые вопросы</div><div class="faq rv">${s.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>
    <section class="sec" id="task" style="padding-top:0"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Расскажите, <em>что нужно</em></h2>${leadForm('f-' + s.slug)}</div></div></section>`,
  }))
}


// ---------- ПРОВЕРКА САЙТА (лендинг, 19.10.2026) ----------
{
  const CHECKS = [
    ['Форма без согласия на обработку данных', 'Имя и телефон собираются, а галочки и текста согласия нет — самое частое нарушение.', '300–700 тыс. ₽', 'ч. 2 ст. 13.11 КоАП'],
    ['Согласие не отдельным документом', 'С 1 сентября 2025 года согласие должно быть отдельно от политики. Галочка «согласен с политикой» уже не подходит.', '300–700 тыс. ₽', 'ч. 2 ст. 13.11 КоАП'],
    ['Google Analytics, пиксель Facebook', 'Данные посетителей записываются в зарубежные базы — РКН считает это нарушением требования о локализации.', '1–6 млн ₽', 'ч. 8 ст. 13.11 КоАП'],
    ['Нет уведомления в Роскомнадзор', 'Прежде чем собирать данные, оператор подаёт уведомление в РКН. Проверим по реестру при подготовке документов.', '100–300 тыс. ₽', 'ч. 10 ст. 13.11 КоАП'],
    ['Нет политики обработки данных', 'Документ обязан быть опубликован и доступен с сайта — не спрятан и не только в PDF без ссылки.', '30–60 тыс. ₽', 'ч. 3 ст. 13.11 КоАП'],
    ['Форма без https', 'Данные из формы идут по сети открытым текстом. Если утекут данные 1000+ человек — штраф по числу пострадавших.', '3–5 млн ₽', 'ч. 12 ст. 13.11 КоАП'],
  ]
  const PRICES = [
    ['0 ₽', 'Проверка', ['отчёт по вашему сайту', 'что нарушено и где именно', 'суммы штрафов по КоАП'], false],
    ['999 ₽', 'Документы под ваш сайт', ['политика обработки данных', 'отдельное согласие', 'текст для форм и cookie', 'инструкция для Tilda, WordPress, Битрикс'], true],
    ['1 999 ₽', 'Перенос с Tilda', ['тот же дизайн и адрес', 'бесплатный хостинг', 'заявки на почту или в Telegram', 'Tilda больше не платить'], false],
  ]
  const FAQ = [
    ['Откуда суммы штрафов?', 'Из статьи 13.11 КоАП РФ в действующей редакции (с изменениями от 30.05.2025). В отчёте у каждого пункта указана часть статьи — можно проверить самостоятельно.'],
    ['Это юридическая консультация?', 'Нет. Это техническая проверка открытых страниц сайта и готовые типовые документы. Если у вас сложная обработка данных (медицина, биометрия, большие базы клиентов) — советуем показать документы юристу.'],
    ['Как вы нашли мой сайт и почему написали?', 'Мы проверяем сайты из открытых источников и пишем один раз, только если нашли конкретные нарушения. Повторных писем и рассылок нет.'],
    ['Что если всё уже в порядке?', 'Тогда отчёт так и покажет — в блоке «Что уже в порядке». Платить ни за что не нужно.'],
    ['Куда переезжает сайт с Tilda и не пропадёт ли он?', 'Сайт выгружается целиком и размещается на бесплатном хостинге со стабильным доступом из России, адрес остаётся вашим. Формы заявок настраиваем заново. Цена 1 999 ₽ — для лендинга и небольшого сайта; корзину, оплату и личный кабинет считаем отдельно.'],
    ['Почему мой сайт может не открываться у клиентов?', 'В 2026 году мобильные операторы ограничивают зарубежные сети (Cloudflare, Vercel и другие): страница начинает грузиться и обрывается. Онлайн-сервисы проверки этого не видят. В отчёте отмечаем, если сайт в зоне риска.'],
  ]
  const css = `<style>
.pv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.pv-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:22px}
.pv-card h3{font-size:19px;margin:0 0 8px}.pv-card p{margin:0;color:var(--muted);font-size:15px}.pv-fine{margin-top:14px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pv-fine b{color:#ff6b6b;font-size:22px}.pv-fine span{font-family:var(--mono);font-size:12px;color:var(--muted)}
.pv-price{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:26px;display:flex;flex-direction:column;gap:10px}
.pv-price.hl{border-color:rgba(198,242,78,.5);background:linear-gradient(155deg,rgba(198,242,78,.10),rgba(198,242,78,.02))}
.pv-price .p{font-size:40px;font-weight:700;letter-spacing:-.02em}.pv-price ul{margin:4px 0 0;padding-left:18px;color:#c9c7c0}.pv-price li{margin:4px 0}
.pv-steps{counter-reset:s;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.pv-steps div{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:20px}
.pv-steps div::before{counter-increment:s;content:counter(s);display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--acc);color:#0b0c0d;font-weight:700;margin-bottom:10px}
.pv-steps p{margin:0;color:#c9c7c0;font-size:15px}.pv-me{display:flex;gap:20px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:22px}
.pv-me img{width:88px;height:88px;border-radius:50%;object-fit:cover;flex:none}.pv-me p{margin:4px 0 0;color:#c9c7c0}
.pv-calc{font-family:var(--mono);font-size:14px;color:var(--muted);margin-top:8px}
.pv-price{min-height:100%}.pv-prod{display:grid;gap:10px;margin:18px 0 6px}.pv-prod label{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;cursor:pointer;color:#c9c7c0;font-size:15px}
.pv-prod label:has(input:checked){border-color:rgba(198,242,78,.6)}.pv-prod b{color:var(--text);font-size:16px}.pv-prod input{margin-top:4px;accent-color:#c6f24e}
.pv-order input[type=text],.pv-order input[type=email]{min-height:52px;border-radius:14px;border:1px solid var(--line-2);background:var(--bg);color:var(--text);padding:0 16px;font:inherit}
.pv-alt{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:22px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted)}
@media (max-width:900px){.pv-grid,.pv-steps{grid-template-columns:1fr 1fr}}@media (max-width:620px){.pv-grid,.pv-steps{grid-template-columns:1fr}.pv-me{flex-direction:column;text-align:center}}
</style>`
  const form = (id) => `<form data-lead id="${id}" novalidate>
    <label class="sr" for="${id}-t">Адрес сайта</label>
    <textarea class="ym-disable-keys" id="${id}-t" name="text" rows="2" placeholder="Адрес вашего сайта, например mysite.ru — и что нужно: проверка, документы или перенос с Tilda"></textarea>
    <div class="form-row"><label class="sr" for="${id}-c">Контакт</label><input class="ym-disable-keys" type="text" id="${id}-c" name="contact" placeholder="Telegram, телефон или email — куда прислать отчёт" style="flex:1;min-width:220px"></div>
    <input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
    <label class="agree"><input type="checkbox" name="agree" required> <span>Даю <a href="/consent/" target="_blank">согласие на обработку персональных данных</a> и принимаю <a href="/privacy/" target="_blank">политику конфиденциальности</a></span></label>
    <div class="form-row"><button class="btn btn-acc" type="submit" data-goal="lead_proverka" data-label="Проверить сайт бесплатно →">Проверить сайт бесплатно <span class="arrow">→</span></button></div>
    <p class="ok-msg">Получили ✓ Проверим сайт и пришлём отчёт по указанному контакту.</p>
    <p class="err-msg">Отметьте согласие на обработку данных — без него мы не можем принять заявку.</p>
  </form>`
  write('proverka-sajta/index.html', shell({
    title: 'Проверка сайта на штрафы по 152-ФЗ — бесплатно | REBORN LAB',
    description: 'Бесплатно проверим сайт на нарушения закона о персональных данных: формы без согласия, Google Analytics, политика, уведомление в РКН. Документы под ваш сайт — 999 ₽.',
    canonical: '/proverka-sajta/', current: '/services/',
    jsonLd: [crumbsLd([['Главная', '/'], ['Услуги', '/services/'], ['Проверка сайта', '/proverka-sajta/']]),
      { '@context': 'https://schema.org', '@type': 'Service', name: 'Проверка сайта на соответствие 152-ФЗ', provider: { '@type': 'Organization', name: 'REBORN LAB', url: SITE.url }, areaServed: 'RU',
        offers: [{ '@type': 'Offer', name: 'Документы под сайт', price: '999', priceCurrency: 'RUB' }, { '@type': 'Offer', name: 'Перенос с Tilda', price: '1999', priceCurrency: 'RUB' }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
    body: `${css}<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Услуги', '/services/'], ['Проверка сайта', '']])}
  <div class="kicker" style="margin-top:18px">Проверка сайта · 152-ФЗ · доступность в России</div>
  <h1>Штраф за сайт — <span style="color:var(--acc)">до 6 млн ₽</span>. Проверим бесплатно</h1>
  <p class="sub">С 30 мая 2025 года штрафы за персональные данные выросли в десятки раз, а Роскомнадзор проверяет сайты автоматически. Найдём, что нарушено на вашем сайте, и исправим за 999 ₽.</p>
  <p style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-acc" href="#task" data-goal="cta_proverka">Проверить сайт <span class="arrow">→</span></a><a class="btn btn-ghost" href="#checks">Что проверяем</a></p></div>
  <section class="sec" id="checks" style="padding-top:20px"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">Что проверяем</div><h2>Шесть нарушений, за которые <em>штрафуют чаще всего</em></h2></div></div>
  <div class="pv-grid">${CHECKS.map(([t, d, f, law]) => `<div class="pv-card rv"><h3>${esc(t)}</h3><p>${esc(d)}</p><div class="pv-fine"><b>${f}</b><span>${law}</span></div></div>`).join('')}</div>
  <p class="pv-calc rv">Суммы — для организаций, по действующей редакции ст. 13.11 КоАП РФ. Для ИП по ряду составов меньше.</p></div></section>
  <section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">И ещё</div><h2>Ваш сайт <em>открывается у клиентов?</em></h2></div></div>
  <div class="pv-card rv" style="max-width:860px"><p style="color:#c9c7c0;font-size:17px">В 2026 году мобильный интернет в России ограничивают в десятках регионов, а сети Cloudflare, Vercel и похожие операторы режут: страница начинает грузиться и обрывается. Онлайн-проверки доступности этого не видят — они смотрят не с мобильного интернета. Мы проверяем, где на самом деле размещён сайт, и если он в зоне риска — переносим туда, где он открывается.</p></div></div></section>
  <section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">Как это работает</div><h2>Четыре шага, <em>без созвонов</em></h2></div></div>
  <div class="pv-steps rv"><div><p>Присылаете адрес сайта — или мы уже прислали вам отчёт на почту.</p></div><div><p>Смотрите отчёт: что нарушено, на какой странице, какой штраф.</p></div><div><p>Заказываете документы за 999 ₽ — готовим под ваш сайт в течение дня.</p></div><div><p>Вставляете по инструкции за 15 минут. Нет времени — внедрим сами.</p></div></div></div></section>
  <section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">Цены</div><h2>Без абонентской платы — <em>один раз</em></h2></div></div>
  <div class="pv-grid">${PRICES.map(([p, t, items, hl], i) => `<div class="pv-price rv${hl ? ' hl' : ''}"><div class="kicker">${esc(t)}</div><div class="p">${p}</div><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div style="margin-top:auto;padding-top:10px">${i === 0 ? '<a class="btn btn-ghost" href="#task">Проверить бесплатно</a>' : `<a class="btn ${hl ? 'btn-acc' : 'btn-ghost'}" href="#order" data-product="${i === 1 ? 'docs' : 'tilda'}" data-goal="cta_pay_${i === 1 ? 'docs' : 'tilda'}">Оплатить ${p}</a>`}</div></div>`).join('')}</div>
  <p class="pv-calc rv">Tilda стоит 500–1250 ₽ в месяц, то есть 6–15 тыс. ₽ в год. Перенос за 1 999 ₽ окупается за 3–4 месяца.</p></div></section>
  <section class="sec" id="order" style="padding-top:0"><div class="wrap" style="max-width:860px"><div class="final-box rv">
  <h2 style="font-size:clamp(28px,3.6vw,44px)">Заказать — <em>как удобнее</em></h2>
  <form class="pv-order" method="post" action="https://proverka.rebornlab.ru/pay">
    <div class="pv-prod"><label><input type="radio" name="product" value="docs" checked> <span><b>Документы под сайт — 999 ₽</b><br>политика, согласие, тексты для форм и cookie, инструкция</span></label>
    <label><input type="radio" name="product" value="tilda"> <span><b>Перенос с Tilda — 1 999 ₽</b><br>тот же сайт на бесплатном хостинге, заявки на почту или в Telegram</span></label></div>
    <div class="form-row"><input class="ym-disable-keys" type="text" name="site" required placeholder="Адрес сайта, например mysite.ru" style="flex:1;min-width:220px"><input class="ym-disable-keys" type="email" name="email" required placeholder="Почта — сюда пришлём документы" style="flex:1;min-width:220px"></div>
    <div class="form-row"><input class="ym-disable-keys" type="text" name="contact" placeholder="Telegram или телефон — по желанию" style="flex:1;min-width:220px"></div>
    <input type="hidden" name="t" value=""><input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
    <label class="agree"><input type="checkbox" name="agree" required> <span>Даю <a href="/consent-order/" target="_blank">согласие на обработку персональных данных для заказа</a> и принимаю <a href="/privacy/" target="_blank">политику обработки персональных данных</a></span></label>
    <div class="form-row"><button class="btn btn-acc" type="submit" data-goal="pay_submit">Перейти к оплате <span class="arrow">→</span></button></div>
    <p class="pv-calc" style="margin-top:12px">Оплата картой или СБП через ЮKassa. Документы пришлём на почту в течение рабочего дня.${HAS_SELLER ? ' Оплачивая, вы принимаете <a href="/oferta/">публичную оферту</a>.' : ''}</p>
  </form>
  <div class="pv-alt"><span>Или напишите — ответим и оформим сами:</span><a class="btn btn-ghost" href="https://t.me/Reborn_Lab" target="_blank" rel="noopener" data-goal="order_tg">Telegram</a><a class="btn btn-ghost" href="mailto:balibudda1@gmail.com?subject=%D0%9F%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0%20%D1%81%D0%B0%D0%B9%D1%82%D0%B0" data-goal="order_mail">Почта</a></div>
  </div></div></section>
  <script>(function(){var q=new URLSearchParams(location.search),f=document.querySelector('.pv-order');if(!f)return;
  if(q.get('site'))f.site.value=q.get('site');if(q.get('t'))f.t.value=q.get('t');
  var pick=function(v){var r=f.querySelector('input[name=product][value="'+v+'"]');if(r)r.checked=true};if(q.get('p'))pick(q.get('p'));
  document.querySelectorAll('[data-product]').forEach(function(a){a.addEventListener('click',function(){pick(a.getAttribute('data-product'))})});
  f.addEventListener('submit',function(e){if(!f.agree.checked){e.preventDefault();f.classList.add('need-agree');f.agree.focus()}});})();</script>
  <section class="sec" style="padding-top:0"><div class="wrap" style="max-width:860px"><div class="pv-me rv"><img src="/assets/nick.jpg" alt="Николай Чечельницкий" width="88" height="88" loading="lazy"><div><b style="font-size:19px">Николай Чечельницкий</b><p>Занимаюсь сайтами с 2010 года. REBORN LAB — цифровая лаборатория: сайты, сервисы, AI и автоматизация. Проверку делает наша программа, документы и перенос — мы сами.</p></div></div></div></section>
  <section class="sec" style="padding-top:0"><div class="wrap" style="max-width:860px"><div class="kicker rv">Частые вопросы</div><div class="faq rv">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>
  <section class="sec" id="task" style="padding-top:0"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Проверим ваш сайт — <em>бесплатно</em></h2>${form('f-proverka')}</div></div></section>`,
  }))
}

// ---------- PROJECTS ----------
write('projects/index.html', shell({
  title: 'Проекты REBORN LAB — реальные продукты, сайты и сервисы',
  description: 'Реальные проекты REBORN LAB: AI-продукт с приложением, справочники на сотни страниц, SaaS с платежами, Telegram-сервисы и сайты. Задача, решение, стек.',
  canonical: '/projects/', current: '/projects/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Проекты', '/projects/']])],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Проекты', '/projects/']])}<h1>Made by <span style="color:var(--acc)">Reborn Lab</span></h1><p class="sub">Только реальные проекты: что было нужно, что сделали и на чём. Многие работают прямо сейчас — по ссылке можно зайти.</p></div>
  <div class="wrap"><div class="grid-proj">${projCard(PROJECTS[0], true)}${PROJECTS.slice(1).map((p) => projCard(p)).join('')}</div></div>
  <section class="sec"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Хотите так же? <em>Покажите задачу.</em></h2>${leadForm('f-proj', 'Показать задачу')}</div></div></section>`,
}))
for (const p of PROJECTS) {
  write(`projects/${p.slug}/index.html`, shell({
    title: `${p.name} — кейс REBORN LAB`,
    description: p.lead,
    canonical: `/projects/${p.slug}/`, current: '/projects/', ogType: 'article', noindex: !!p.private,
    image: p.image ? `/assets/projects/${p.image}` : '/assets/og.jpg',
    jsonLd: p.private ? [] : [crumbsLd([['Главная', '/'], ['Проекты', '/projects/'], [p.name, `/projects/${p.slug}/`]]),
      { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.name, description: p.lead, url: p.url || undefined, creator: { '@type': 'Organization', name: 'REBORN LAB' }, keywords: p.stack.join(', ') }],
    body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Проекты', '/projects/'], [p.name, '']])}<div class="kicker" style="margin-top:18px">${esc(p.kind)}${p.status ? ' · ' + esc(p.status) : ''}</div><h1>${esc(p.name)}</h1><p class="sub">${esc(p.lead)}</p>
      ${p.url ? `<p style="margin-top:24px"><a class="btn btn-ghost" href="${p.url}" target="_blank" rel="noopener" data-goal="visit_${p.slug}">Открыть проект <span class="arrow">↗</span></a></p>` : ''}</div>
    <div class="wrap">${p.image ? `<div class="cover rv"><img src="/assets/projects/${p.image}" alt="${esc(p.name)}" width="1200" height="750"></div>` : ''}
      <div class="case">
        <div class="rv"><h3>Задача</h3><p style="margin:0;color:#d9d7d0">${esc(p.task)}</p></div>
        <div class="rv"><h3>Результат</h3><p style="margin:0;color:#d9d7d0">${esc(p.result)}</p></div>
        <div class="full rv"><h3>Решение</h3><ul>${p.solution.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="full rv"><h3>Stack</h3><div class="tags">${p.stack.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>
      </div></div>
    <section class="sec" style="padding-top:30px"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Нужно что-то похожее? <em>Обсудим.</em></h2>${leadForm('f-' + p.slug, 'Обсудить идею')}</div></div></section>`,
  }))
}

// ---------- JOURNAL ----------
write('journal/index.html', shell({
  title: 'Журнал REBORN LAB — AI, автоматизация, сайты, SEO и GEO',
  description: 'Практические разборы: как автоматизировать заявки, внедрить AI, сделать сайт, который продаёт, и попасть в ответы AI-поисковиков. Без воды.',
  canonical: '/journal/', current: '/journal/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Журнал', '/journal/']])],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Журнал', '/journal/']])}<div class="kicker" style="margin-top:18px">Lab notes</div><h1>Журнал <span style="color:var(--acc)">лаборатории</span></h1><p class="sub">Разборы, кейсы и инструкции — то, что сами применяем в проектах.</p></div>
  <div class="wrap"><div class="posts">${POSTS.map(postCard).join('') || '<p class="muted">Скоро здесь появятся первые материалы.</p>'}</div></div>
  <section class="sec"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Узнали свою задачу? <em>Разберём.</em></h2>${leadForm('f-jr')}</div></div></section>`,
}))
for (const p of POSTS) {
  const related = POSTS.filter((x) => x.slug !== p.slug).sort((a, b) => (a.category === p.category ? -1 : 0) - (b.category === p.category ? -1 : 0)).slice(0, 3)
  write(`journal/${p.slug}/index.html`, shell({
    title: `${p.title} — REBORN LAB`,
    description: p.description,
    canonical: `/journal/${p.slug}/`, current: '/journal/', ogType: 'article',
    jsonLd: [crumbsLd([['Главная', '/'], ['Журнал', '/journal/'], [p.title, `/journal/${p.slug}/`]]),
      { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, datePublished: p.date, dateModified: p.updated || p.date, inLanguage: 'ru', author: { '@type': 'Organization', name: 'REBORN LAB', url: SITE.url }, publisher: { '@type': 'Organization', name: 'REBORN LAB', logo: { '@type': 'ImageObject', url: SITE.url + '/assets/logo.png' } }, mainEntityOfPage: SITE.url + `/journal/${p.slug}/`, image: SITE.url + '/assets/og.jpg', articleSection: JOURNAL_CATEGORIES[p.category] || p.category, wordCount: p.words }],
    body: `<article><div class="wrap page-hd">${crumbs([['Главная', '/'], ['Журнал', '/journal/'], [p.title, '']])}<div class="kicker" style="margin-top:18px">${esc(JOURNAL_CATEGORIES[p.category] || p.category)} · ${ru(p.date)} · ${Math.max(1, Math.round(p.words / 180))} мин</div><h1 style="max-width:20ch">${esc(p.title)}</h1><p class="sub">${esc(p.description)}</p></div>
    <div class="wrap"><div class="prose">${p.html}</div></div></article>
    <section class="sec"><div class="wrap"><div class="final-box rv"><div class="kicker">Применим к вашей задаче</div><h2 style="font-size:clamp(30px,4vw,52px)">Хотите так же? <em>Разберём бесплатно.</em></h2>${leadForm('f-post')}</div></div></section>
    ${related.length ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="kicker rv">Читайте также</div><div class="posts" style="margin-top:18px">${related.map(postCard).join('')}</div></div></section>` : ''}`,
  }))
}

// ---------- ABOUT / CONTACT ----------
write('about/index.html', shell({
  title: 'О лаборатории — REBORN LAB',
  description: 'REBORN LAB — цифровая лаборатория: берём задачу человека или бизнеса и собираем под неё решение — сайт, сервис, AI, автоматизацию, SEO.',
  canonical: '/about/', current: '/about/',
  jsonLd: [ORG, crumbsLd([['Главная', '/'], ['О лаборатории', '/about/']])],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['О лаборатории', '']])}<h1>Место, куда можно принести <span style="color:var(--acc)">цифровую проблему</span></h1><p class="sub">И получить работающий продукт.</p></div>
  <div class="wrap"><div class="prose">
  <p>REBORN LAB — не веб-студия с прайсом на «сайт за N рублей». Мы работаем как лаборатория: сначала разбираемся в задаче, потом подбираем решение — и только потом пишем код.</p>
  <p>Иногда задаче нужен лендинг. Иногда — AI-ассистент, который разгружает менеджеров. Иногда — Telegram-бот, который полностью заменяет CRM. А иногда — всё вместе: продукт с приложением, оплатами и сотнями страниц, которые приводят людей из поиска. Мы такие продукты уже собирали — <a href="/projects/">посмотрите проекты</a>.</p>
  <h2>Как мы работаем</h2>
  <ol><li><strong>Разбор.</strong> Вы описываете задачу обычными словами — мы задаём вопросы и предлагаем варианты.</li><li><strong>Прототип.</strong> Начинаем с малого: быстро показываем, как это будет работать.</li><li><strong>Сборка.</strong> Дизайн, разработка, AI, интеграции — одной командой, без потерь на стыках.</li><li><strong>Запуск и рост.</strong> Аналитика, SEO, контент — чтобы продукт находили и он развивался.</li></ol>
  <h2>Чего мы не делаем</h2>
  <ul><li>Не придумываем клиентов, награды и цифры — в портфолио только реальные проекты.</li><li>Не продаём пакеты «всё включено» — начинаем с того, что нужно сейчас.</li><li>Не прячем технологии: вы знаете, на чём и как сделан ваш продукт.</li></ul>
  </div></div>
  <section class="sec"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Есть задача? <em>Давайте соберём.</em></h2>${leadForm('f-about', 'Обсудить идею')}</div></div></section>`,
}))
write('contact/index.html', shell({
  title: 'Обсудить проект — REBORN LAB',
  description: 'Опишите задачу или идею обычными словами — ответим лично и предложим решение. Telegram @Reborn_Lab.',
  canonical: '/contact/', current: '/contact/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Контакты', '/contact/']])],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Контакты', '']])}<h1>Что хотите <span style="color:var(--acc)">сделать?</span></h1><p class="sub">Выберите направление и расскажите подробнее. Не нужно ТЗ — достаточно описать задачу своими словами.</p></div>
  <div class="wrap"><div class="contact-grid" style="margin-top:0"><div class="ask-box" style="position:static">${leadForm('f-contact', 'Запустить проект')}</div>
  <div class="contact-side"><div><div class="kicker">Напрямую</div><p style="font-size:22px;margin:8px 0 0"><a href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener" data-goal="telegram">Telegram @${SITE.telegram}</a></p></div><p>Отвечаем лично. Сначала разбираемся в задаче, потом предлагаем решение, срок и стоимость.</p></div></div></div>
  <div style="height:80px"></div>`,
}))


// ---------- LEGAL (152-ФЗ) ----------
const LEGAL_DATE = '19.10.2026'
const OPERATOR = SITE.operator
  ? `${SITE.operator}${SITE.operatorInn ? ', ИНН ' + SITE.operatorInn : ''}${SITE.operatorOgrn ? ', ОГРНИП ' + SITE.operatorOgrn : ''}${SITE.operatorAddress ? ', адрес: ' + SITE.operatorAddress : ''}`
  : 'владелец сайта rebornlab.ru (REBORN LAB)'
const PD_CONTACT = `Telegram <a href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener">@${SITE.telegram}</a> или почта <a href="mailto:${SITE.pdEmail}">${SITE.pdEmail}</a>`
const legalCss = '<style>.legal h2{font-size:22px;margin:30px 0 10px}.legal li{margin:6px 0}.legal table{border-collapse:collapse;width:100%;font-size:15px}.legal td,.legal th{border:1px solid var(--line-2);padding:8px 10px;vertical-align:top;text-align:left}</style>'
write('privacy/index.html', shell({
  title: 'Политика обработки персональных данных — REBORN LAB',
  description: 'Как REBORN LAB обрабатывает и защищает персональные данные: заявки, заказы и оплата, проверка сайтов, статистика посещений.',
  canonical: '/privacy/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Политика конфиденциальности', '/privacy/']])],
  body: `${legalCss}<div class="wrap page-hd legal" style="max-width:860px">${crumbs([['Главная', '/'], ['Политика конфиденциальности', '']])}<h1 style="font-size:clamp(32px,5vw,52px)">Политика обработки персональных данных</h1>
  <p class="sub">Редакция от ${LEGAL_DATE}. Документ определяет политику оператора в отношении обработки персональных данных по ст. 18.1 Федерального закона № 152-ФЗ «О персональных данных» и действует на сайтах rebornlab.ru и proverka.rebornlab.ru.</p>
  <h2>1. Оператор</h2>
  <p>Оператор персональных данных — ${esc(OPERATOR)}. Вопросы о данных, запросы и отзыв согласия: ${PD_CONTACT}.</p>
  <h2>2. Чьи данные, какие и зачем</h2>
  <table><tr><th>Кто</th><th>Какие данные</th><th>Цель</th><th>Основание</th><th>Срок</th></tr>
  <tr><td>Посетитель, отправивший заявку</td><td>контакт (Telegram, телефон или email), текст заявки, адрес сайта (если указан), IP-адрес, страница, дата и время</td><td>ответить на заявку, обсудить задачу, подготовить предложение; защита от спама</td><td>согласие (п. 1 ч. 1 ст. 6)</td><td>до достижения цели, не дольше 3 лет с последнего общения, или до отзыва согласия</td></tr>
  <tr><td>Заказчик (оплата услуги)</td><td>адрес сайта, email, контакт по желанию; сведения о платеже (сумма, статус, идентификатор платежа). Данные банковской карты мы не получаем — их обрабатывает ЮKassa</td><td>оформить и исполнить заказ, прислать документы, принять оплату, ответить на вопросы по заказу</td><td>согласие и исполнение договора (п. 1 и п. 5 ч. 1 ст. 6)</td><td>5 лет — для учёта расчётов; контакт — до отзыва согласия</td></tr>
  <tr><td>Посетитель сайта</td><td>cookie и данные о посещении через Яндекс Метрику: страницы, источник перехода, устройство, действия на странице (Вебвизор, без содержимого полей форм)</td><td>статистика и улучшение сайтов</td><td>согласие, данное кнопкой «Согласен»</td><td>по правилам Яндекс Метрики, не дольше 12 месяцев</td></tr>
  <tr><td>Получатель письма о проверке сайта</td><td>адрес электронной почты организации, опубликованный на её сайте; отметки об открытии письма и переходах по ссылкам; отказ от писем</td><td>одно сообщение владельцу сайта о результатах проверки; учёт отказов, чтобы больше не писать</td><td>см. раздел 4</td><td>отметки — 12 месяцев; адрес в списке «не писать» — бессрочно, только чтобы не писать повторно</td></tr></table>
  <p>Специальные категории данных (здоровье, убеждения и т. п.) и биометрию мы не запрашиваем и не обрабатываем — пожалуйста, не указывайте их в заявках.</p>
  <h2>3. Что мы делаем с данными</h2>
  <p>Сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача (предоставление доступа) лицам из раздела 5, блокирование, удаление и уничтожение — с использованием средств автоматизации. Данные не продаём, для рекламы третьим лицам не передаём, решений, порождающих юридические последствия, только на основе автоматической обработки не принимаем.</p>
  <h2>4. Проверка сайтов и письма владельцам</h2>
  <p>Сервис проверки сайтов (proverka.rebornlab.ru) автоматически просматривает открытые страницы сайтов организаций. Источники адресов сайтов — открытые данные (в том числе OpenStreetMap). Если находим нарушения, отправляем <b>одно</b> письмо на общий адрес организации, опубликованный на её сайте (например, info@…). Личные адреса сотрудников не используем. Повторных писем и рассылок нет. По ссылке в письме можно отказаться — адрес попадёт в список «не писать», и мы не напишем на него никогда.</p>
  <h2>5. Кому передаются данные</h2>
  <ul><li>ООО НКО «ЮМани» (сервис ЮKassa, Россия) — приём оплаты;</li>
  <li>ООО «Яндекс» (Россия) — Яндекс Метрика, после вашего согласия;</li>
  <li>хостинг-провайдеры серверов оператора (Нидерланды, Индонезия) — хранение заявок, заказов и работа сервиса проверки;</li>
  <li>GitHub, Inc. (США) — размещение сайта rebornlab.ru (технические журналы запросов);</li>
  <li>Telegram (ОАЭ) — пересылка заявок оператору и переписка, если вы пишете в Telegram;</li>
  <li>Google LLC (США) — почтовый ящик оператора, если вы пишете на почту.</li></ul>
  <h2>6. Трансграничная передача</h2>
  <p>Часть сервисов из раздела 5 находится за пределами России, поэтому обработка включает трансграничную передачу персональных данных. Она выполняется на основании вашего согласия и в объёме, необходимом для целей из раздела 2.</p>
  <h2>7. Как мы защищаем данные</h2>
  <ul><li>передача только по защищённому соединению (HTTPS);</li><li>доступ к данным — только у оператора, по ключам, без паролей в открытом виде; серверы закрыты от посторонних подключений;</li>
  <li>платёжные данные карты не попадают на наши серверы;</li><li>запись содержимого полей форм в Вебвизоре отключена;</li>
  <li>регулярное резервное копирование в зашифрованном виде;</li><li>данные удаляются по окончании сроков из раздела 2.</li></ul>
  <h2>8. Ваши права</h2>
  <p>Вы можете узнать, какие ваши данные у нас есть, потребовать уточнить, заблокировать или удалить их, отозвать согласие. Напишите: ${PD_CONTACT}. Ответим в течение 10 рабочих дней. Вы вправе обратиться в Роскомнадзор или в суд.</p>
  <h2>9. Cookie</h2>
  <p>Cookie используются для статистики посещений (Яндекс Метрика, включая Вебвизор) и подключаются только после нажатия «Согласен». Отключить cookie можно в настройках браузера — сайт продолжит работать.</p>
  <h2>10. Изменения</h2>
  <p>Политика может обновляться; актуальная редакция всегда на этой странице. Согласия: <a href="/consent/">для заявки</a>, <a href="/consent-order/">для заказа и оплаты</a>.</p></div>`,
}))
const consentPage = (slug, title, intro, data, purpose, extra) => write(`${slug}/index.html`, shell({
  title: `${title} — REBORN LAB`,
  description: `${title}: текст согласия на обработку персональных данных на сайтах rebornlab.ru и proverka.rebornlab.ru.`,
  canonical: `/${slug}/`,
  jsonLd: [crumbsLd([['Главная', '/'], [title, `/${slug}/`]])],
  body: `${legalCss}<div class="wrap page-hd legal" style="max-width:860px">${crumbs([['Главная', '/'], [title, '']])}<h1 style="font-size:clamp(32px,5vw,52px)">${title}</h1>
  <p class="sub">Редакция от ${LEGAL_DATE}. Отдельный документ согласия по ст. 9 Федерального закона № 152-ФЗ.</p>
  <p>${intro} я свободно, своей волей и в своём интересе даю конкретное, предметное, информированное, сознательное и однозначное согласие оператору — ${esc(OPERATOR)} — на обработку моих персональных данных на следующих условиях.</p>
  <ul><li><b>Данные:</b> ${data}</li><li><b>Цель:</b> ${purpose}</li>
  <li><b>Действия:</b> сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача (предоставление доступа) лицам, указанным в <a href="/privacy/">политике</a>, блокирование, удаление и уничтожение — с использованием средств автоматизации.</li>
  ${extra}
  <li><b>Трансграничная передача:</b> я согласен(на), что данные хранятся на серверах оператора в Нидерландах и Индонезии и могут передаваться оператору через Telegram (ОАЭ) и почтовый сервис Google (США), а сайт rebornlab.ru размещён на GitHub Pages (США).</li>
  <li><b>Срок:</b> до достижения цели обработки, но не дольше 3 лет с момента последнего общения (сведения о платежах — 5 лет), либо до отзыва согласия.</li>
  <li><b>Отзыв:</b> в любой момент, написав оператору: ${PD_CONTACT}. Данные будут удалены в течение 10 рабочих дней, кроме сведений, которые оператор обязан хранить по закону.</li></ul>
  <p>Подробнее — в <a href="/privacy/">политике обработки персональных данных</a>.</p></div>`,
}))
consentPage('consent', 'Согласие на обработку персональных данных', 'Отправляя заявку на сайте rebornlab.ru или proverka.rebornlab.ru и отмечая галочку согласия,',
  'контакт для связи (имя или ник в Telegram, телефон или адрес электронной почты), текст заявки, адрес сайта (если указан), а также IP-адрес, адрес страницы, дата и время отправки.',
  'рассмотрение заявки, связь со мной, обсуждение задачи, проверка указанного сайта и подготовка предложения; защита сайта от спама.', '')
consentPage('consent-order', 'Согласие на обработку данных при заказе', 'Оформляя заказ и оплату на сайте rebornlab.ru и отмечая галочку согласия,',
  'адрес сайта, адрес электронной почты, контакт для связи (если указан), сведения о заказе и платеже (сумма, статус, идентификатор платежа).',
  'оформление и исполнение заказа, приём оплаты, отправка документов и результатов работы на указанную почту, связь по вопросам заказа.',
  '<li><b>Оплата:</b> я согласен(на) на передачу сведений о заказе ООО НКО «ЮМани» (сервис ЮKassa) для приёма оплаты. Данные банковской карты вводятся на стороне ЮKassa, оператор их не получает.</li>')

// ---------- ОФЕРТА (появляется, только когда в data.mjs есть реквизиты: operator + operatorInn) ----------
if (HAS_SELLER) write('oferta/index.html', shell({
  title: 'Публичная оферта — REBORN LAB', description: 'Договор-оферта на услуги проверки сайта: документы по 152-ФЗ и перенос сайта с Tilda.', canonical: '/oferta/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Публичная оферта', '/oferta/']])],
  body: `${legalCss}<div class="wrap page-hd legal" style="max-width:860px">${crumbs([['Главная', '/'], ['Публичная оферта', '']])}<h1 style="font-size:clamp(32px,5vw,52px)">Публичная оферта</h1>
  <p class="sub">Редакция от ${LEGAL_DATE}. Предложение заключить договор оказания услуг (ст. 435, 437 ГК РФ).</p>
  <h2>1. Исполнитель</h2><p>${esc(OPERATOR)}. Связь: ${PD_CONTACT}.</p>
  <h2>2. Услуги и цены</h2><ul><li><b>Документы под сайт — 999 ₽:</b> политика обработки персональных данных, отдельное согласие, тексты для форм и уведомления о cookie, подготовленные для сайта заказчика, и инструкция по размещению.</li>
  <li><b>Перенос сайта с Tilda — 1 999 ₽:</b> выгрузка лендинга или небольшого сайта, размещение на бесплатном хостинге с сохранением дизайна и адреса, настройка форм заявок на почту или в Telegram. Сайты с корзиной, оплатой, личным кабинетом — по отдельной договорённости.</li></ul>
  <h2>3. Как заключается договор</h2><p>Договор заключён с момента оплаты заказа на странице <a href="/proverka-sajta/#order">rebornlab.ru/proverka-sajta</a>. Оплата — через ЮKassa (ООО НКО «ЮМани»).</p>
  <h2>4. Сроки и результат</h2><p>Документы — на указанную почту в течение 1 рабочего дня после оплаты. Перенос с Tilda — до 5 рабочих дней после получения доступа к сайту. Результат считается принятым, если в течение 5 дней после получения заказчик не прислал замечаний; замечания исправляем бесплатно.</p>
  <h2>5. Возврат</h2><p>Если услуга не оказана в срок — возвращаем всю сумму. Заказчик вправе отказаться от услуги в любой момент, оплатив фактически выполненную работу (ст. 32 Закона «О защите прав потребителей», ст. 782 ГК РФ). Возврат — тем же способом, что и оплата, в течение 10 дней после заявления.</p>
  <h2>6. Ответственность</h2><p>Документы — типовые, подготовленные под сайт заказчика; это не юридическая консультация. Исполнитель не отвечает за решения контролирующих органов, если заказчик не разместил документы или его фактическая обработка данных отличается от описанной им.</p>
  <h2>7. Персональные данные</h2><p>Обрабатываются по <a href="/privacy/">политике</a> и <a href="/consent-order/">согласию для заказа</a>.</p></div>`,
}))

write('404.html', shell({ title: 'Страница не найдена — REBORN LAB', description: 'Такой страницы нет.', canonical: '/404.html',
  body: `<div class="wrap page-hd"><div class="kicker">404</div><h1>Такой страницы <span style="color:var(--acc)">нет</span></h1><p class="sub">Зато есть <a href="/projects/" style="color:var(--acc)">проекты</a>, <a href="/journal/" style="color:var(--acc)">журнал</a> и <a href="/contact/" style="color:var(--acc)">форма для вашей задачи</a>.</p></div><div style="height:120px"></div>` }))

// ---------- assets, sitemap, robots, rss ----------
for (const d of ['assets', 'assets/projects']) mkdirSync(path.join(OUT, d), { recursive: true })
copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(OUT, 'assets/styles.css'))
copyFileSync(path.join(ROOT, 'src/main.js'), path.join(OUT, 'assets/main.js'))
for (const f of readdirSync(path.join(ROOT, 'src/assets/projects'))) copyFileSync(path.join(ROOT, 'src/assets/projects', f), path.join(OUT, 'assets/projects', f))
for (const f of ['favicon.svg', 'og.jpg', 'logo.png', 'svoya-liniya-logo.jpg', 'nick.jpg']) if (existsSync(path.join(ROOT, 'src/assets', f))) copyFileSync(path.join(ROOT, 'src/assets', f), path.join(OUT, 'assets', f))

const urls = [['/', today, '1.0'], ['/projects/', today, '0.9'], ['/services/', today, '0.9'], ['/journal/', POSTS[0]?.date || today, '0.8'], ['/about/', today, '0.5'], ['/contact/', today, '0.6'], ['/proverka-sajta/', today, '0.9'],
  ...SERVICES.map((s) => [`/services/${s.slug}/`, today, '0.8']), ...PROJECTS.filter((p) => !p.private).map((p) => [`/projects/${p.slug}/`, today, '0.7']), ...POSTS.map((p) => [`/journal/${p.slug}/`, p.updated || p.date, '0.7'])]
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, pr]) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`)
write('robots.txt', `User-agent: *\nAllow: /\n\n# AI-поисковики приветствуются (GEO)\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: YandexBot\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`)
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>REBORN LAB — Журнал</title><link>${SITE.url}/journal/</link><description>AI, автоматизация, сайты, SEO и GEO — практические разборы.</description><language>ru</language>\n${POSTS.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE.url}/journal/${p.slug}/</link><guid>${SITE.url}/journal/${p.slug}/</guid><pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}\n</channel></rss>\n`)
write('llms.txt', `# REBORN LAB\n\n> ${SITE.tagline}. Принесите задачу — соберём решение: сайты, веб-сервисы, AI-ассистенты и агенты, автоматизация, SEO/GEO, дизайн.\n\n## Услуги\n${SERVICES.map((s) => `- [${s.seoTitle}](${SITE.url}/services/${s.slug}/): ${s.lead}`).join('\n')}\n\n## Проекты\n${PROJECTS.filter((p) => !p.private).map((p) => `- [${p.name}](${SITE.url}/projects/${p.slug}/): ${p.lead}`).join('\n')}\n\n## Журнал\n${POSTS.map((p) => `- [${p.title}](${SITE.url}/journal/${p.slug}/): ${p.description}`).join('\n')}\n\n## Контакт\n- Telegram: https://t.me/${SITE.telegram}\n`)
writeFileSync(path.join(OUT, 'CNAME'), 'rebornlab.ru\n')
writeFileSync(path.join(OUT, '.nojekyll'), '')
console.log(`built: ${urls.length} urls · ${POSTS.length} posts · ${PROJECTS.length} projects · ${SERVICES.length} services`)
