// REBORN LAB static site generator — no dependencies. `node build.mjs` → writes the site into ./ (GitHub Pages root).
// Sources: src/data.mjs (projects, services…), content/journal/*.md (articles with front matter), src/styles.css, src/main.js.
// New article = new .md file in content/journal → `node build.mjs` → commit + push.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { SITE, PROJECTS, SERVICES, PROBLEMS, MARKET, START_SMALL, JOURNAL_CATEGORIES } from './src/data.mjs'

const ROOT = path.dirname(new URL(import.meta.url).pathname)
const OUT = ROOT
const GENERATED_DIRS = ['services', 'projects', 'journal', 'about', 'contact', 'assets']
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

const NAV = [['/projects/', 'Проекты'], ['/services/', 'Услуги'], ['/journal/', 'Журнал'], ['/about/', 'О лаборатории']]

function shell({ title, description, canonical, body, jsonLd = [], ogType = 'website', image = '/assets/og.jpg', current = '' }) {
  const url = SITE.url + canonical
  const metrika = SITE.metrikaId ? `<script>window.RL_METRIKA=${SITE.metrikaId};(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${SITE.metrikaId},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>` : ''
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
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
  <nav class="nav" aria-label="Основное меню">${NAV.map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <a class="hdr-cta" href="/contact/" data-goal="cta_header">Обсудить идею</a>
  <button class="burger" aria-label="Меню" aria-expanded="false">☰</button>
</div></header>
<main>
${body}
</main>
<footer class="ftr"><div class="wrap">
  <div>${LOGO}<p style="margin:14px 0 0;max-width:30em">Цифровые продукты · AI · Автоматизация · Разработка · SEO/GEO · Дизайн.<br>Принесите задачу — соберём решение.</p><p>© ${new Date().getFullYear()} REBORN LAB</p></div>
  <div><a href="/projects/">Проекты</a><a href="/services/">Услуги</a><a href="/journal/">Журнал</a><a href="/about/">О лаборатории</a><a href="/contact/">Контакты</a></div>
  <div><a href="https://t.me/${SITE.telegram}" rel="noopener" target="_blank">Telegram @${SITE.telegram}</a><a href="https://github.com/balibudda" rel="noopener" target="_blank">GitHub</a><a href="/rss.xml">RSS журнала</a></div>
</div></footer>
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
  return `<a class="proj rv${big ? ' big' : ''}" href="/projects/${p.slug}/" data-goal="project_${p.slug}">
    <div class="shot${p.image ? '' : ' empty'}">${p.status ? `<span class="status">${esc(p.status)}</span>` : ''}${shot}</div>
    <div class="body"><div class="kind">${esc(p.kind)}</div><h3>${esc(p.name)}</h3><p>${esc(p.lead)}</p>
      <div class="tags">${p.stack.slice(0, big ? 8 : 4).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
      <span class="card-link">Как сделано <span class="arrow">→</span></span></div></a>`
}
function leadForm(id, label = 'Разобрать задачу') {
  return `<form data-lead id="${id}" novalidate>
    <div class="chips" data-chips>${['Есть идея', 'Нужен сайт', 'Автоматизировать бизнес', 'Нужен AI', 'Нужно продвижение', 'Другая задача'].map((c) => `<button type="button" class="chip">${c}</button>`).join('')}</div>
    <label class="sr" for="${id}-t">Опишите задачу</label>
    <textarea id="${id}-t" name="text" placeholder="Опишите проблему или идею обычными словами. Например: «заявок много, менеджеры не успевают отвечать»"></textarea>
    <div class="form-row"><label class="sr" for="${id}-c">Контакт</label><input type="text" id="${id}-c" name="contact" placeholder="Telegram, телефон или email — как с вами связаться" style="flex:1;min-width:220px"></div>
    <input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
    <div class="form-row"><button class="btn btn-acc" type="submit" data-label="${label} →">${label} <span class="arrow">→</span></button><a class="btn btn-ghost" href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener" data-goal="telegram">Написать в Telegram</a></div>
    <p class="ok-msg">Получили ✓ Разберём задачу и ответим вам лично.</p>
    <p class="hint">Отвечаем лично. Без спама и обязательств — сначала разбираемся, потом предлагаем.</p>
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
    <div class="kicker">Digital laboratory · идея → система → продукт</div>
    <h1 id="h1">Скажите, что нужно. <em>Остальное соберём.</em></h1>
    <p class="sub">Сайты, веб-сервисы, AI, автоматизация, SEO и внутренние системы — придумываем и собираем под вашу задачу. Можно прийти без ТЗ: с идеей или с проблемой.</p>
    <div class="row">
      <a class="btn btn-acc" href="#task" data-goal="cta_hero">Разобрать задачу <span class="arrow">→</span></a>
      <a class="btn btn-ghost" href="#made">Что мы уже сделали</a>
    </div>
    <div class="hero-meta"><span><i>●</i> ${PROJECTS.length} реальных проектов</span><span>AI · Web · Automation · SEO/GEO · Design</span><span>от прототипа до продукта</span></div>
  </div>
</section>
<div class="rline"></div>

<section class="sec" id="made"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Made by Reborn Lab</div><h2>Уже работает <em>вживую</em></h2></div><p>Не макеты для портфолио, а продукты с пользователями, оплатами, приложениями и трафиком из поиска. Нажмите на проект — расскажем, как сделано.</p></div>
  <div class="grid-proj">
    ${projCard(featured[0], true)}
    ${featured.slice(1).map((p) => projCard(p)).join('\n')}
    ${projCard(byslug['telegram-subscription'])}
  </div>
  <p style="margin-top:26px" class="rv"><a class="btn btn-ghost" href="/projects/">Все проекты <span class="arrow">→</span></a></p>
</div></section>

<section class="sec" style="padding-top:20px"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Что мы можем</div><h2>Не одна технология, <em>а целая лаборатория</em></h2></div><p>Под задачу собираем нужную связку: где-то хватит сайта, где-то нужен AI, где-то — автоматизация и интеграции. Чаще всего — всё вместе.</p></div>
  <div class="caps">
    ${SERVICES.map((s) => `<a class="cap rv" href="/services/${s.slug}/"><span class="code">${s.code}</span><h3>${esc(s.title)}</h3><p>${esc(s.lead)}</p><ul>${s.items.slice(0, 4).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></a>`).join('\n')}
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
  <div class="wrap"><div class="caps">${SERVICES.map((s) => `<a class="cap rv" href="/services/${s.slug}/"><span class="code">${s.code}</span><h3>${esc(s.title)}</h3><p>${esc(s.lead)}</p><ul>${s.items.slice(0, 5).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></a>`).join('')}
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
    body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Услуги', '/services/'], [s.title, '']])}<div class="kicker" style="margin-top:18px">${s.code} · ${esc(s.short)}</div><h1>${esc(s.seoTitle)}</h1><p class="sub">${esc(s.lead)}</p><p style="margin-top:26px"><a class="btn btn-acc" href="#task" data-goal="cta_service">Обсудить задачу <span class="arrow">→</span></a></p></div>
    <section class="sec" style="padding-top:30px"><div class="wrap"><div class="kicker rv">Что входит</div><div class="wants rv">${s.items.map((i) => `<span>${esc(i)}</span>`).join('')}</div></div></section>
    ${proofs.length ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">Доказательства</div><h2>Как мы это <em>уже делали</em></h2></div></div><div class="grid-proj">${proofs.map((p) => projCard(p)).join('')}</div></div></section>` : ''}
    <section class="sec" style="padding-top:0"><div class="wrap" style="max-width:860px"><div class="kicker rv">Частые вопросы</div><div class="faq rv">${s.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>
    <section class="sec" id="task" style="padding-top:0"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Расскажите, <em>что нужно</em></h2>${leadForm('f-' + s.slug)}</div></div></section>`,
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
    canonical: `/projects/${p.slug}/`, current: '/projects/', ogType: 'article',
    image: p.image ? `/assets/projects/${p.image}` : '/assets/og.jpg',
    jsonLd: [crumbsLd([['Главная', '/'], ['Проекты', '/projects/'], [p.name, `/projects/${p.slug}/`]]),
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

write('404.html', shell({ title: 'Страница не найдена — REBORN LAB', description: 'Такой страницы нет.', canonical: '/404.html',
  body: `<div class="wrap page-hd"><div class="kicker">404</div><h1>Такой страницы <span style="color:var(--acc)">нет</span></h1><p class="sub">Зато есть <a href="/projects/" style="color:var(--acc)">проекты</a>, <a href="/journal/" style="color:var(--acc)">журнал</a> и <a href="/contact/" style="color:var(--acc)">форма для вашей задачи</a>.</p></div><div style="height:120px"></div>` }))

// ---------- assets, sitemap, robots, rss ----------
for (const d of ['assets', 'assets/projects']) mkdirSync(path.join(OUT, d), { recursive: true })
copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(OUT, 'assets/styles.css'))
copyFileSync(path.join(ROOT, 'src/main.js'), path.join(OUT, 'assets/main.js'))
for (const f of readdirSync(path.join(ROOT, 'src/assets/projects'))) copyFileSync(path.join(ROOT, 'src/assets/projects', f), path.join(OUT, 'assets/projects', f))
for (const f of ['favicon.svg', 'og.jpg', 'logo.png']) if (existsSync(path.join(ROOT, 'src/assets', f))) copyFileSync(path.join(ROOT, 'src/assets', f), path.join(OUT, 'assets', f))

const urls = [['/', today, '1.0'], ['/projects/', today, '0.9'], ['/services/', today, '0.9'], ['/journal/', POSTS[0]?.date || today, '0.8'], ['/about/', today, '0.5'], ['/contact/', today, '0.6'],
  ...SERVICES.map((s) => [`/services/${s.slug}/`, today, '0.8']), ...PROJECTS.map((p) => [`/projects/${p.slug}/`, today, '0.7']), ...POSTS.map((p) => [`/journal/${p.slug}/`, p.updated || p.date, '0.7'])]
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, pr]) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`)
write('robots.txt', `User-agent: *\nAllow: /\n\n# AI-поисковики приветствуются (GEO)\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: YandexBot\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`)
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>REBORN LAB — Журнал</title><link>${SITE.url}/journal/</link><description>AI, автоматизация, сайты, SEO и GEO — практические разборы.</description><language>ru</language>\n${POSTS.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE.url}/journal/${p.slug}/</link><guid>${SITE.url}/journal/${p.slug}/</guid><pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}\n</channel></rss>\n`)
write('llms.txt', `# REBORN LAB\n\n> ${SITE.tagline}. Принесите задачу — соберём решение: сайты, веб-сервисы, AI-ассистенты и агенты, автоматизация, SEO/GEO, дизайн.\n\n## Услуги\n${SERVICES.map((s) => `- [${s.seoTitle}](${SITE.url}/services/${s.slug}/): ${s.lead}`).join('\n')}\n\n## Проекты\n${PROJECTS.map((p) => `- [${p.name}](${SITE.url}/projects/${p.slug}/): ${p.lead}`).join('\n')}\n\n## Журнал\n${POSTS.map((p) => `- [${p.title}](${SITE.url}/journal/${p.slug}/): ${p.description}`).join('\n')}\n\n## Контакт\n- Telegram: https://t.me/${SITE.telegram}\n`)
writeFileSync(path.join(OUT, 'CNAME'), 'rebornlab.ru\n')
writeFileSync(path.join(OUT, '.nojekyll'), '')
console.log(`built: ${urls.length} urls · ${POSTS.length} posts · ${PROJECTS.length} projects · ${SERVICES.length} services`)
