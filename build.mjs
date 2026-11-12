// REBORN LAB static site generator — no dependencies. `node build.mjs` → writes the site into ./ (GitHub Pages root).
// Sources: src/data.mjs (projects, services…), content/journal/*.md (articles with front matter), src/styles.css, src/main.js.
// New article = new .md file in content/journal → `node build.mjs` → commit + push.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { SITE, PROJECTS, SERVICES, PROBLEMS, MARKET, START_SMALL, JOURNAL_CATEGORIES } from './src/data.mjs'
import { SERVICE_SEO } from './src/services-seo.mjs'

const ROOT = path.dirname(new URL(import.meta.url).pathname)
const OUT = ROOT
const GENERATED_DIRS = ['oferta', 'consent-order', 'services', 'projects', 'journal', 'about', 'contact', 'privacy', 'consent', 'assets']
const today = new Date().toISOString().slice(0, 10)
const ASSET_V = createHash('md5').update(readFileSync(path.join(ROOT, 'src/styles.css'))).update(readFileSync(path.join(ROOT, 'src/main.js'))).digest('hex').slice(0, 8)

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function write(rel, html) {
  const f = path.join(OUT, rel)
  mkdirSync(path.dirname(f), { recursive: true })
  writeFileSync(f, html)
}
const ru = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
// 06.11.2026 Ник: у новостей — время публикации по Москве (front matter `time: ЧЧ:ММ`)
const ruDT = (p) => ru(p.date) + (p.time ? `, ${p.time} МСК` : '')
const isoDT = (p) => (p.time ? `${p.date}T${p.time}:00+03:00` : p.date)
// 06.11.2026 Ник: во всех новостях о Бегет (Beget) — ссылка на бота
// 09.11.2026 (Ник): под каждой статьёй — «Поделиться». 10.11: комментарии убраны (Ник: «никто не пишет»)
const SHARE_COMMENTS = (p) => {
  const url = `https://rebornlab.ru/journal/${p.slug}/`, u = encodeURIComponent(url), t = encodeURIComponent(p.title)
  return `<div class="share" style="margin:40px 0 0;padding:20px 0;border-top:1px solid rgba(255,255,255,.12)"><b style="display:block;margin-bottom:12px">Поделиться статьёй</b>
<div style="display:flex;flex-wrap:wrap;gap:10px">
<a class="btn-sh" href="https://t.me/share/url?url=${u}&text=${t}" target="_blank" rel="noopener">Telegram</a>
<a class="btn-sh" href="https://vk.com/share.php?url=${u}&title=${t}" target="_blank" rel="noopener">ВКонтакте</a>
<a class="btn-sh" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener">WhatsApp</a>
<a class="btn-sh" href="https://connect.ok.ru/offer?url=${u}&title=${t}" target="_blank" rel="noopener">Одноклассники</a>
<button type="button" class="btn-sh" data-copy="${url}">Скопировать ссылку</button></div></div>
<script>(function(){
document.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){navigator.clipboard&&navigator.clipboard.writeText(b.dataset.copy);b.textContent='Ссылка скопирована'}});
})();</script>`
}

const BOT_BOX = `<div class="bot-box" style="margin:0 0 28px;padding:18px 20px;border:1px solid var(--acc);border-radius:16px;background:rgba(198,242,78,.06)"><b>🔔 Ждёте свой сайт на Бегет (Beget)?</b><br>Бесплатный Telegram-бот <a href="https://t.me/rebornlab_bot" style="color:var(--acc)">@rebornlab_bot</a> проверяет ваш сайт каждые 10 минут и пишет, когда включится сервер и когда сайт откроется. Живая статистика восстановления — <a href="/beget/" style="color:var(--acc)">rebornlab.ru/beget</a>.</div>`

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
    // 06.11.2026: блоки кода, таблицы и картинки (раньше выводились сырым текстом в статьях о Бегет)
    if (/^```/.test(b)) { out.push('<pre><code>' + esc(lines.filter((l) => !/^```/.test(l)).join('\n')) + '</code></pre>'); continue }
    if (lines.length > 1 && lines.every((l) => /^\s*\|/.test(l))) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const rows = lines.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l))
      out.push('<div class="tbl"><table><thead><tr>' + cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.slice(1).map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>')
      continue
    }
    const im = b.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
    if (im) { out.push(`<figure><img src="${im[2]}" alt="${esc(im[1])}" loading="lazy" style="display:block;width:100%;height:auto;border-radius:14px">${im[1] ? `<figcaption>${inline(im[1])}</figcaption>` : ''}</figure>`); continue }
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

const svImg = (s) => existsSync(`src/assets/services/${s.slug}.jpg`) ? `<img class="cap-img" src="/assets/services/${s.slug}.jpg" alt="" width="800" height="450" loading="lazy">` : ''   // 10.11: картинки карточек (drafts/services-pics.*)
const svIcon = (s) => `<svg class="sv-ico" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.icon || ''}</svg>`
const svPains = (s) => s.pains ? `<div class="sv-pain"><b>Если у вас:</b><ul>${s.pains.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''
const HAS_SELLER = !!SITE.operator   // 10.11: оферта с ФИО самозанятого; ИНН добавится, когда будет   // оферта и данные продавца — только с реквизитами
// 05.11.2026 Ник: живые проекты с сайта убраны (чтобы не привлекать к ним внимание) — раздела «Проекты» нет
const NAV = [['/#uslugi', 'Услуги'], ['/vosstanovlenie-sajta/', '<svg class="nav-ic" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>Восстановление сайтов'], ['/journal/', 'Журнал'], ['/about/', 'Обо мне'], ['/beget/', 'Статус Beget'], ['/beget/server/', '<svg class="nav-ic" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 12h3l3-7 4 14 3-7h5"/></svg>Мониторинг серверов']]   // 10.11 Ник: вместо «Проверка по IP» (запросы «мониторинг серверов бегет»)

// 07.11.2026 Ник: одна шапка везде (и на ручных страницах /beget/ — вставляется ниже, при обработке), на страницах о Beget — полоса навигации по теме
function HEADER(current = '') {
  return `<header class="hdr"><div class="wrap">
  ${LOGO}
  <nav class="nav" aria-label="Основное меню">${NAV.map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ''}>${t}</a>`).join('')}<a class="nav-cta" href="/contact/" data-goal="cta_menu">Обсудить идею →</a></nav>
  <a class="hdr-cta" href="/contact/" data-goal="cta_header">Обсудить идею</a>
  <button class="srch-btn" type="button" aria-label="Поиск по сайту" data-search><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16.5 16.5 21 21M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/></svg></button>
  <button class="burger" aria-label="Меню" aria-expanded="false">☰</button>
</div></header>`
}
function BEGET_BAR(at = '') {
  const L = [['/beget/', 'Статус'], ['/beget/server/', '📡 Мониторинг серверов'], ['/beget/vosstanovit/', '♻️ Восстановить сайт'], ['/beget/#news', 'Новости'], ['/beget/voprosy/', '❓ Вопросы и ответы'], ['https://t.me/rebornlab_bot', '🔔 Бот']]   // 07.11: короче — кнопка бота не влезала
  return `<div class="bbar"><div class="wrap"><span class="bbar-t"><i></i>Бегет</span>${L.map(([h, t]) => `<a href="${h}"${h === at ? ' aria-current="page"' : ''}${h.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`).join('')}</div></div>`
}
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
<meta property="og:image:secure_url" content="${SITE.url}${image}">
<meta property="og:image:type" content="${image.endsWith('.png') ? 'image/png' : 'image/jpeg'}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE.url}${image}">
<meta name="theme-color" content="#08090a">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="REBORN LAB — Журнал" href="/rss.xml">
<link rel="stylesheet" href="/assets/styles.css?v=${ASSET_V}">
${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
${metrika}
</head>
<body>
${HEADER(current)}${canonical === '/' || /^\/(beget|journal\/beget)/.test(canonical) ? BEGET_BAR(canonical) : ''}
<main>
${body}
</main>
<footer class="ftr"><div class="wrap">
  <div>${LOGO}<p style="margin:14px 0 0;max-width:30em">Цифровые продукты · AI · Автоматизация · Разработка · SEO/GEO · Дизайн.<br>Принесите задачу — соберём решение.</p><p class="ftr-copy">© ${new Date().getFullYear()} REBORN LAB</p><div class="ftr-legal"><a href="/privacy/">Политика конфиденциальности</a><a href="/consent/">Согласие на обработку данных</a><a href="/beget/pravila/">Правила мониторинга Beget и бота</a>${HAS_SELLER ? '<a href="/oferta/">Публичная оферта</a>' : ''}</div></div>
  <div><a href="/#uslugi">Услуги</a><a href="/vosstanovlenie-sajta/">Восстановление сайтов</a><a href="/journal/">Журнал</a><a href="/about/">Обо мне</a><a href="/contact/">Контакты</a></div>
  <div><a href="https://t.me/${SITE.telegram}" rel="noopener" target="_blank">Telegram @${SITE.telegram}</a><a href="/rss.xml">RSS журнала</a></div>
</div></footer>
<div class="cookie" id="cookie" hidden><p>Сайт использует cookie и Яндекс Метрику (включая Вебвизор) для статистики посещаемости. Нажимая «Согласен», вы соглашаетесь с этим. Подробнее — в <a href="/privacy/">политике конфиденциальности</a>.</p><button type="button" class="btn btn-acc" id="cookie-ok">Согласен</button></div>
<script src="/assets/main.js?v=${ASSET_V}" defer></script>
</body>
</html>`
}

const ORG = { '@context': 'https://schema.org', '@type': 'Organization', name: 'REBORN LAB', url: SITE.url, logo: SITE.url + '/assets/logo.png', description: SITE.tagline, sameAs: [`https://t.me/${SITE.telegram}`] }
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
    <div class="form-row"><label class="sr" for="${id}-c">Контакт</label><input class="ym-disable-keys" type="text" id="${id}-c" name="contact" placeholder="Почта, Telegram или WhatsApp — мы пишем, не звоним" style="flex:1;min-width:220px"></div>
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
  const slug = meta.slug || f.replace(/\.md$/, '')
  const img = existsSync(path.join(ROOT, 'src/assets/journal', slug + '.jpg')) ? `/assets/journal/${slug}.jpg` : ''   // 06.11: обложка статьи
  return { ...meta, slug, image: meta.image || img, html: md(body), words: body.split(/\s+/).length }
}).filter((p) => p.date <= new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10) && p.draft !== 'true').sort((a, b) => (isoDT(a) < isoDT(b) ? 1 : -1))   // 11.11: дата статьи — по Москве (было по UTC: статьи после 00:00 МСК прятались до 03:00); сортировка — новые сверху (комментарий не ставить перед .sort!)
const postCard = (p) => `<a class="post rv" href="/journal/${p.slug}/">${p.image ? `<img src="${p.image}" alt="" loading="lazy" width="1200" height="630" style="display:block;width:100%;height:auto;border-radius:12px;margin:0 0 14px">` : ''}<div class="meta">${esc(JOURNAL_CATEGORIES[p.category] || p.category)} · ${ruDT(p)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></a>`

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
    <div class="bnow" id="bnow"><div><span class="bnow-t"><i></i>Ситуация с Бегет</span><p id="bnow-p">Живой статус серверов, проверка своего сайта и ответы на вопросы. Бесплатно.</p><form class="bnow-s" data-bnow-s role="search"><input type="search" name="q" placeholder="IP, адрес сайта или вопрос" aria-label="Поиск: сервер, сайт или вопрос о Бегет" autocomplete="off"><button type="submit" class="btn btn-acc">Найти</button></form></div><div class="bnow-a"><a class="btn btn-acc" href="/beget/" data-goal="home_beget">Смотреть статус <span class="arrow">→</span></a><a class="bnow-l" href="/beget/server/" data-goal="home_beget_ip">Проверить свой сервер</a></div></div>
    <div class="kicker">Digital laboratory · идея → система → продукт</div>
    <h1 id="h1">Скажите, что нужно. <em>Остальное соберём.</em></h1>
    <p class="sub">Восстанавливаем и переносим сайты, делаем так, чтобы они открывались у всех. Собираем сайты, ботов, автоматизацию и AI под вашу задачу. Можно прийти без ТЗ: с идеей или с проблемой.</p>
    <div class="row">
      <a class="btn btn-acc" href="#task" data-goal="cta_hero">Разобрать задачу <span class="arrow">→</span></a>
    </div>
    <div class="hero-meta"><span>Восстановление · Переезд · Сайты · Боты · AI</span><span>от прототипа до продукта</span></div>
  </div>
</section>
<div class="rline"></div>


<section class="sec" style="padding-top:10px"><div class="wrap">
  <div class="sl-logo rv"><img src="/assets/svoya-liniya-logo.jpg" alt="" width="88" height="88" loading="lazy"></div>
</div></section>

<section class="sec" id="uslugi" style="padding-top:20px"><div class="wrap">
  <div class="sec-hd rv"><div><div class="kicker">Что мы можем</div><h2>Не одна технология, <em>а целая лаборатория</em></h2></div><p>Под задачу собираем нужную связку: где-то хватит сайта, где-то нужен AI, где-то — автоматизация и интеграции. Чаще всего — всё вместе.</p></div>
  <div class="caps">
    ${SERVICES.map((s) => `<a class="cap rv" href="/services/${s.slug}/">${svImg(s)}<div class="sv-top">${svIcon(s)}<span class="code">${s.code}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.lead)}</p>${svPains(s)}</a>`).join('\n')}
    <a class="cap ask rv" href="#task"><span class="code">${String(SERVICES.length + 1).padStart(2, '0')}</span><h3>Ваша задача</h3><p>Не нашли своё? Это нормально. Опишите проблему — предложим, что можно сделать.</p><span class="card-link" style="margin-top:auto">Разобрать задачу <span class="arrow">→</span></span></a>
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

<!-- 10.11 Ник: «что лишнее на главной — удали»: убраны «От идеи до продукта» + «AI — не игрушка» и рыночная статистика -->
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
  jsonLd: [crumbsLd([['Главная', '/'], ['Услуги', '/#uslugi']])],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Услуги', '/#uslugi']])}<h1>Что мы <span style="color:var(--acc)">собираем</span></h1><p class="sub">Под каждую задачу — своя связка. Выберите направление или просто опишите задачу.</p></div>
  <section class="sec" style="padding-top:10px"><div class="wrap">
  <div class="sv-flow rv"><div class="kicker" style="margin-bottom:14px">Как работаем — без риска для вас</div><ol>
    <li><b>Разбор задачи</b><span>бесплатно: что нужно и как лучше сделать</span></li>
    <li><b>Бесплатное демо</b><span>новый дизайн на вашем же контенте</span></li>
    <li><b>Делаем</b><span>быстро: от 999 ₽ и от пары дней</span></li>
    <li><b>Сопровождаем</b><span>обновления, законы, доступность</span></li></ol></div>
  </div></section>
  <div class="wrap"><h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Направления работы</h2><div class="caps">${SERVICES.map((s) => `<a class="cap rv" href="/services/${s.slug}/">${svImg(s)}<div class="sv-top">${svIcon(s)}<span class="code">${s.code} · ${esc(s.short)}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.lead)}</p>${svPains(s)}<ul>${s.items.slice(0, 4).map((i) => `<li>${esc(i)}</li>`).join('')}</ul><span class="card-link">Подробнее <span class="arrow">→</span></span></a>`).join('')}
  <a class="cap ask rv" href="/contact/"><span class="code">06</span><h3>Другая задача</h3><p>Опишите её — предложим решение.</p></a></div></div>
  <section class="sec"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Не знаете, что выбрать? <em>Опишите задачу.</em></h2>${leadForm('f-svc')}</div></div></section>`,
}))
for (const s of SERVICES) {
  const proofs = []   // 05.11: проекты не показываем
  const x = SERVICE_SEO[s.slug] || {}
  const faq = [...(x.faq || []), ...s.faq]
  const offers = (x.terms || []).map(([n, v]) => [n, (v.match(/^([\d ]+) ₽/) || [])[1]]).filter(([, p]) => p).map(([n, p]) => ({ '@type': 'Offer', name: n, price: p.replace(/ /g, ''), priceCurrency: 'RUB' }))
  const related = (x.related || []).map((k) => SERVICES.find((z) => z.slug === k)).filter(Boolean)
  const ctaTop = s.slug === 'site-fix' ? '<a class="btn btn-acc" href="#task" data-goal="cta_service">Обсудить задачу <span class="arrow">→</span></a>'
    : s.slug === 'redesign' ? '<a class="btn btn-acc" href="#task" data-goal="cta_service_demo">Получить бесплатное демо <span class="arrow">→</span></a>'
    : s.slug === 'site-restore' ? '<a class="btn btn-acc" href="/vosstanovlenie-sajta/" data-goal="cta_restore_tarify">Тарифы и сроки · демо за 2–3 часа <span class="arrow">→</span></a> <a class="btn" href="#task" data-goal="cta_service">Обсудить задачу</a>'
    : '<a class="btn btn-acc" href="#task" data-goal="cta_service">Обсудить задачу <span class="arrow">→</span></a>'
  write(`services/${s.slug}/index.html`, shell({
    title: x.title ? `${x.title} | REBORN LAB` : `${s.seoTitle} — REBORN LAB`,
    description: x.description || s.lead,
    canonical: `/services/${s.slug}/`, current: '/services/',
    jsonLd: [crumbsLd([['Главная', '/'], ['Услуги', '/#uslugi'], [s.title, `/services/${s.slug}/`]]),
      { '@context': 'https://schema.org', '@type': 'Service', name: s.seoTitle, description: x.description || s.lead, provider: { '@type': 'Organization', name: 'REBORN LAB', url: SITE.url },
        areaServed: 'RU', serviceType: s.title, url: `${SITE.url}/services/${s.slug}/`, ...(offers.length ? { offers } : {}) },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
    body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Услуги', '/#uslugi'], [s.title, '']])}<div class="kicker sv-k" style="margin-top:18px">${svIcon(s)} ${s.code} · ${esc(s.short)}</div><h1>${esc(s.seoTitle)}</h1><p class="sub">${esc(s.lead)}</p>${svPains(s).replace('sv-pain', 'sv-pain big')}<p style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">${ctaTop}</p></div>
    ${x.about ? `<section class="sec" style="padding-top:20px"><div class="wrap" style="max-width:860px"><h2 class="rv" style="font-size:clamp(26px,3.2vw,38px)">${esc(x.h2)}</h2>${x.about.map((t) => `<p class="rv sv-p">${esc(t)}</p>`).join('')}</div></section>` : ''}
    ${x.included ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">Что входит</div><h2>${esc(s.title)}: <em>что мы делаем</em></h2></div></div>
      <div class="sv-inc">${x.included.map(([t, d]) => `<div class="rv"><b>${esc(t)}</b>${d ? `<span>${esc(d)}</span>` : ''}</div>`).join('')}</div></div></section>`
      : `<section class="sec" style="padding-top:30px"><div class="wrap"><div class="kicker rv">Что входит</div><div class="wants rv">${s.items.map((i) => `<span>${esc(i)}</span>`).join('')}</div></div></section>`}
    ${x.steps ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="sv-flow rv"><div class="kicker" style="margin-bottom:14px">Как работаем</div><ol style="grid-template-columns:repeat(${x.steps.length},1fr)">${x.steps.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol></div></div></section>` : ''}
    ${x.terms ? `<section class="sec" style="padding-top:0"><div class="wrap" style="max-width:860px"><div class="kicker rv">Сроки и стоимость</div><div class="sv-terms rv">${x.terms.map(([n, v]) => `<div><span>${esc(n)}</span><b>${esc(v)}</b></div>`).join('')}</div></div></section>` : ''}
    ${proofs.length ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-hd rv"><div><div class="kicker">Доказательства</div><h2>Как мы это <em>уже делали</em></h2></div></div><div class="grid-proj">${proofs.map((p) => projCard(p)).join('')}</div></div></section>` : ''}
    <section class="sec" style="padding-top:0"><div class="wrap" style="max-width:860px"><div class="kicker rv">Частые вопросы</div><div class="faq rv">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>
    ${related.length ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="kicker rv" style="margin-bottom:14px">Ещё может пригодиться</div><div class="sv-rel">${related.map((r) => `<a class="rv" href="/services/${r.slug}/">${svIcon(r)}<span><b>${esc(r.title)}</b><i>${esc(r.short)}</i></span></a>`).join('')}</div></div></section>` : ''}
    <section class="sec" id="task" style="padding-top:0"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Расскажите, <em>что нужно</em></h2>${leadForm('f-' + s.slug)}</div></div></section>`,
  }))
}

// ---------- ПРОВЕРКА САЙТА — закрыта 05.11.2026 (Ник: «отключи вообще и удали с сайта»), лендинг убран ----------

// ---------- PROJECTS — убраны 05.11.2026 ----------

// ---------- JOURNAL ----------
write('journal/index.html', shell({
  title: 'Журнал REBORN LAB — AI, автоматизация, сайты, SEO и GEO',
  description: 'Практические разборы: как автоматизировать заявки, внедрить AI, сделать сайт, который продаёт, и попасть в ответы AI-поисковиков. Без воды.',
  canonical: '/journal/', current: '/journal/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Журнал', '/journal/']])],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Журнал', '/journal/']])}<div class="kicker" style="margin-top:18px">Lab notes</div><h1>Журнал <span style="color:var(--acc)">лаборатории</span></h1><p class="sub">Разборы, кейсы и инструкции — то, что сами применяем в проектах.</p></div>
  <div class="wrap"><h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Все статьи</h2><div class="posts">${POSTS.map(postCard).join('') || '<p class="muted">Скоро здесь появятся первые материалы.</p>'}</div></div>
  <section class="sec"><div class="wrap"><div class="final-box rv"><h2 style="font-size:clamp(30px,4vw,52px)">Узнали свою задачу? <em>Разберём.</em></h2>${leadForm('f-jr')}</div></div></section>`,
}))
for (const p of POSTS) {
  const related = POSTS.filter((x) => x.slug !== p.slug).sort((a, b) => (a.category === p.category ? -1 : 0) - (b.category === p.category ? -1 : 0)).slice(0, 3)
  write(`journal/${p.slug}/index.html`, shell({
    title: `${p.title} — REBORN LAB`,
    description: p.description,
    canonical: `/journal/${p.slug}/`, current: '/journal/', ogType: 'article', ...(p.image ? { image: p.image } : {}),
    jsonLd: [crumbsLd([['Главная', '/'], ['Журнал', '/journal/'], [p.title, `/journal/${p.slug}/`]]),
      { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, datePublished: isoDT(p), dateModified: p.updated || isoDT(p), inLanguage: 'ru', author: { '@type': 'Organization', name: 'REBORN LAB', url: SITE.url }, publisher: { '@type': 'Organization', name: 'REBORN LAB', logo: { '@type': 'ImageObject', url: SITE.url + '/assets/logo.png' } }, mainEntityOfPage: SITE.url + `/journal/${p.slug}/`, image: SITE.url + (p.image || '/assets/og.jpg'), articleSection: JOURNAL_CATEGORIES[p.category] || p.category, wordCount: p.words }],
    body: `<article><div class="wrap page-hd">${crumbs([['Главная', '/'], ['Журнал', '/journal/'], [p.title, '']])}<div class="kicker" style="margin-top:18px">${esc(JOURNAL_CATEGORIES[p.category] || p.category)} · ${ruDT(p)} · ${Math.max(1, Math.round(p.words / 180))} мин</div><h1 style="max-width:20ch">${esc(p.title)}</h1><p class="sub">${esc(p.description)}</p>${p.image ? `<img src="${p.image}" alt="${esc(p.title)}" width="1200" height="630" style="display:block;width:100%;max-width:900px;height:auto;border-radius:16px;margin-top:22px">` : ''}</div>
    <div class="wrap"><div class="prose">${p.slug.startsWith('beget') ? BOT_BOX : ''}${p.html}${SHARE_COMMENTS(p)}</div></div></article>
    <section class="sec"><div class="wrap"><div class="final-box rv"><div class="kicker">Применим к вашей задаче</div><h2 style="font-size:clamp(30px,4vw,52px)">Хотите так же? <em>Разберём бесплатно.</em></h2>${leadForm('f-post')}</div></div></section>
    ${related.length ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="kicker rv">Читайте также</div><div class="posts" style="margin-top:18px">${related.map(postCard).join('')}</div></div></section>` : ''}`,
  }))
}

// ---------- ABOUT / CONTACT ----------
write('about/index.html', shell({   // 11.11.2026 ночь: v3 — знакомство с человеком (концепция ChatGPT, одобрена Ником), факты и кейсы коротко
  title: 'Николай Чечельницкий — REBORN LAB: человек, которому интересно создавать',
  description: 'За REBORN LAB стоит один человек: в интернет-проектах с 2011 года, любит разбираться в сложном и делать полезные вещи — от восстановления сайтов до бесплатного мониторинга серверов Beget.',
  canonical: '/about/', current: '/about/',
  jsonLd: [ORG, crumbsLd([['Главная', '/'], ['Обо мне', '/about/']]), { '@context': 'https://schema.org', '@type': 'Person', name: 'Николай Чечельницкий', jobTitle: 'Основатель REBORN LAB', url: `${SITE.url}/about/`, image: `${SITE.url}/assets/nick.jpg`, sameAs: ['https://t.me/Reborn_Lab'] }],
  body: `<div class="wrap page-hd">${crumbs([['Главная', '/'], ['Обо мне', '']])}<h1>За REBORN LAB стоит человек, <span style="color:var(--acc)">которому интересно создавать</span></h1><p class="sub">Меня зовут Николай Чечельницкий. Здесь нет отдела продаж и большой команды — есть я, мои инструменты и интерес к задачам, которые кажутся сложными.</p></div>
  <div class="wrap"><div class="prose about-me">
  <div class="me-card"><img class="me-ava" src="/assets/nick.jpg?v=1" alt="Николай Чечельницкий" width="72" height="72"><div><b>Николай Чечельницкий</b><span>основатель REBORN LAB</span><span>в интернет-проектах с 2011 года · Telegram <a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener">@Reborn_Lab</a></span></div></div>
  <p>Меня всегда интересовало, как всё устроено. Почему что-то работает, почему ломается, как можно сделать лучше и что интересного получится, если посмотреть на привычную задачу под другим углом.</p>
  <p>Я люблю разбираться, экспериментировать, искать решения и превращать идеи в работающие вещи. Неважно, что передо мной — сайт, сложный технический вопрос, автоматизация или совершенно новая задумка.</p>
  <p><strong>REBORN LAB появился именно из этого интереса.</strong> Это пространство для экспериментов, разработки и реализации идей. Делать очередной сайт просто ради сайта мне неинтересно — гораздо интереснее создать что-то действительно полезное, что будет работать и приносить людям пользу.</p>
  <h2>Мне важно, чтобы технологии помогали людям</h2>
  <p>Хороший пример — мониторинг сайтов и серверов Beget. Когда в ноябре 2026 года у хостинга перестали открываться тысячи сайтов, я решил не просто наблюдать, а сделать инструмент, который поможет другим владельцам сайтов. Так появились <a href="/beget/">статус и мониторинг серверов</a>, проверка «<a href="/beget/vosstanovit/">можно ли восстановить сайт</a>» и бесплатный бот <a href="https://t.me/rebornlab_bot" target="_blank" rel="noopener">@rebornlab_bot</a>: он проверяет сайты каждые 10 минут и сообщает о сбоях и восстановлении. Им пользуются около 1 000 человек, он следит больше чем за 1 500 сайтами.</p>
  <p>Без рекламы, платных подписок и лишних обещаний. Просто инструмент, который кому-то пригодился. Для меня это хороший пример того, каким должен быть результат работы: не просто красивым, а полезным.</p>
  <h2>Что получилось сделать за первую неделю</h2>
  <p>Неделя после 4 ноября получилась очень плотной. Цифры ниже — из моих же систем на 12 ноября, без округлений в большую сторону.</p>
  <h3>Бесплатный мониторинг для всех</h3>
  <ul>
  <li><strong>В первый же день</strong> запустил страницу статуса Beget и бота <a href="https://t.me/rebornlab_bot" target="_blank" rel="noopener">@rebornlab_bot</a>. Сейчас в нём больше 1 000 человек, он следит за 1 560 сайтами и 157 серверами и уже 547 раз сообщил людям, что их сайт снова заработал.</li>
  <li><a href="/beget/server/">Мониторинг серверов</a> — 23 сети, почти 5 900 адресов. Если человек добавляет сервер из сети, которой ещё нет, бот сам ставит её на проверку.</li>
  <li><a href="/beget/vosstanovit/">Проверка «можно ли восстановить сайт»</a> по веб-архиву — больше 3 400 проверок за неделю.</li>
  <li><a href="/beget/voprosy/">61 ответ на частые вопросы</a> и заметки с ежедневными замерами — без пересказа слухов, только то, что видно по проверкам.</li>
  </ul>
  <h3>Сайты, которые вернулись к работе</h3>
  <p>Ко мне стали приходить владельцы магазинов, журналов и сайтов компаний — часто без резервных копий и без доступа к хостингу. Названий и данных клиентов здесь нет, только работа, и всё с согласия владельцев:</p>
  <ul>
  <li><strong>Десять сайтов клиентов</strong> снова работают — из веб-архива, из копий и из выгрузок товаров. Адреса страниц, заголовки и тексты прежние, чтобы не потерять позиции в поиске; формы заявок снова приходят на почту.</li>
  <li><strong>Битрикс на 2 ГБ с одним паролем от админки</strong> — собрали архив базы и файлов прямо на сервере и передали владельцу; перекачка заняла меньше минуты.</li>
  <li><strong>MODX без базы данных</strong> — собрали сайт обратно из кэша страниц за пару часов, он заработал у владельца в тот же день.</li>
  </ul>
  <h3>Свой сервер в России</h3>
  <ul>
  <li><strong>9 ноября</strong> взял сервер на REG.RU и перевёз туда этот сайт, приём заявок, почту и сайты клиентов — данные теперь хранятся в России.</li>
  <li>Сайты изолированы друг от друга, как на хостинге: у каждого свой пользователь и свой PHP. У каждой служебной программы — свой ключ, который умеет ровно одно действие.</li>
  <li>Копии — каждый час, в зашифрованном виде, в пяти местах. И восстановление из них проверяется на деле, а не «на всякий случай».</li>
  </ul>
  <h3>Для клиентов</h3>
  <ul>
  <li><strong>Кабинет заявок</strong> прямо на сайте клиента — со статусами и комментариями, и сигнал о каждой новой заявке в Telegram.</li>
  <li><strong>Помощник на сайте</strong> — проверяет сайт посетителя и передаёт его вопрос мне, а дальше я отвечаю сам.</li>
  </ul>
  <h2>Немного обо мне</h2>
  <p>Сайтами я занимаюсь с 2011 года. Начинал с поддержки чужих проектов: хостинг, почта, формы, которые не доходили, «у нас всё упало». Потом были свои проекты — самый крупный собирал 5,66 млн визитов и 8,79 млн просмотров в месяц.</p>
  <div class="me-stats"><figure><img src="/assets/journal/about-metrika-month.jpg" alt="Яндекс Метрика: 5,66 млн визитов и 8,79 млн просмотров за июнь" width="620" height="1246" loading="lazy"><figcaption>Метрика за месяц: 5,66 млн визитов</figcaption></figure><figure><img src="/assets/journal/about-metrika-day.jpg" alt="Яндекс Метрика: 519 773 просмотра за 14 июля" width="620" height="596" loading="lazy"><figcaption>Один день: 519 773 просмотра</figcaption></figure></div>
  <p>Был у меня и свой интернет-магазин часов Garmin — вырастил и продал. Примерно с 2022 года сделал паузу, а последние месяцы плотно работаю с ИИ: он берёт на себя рутину, а решения и ответственность остаются за мной.</p>
  <h2>Как я смотрю на работу</h2>
  <p>Мне нравится разбираться в сложных задачах, но не нравится усложнять простые вещи. Я не обещаю невозможного, не люблю пустые презентации и не считаю, что человеку обязательно нужно продавать всё подряд. Иногда достаточно внимательно разобраться в проблеме и предложить понятное решение.</p>
  <p>Я за открытость, самостоятельность, эксперименты и ответственность за то, что создаю. Если я что-то сделал на вашем сайте, вы знаете, что именно, зачем и как это откатить.</p>
  <p><strong>Можно долго рассказывать о технологиях. Но гораздо интереснее показывать, что с их помощью получилось сделать.</strong></p>
  <h2>Спасибо Beget</h2>
  <p>У меня нет претензий к Beget. Авария может случиться у любого хостинга, и я видел, как их команда день за днём возвращала серверы. Моя задача — не переманивать людей, а помочь им пережить сбой. Многие сайты, которые мы временно поднимали у себя, уже вернулись домой, и это хороший итог.</p>
  <div class="me-end"><h2>REBORN LAB — идеи, которые становятся реальностью</h2><p>Если у вас есть интересная задача, идея или просто вопрос — давайте обсудим. Иногда именно с обычного разговора начинается что-то действительно интересное.</p><a class="btn btn-acc" href="https://t.me/Reborn_Lab" target="_blank" rel="noopener">Обсудить идею</a></div>
  </div></div>`,
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
const LEGAL_DATE = '12.11.2026'
const OPERATOR = SITE.operator
  ? `${SITE.operator}${SITE.operatorInn ? ', ИНН ' + SITE.operatorInn : ''}${SITE.operatorOgrn ? ', ОГРНИП ' + SITE.operatorOgrn : ''}${SITE.operatorAddress ? ', адрес: ' + SITE.operatorAddress : ''}`
  : 'владелец сайта rebornlab.ru (REBORN LAB)'
const PD_CONTACT = `Telegram <a href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener">@${SITE.telegram}</a> или почта <a href="mailto:${SITE.pdEmail}">${SITE.pdEmail}</a>`
const legalCss = '<style>.legal h2{font-size:22px;margin:30px 0 10px}.legal li{margin:6px 0}.legal table{border-collapse:collapse;width:100%;font-size:15px}.legal td,.legal th{border:1px solid var(--line-2);padding:8px 10px;vertical-align:top;text-align:left}</style>'
write('privacy/index.html', shell({
  title: 'Политика обработки персональных данных — REBORN LAB',
  description: 'Как REBORN LAB обрабатывает и защищает персональные данные: заявки, бот мониторинга, статистика посещений.',
  canonical: '/privacy/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Политика конфиденциальности', '/privacy/']])],
  body: `${legalCss}<div class="wrap page-hd legal" style="max-width:860px">${crumbs([['Главная', '/'], ['Политика конфиденциальности', '']])}<h1 style="font-size:clamp(32px,5vw,52px)">Политика обработки персональных данных</h1>
  <p class="sub">Редакция от ${LEGAL_DATE}. Документ определяет политику оператора в отношении обработки персональных данных по ст. 18.1 Федерального закона № 152-ФЗ «О персональных данных» и действует на сайте rebornlab.ru.</p>
  <h2>1. Оператор</h2>
  <p>Оператор персональных данных — ${esc(OPERATOR)}. Вопросы о данных, запросы и отзыв согласия: ${PD_CONTACT}.</p>
  <h2>2. Чьи данные, какие и зачем</h2>
  <table><tr><th>Кто</th><th>Какие данные</th><th>Цель</th><th>Основание</th><th>Срок</th></tr>
  <tr><td>Посетитель, отправивший заявку</td><td>контакт (почта, ник в Telegram или номер WhatsApp), текст заявки, адрес сайта (если указан), IP-адрес, страница, дата и время</td><td>ответить на заявку, обсудить задачу, подготовить предложение; защита от спама</td><td>согласие (п. 1 ч. 1 ст. 6)</td><td>до достижения цели, не дольше 3 лет с последнего общения, или до отзыва согласия</td></tr>
  <tr><td>Посетитель сайта</td><td>cookie и данные о посещении через Яндекс Метрику: страницы, источник перехода, устройство, действия на странице (Вебвизор, без содержимого полей форм)</td><td>статистика и улучшение сайтов</td><td>согласие, данное кнопкой «Согласен»</td><td>по правилам Яндекс Метрики, не дольше 12 месяцев</td></tr>
  <tr><td>Посетитель, написавший в чат-помощник «Ник на связи»</td><td>текст сообщений, адрес сайта (если указан), страница; почта и телефоны вырезаются из текста автоматически до обработки, IP-адрес в журнал не записывается</td><td>ответить на вопрос, проверить сайт и передать вопрос оператору</td><td>согласие (п. 1 ч. 1 ст. 6), выраженное отправкой сообщения</td><td>не дольше 1 года</td></tr>
  <tr><td>Заказчик, оплативший услугу</td><td>контакт для связи, адрес сайта, описание задачи, сведения о платеже (номер, сумма, статус; данные карты получает только ЮKassa)</td><td>оказание услуги, расчёты, чек</td><td>договор (п. 5 ч. 1 ст. 6)</td><td>5 лет — для расчётных документов, остальное — как для заявок</td></tr></table>
  <p>Специальные категории данных (здоровье, убеждения и т. п.) и биометрию мы не запрашиваем и не обрабатываем — пожалуйста, не указывайте их в заявках.</p>
  <h2>3. Что мы делаем с данными</h2>
  <p>Сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача (предоставление доступа) лицам из раздела 4, блокирование, удаление и уничтожение — с использованием средств автоматизации. Данные не продаём, для рекламы третьим лицам не передаём, решений, порождающих юридические последствия, только на основе автоматической обработки не принимаем.</p>
  <h2>4. Кому передаются данные</h2>
  <ul><li>ООО «Яндекс» (Россия) — Яндекс Метрика, после вашего согласия;</li>
  <li>хостинг-провайдер сервера оператора (Индонезия) — только данные бота @rebornlab_bot (мониторинг сайтов в Telegram);</li>
  <li>ООО «Яндекс» (Россия) — сервис ИИ Yandex Cloud: обрабатывает сообщения чат-помощника «Ник на связи» (без почты и телефонов);</li>
  <li>ООО НКО «ЮМани» (ЮKassa, Россия) — приём оплаты; данные карты вводятся на стороне ЮKassa и оператору не передаются;</li>
  <li>ООО «РЕГ.РУ» (Россия) — хостинг сервера оператора: на нём размещён сайт rebornlab.ru и хранятся заявки, переписка с чат-помощником «Ник на связи» и сведения о заказах;</li>
  <li>Telegram (ОАЭ) и WhatsApp — только переписка, если вы сами выбрали этот мессенджер для связи или пользуетесь ботом @rebornlab_bot. Оператору в Telegram приходит лишь сигнал о новой заявке — без вашего контакта и текста заявки;</li>
  <li>ООО «Яндекс» (Россия) — почтовый ящик оператора: копии заявок отправляются в него с сервера в России; письма, которые вы сами пишете на info@rebornlab.ru, принимает почтовый сервер оператора в России и пересылает в тот же ящик.</li></ul>
  <h2>5. Трансграничная передача</h2>
  <p>Заявки, переписка с чат-помощником «Ник на связи» и сведения о заказах хранятся на сервере в России (ООО «РЕГ.РУ»), письма с ними уходят в Яндекс Почту (Россия); письма на info@rebornlab.ru тоже принимает сервер в России. Трансграничная передача возможна только в двух случаях: данные бота @rebornlab_bot (сервер в Индонезии) и переписка в Telegram или WhatsApp, если вы сами выбрали этот способ связи. Такая передача выполняется в порядке ст. 12 Федерального закона № 152-ФЗ, на основании вашего согласия и только в объёме, необходимом для целей из раздела 2. Данные заявок на серверах не продаются и не передаются иным лицам, кроме указанных в разделе 4.</p>
  <h2>6. Как мы защищаем данные</h2>
  <ul><li>передача только по защищённому соединению (HTTPS);</li><li>доступ к данным — только у оператора, по ключам, без паролей в открытом виде; серверы закрыты от посторонних подключений;</li>
  <li>запись содержимого полей форм в Вебвизоре отключена;</li>
  <li>регулярное резервное копирование в зашифрованном виде;</li><li>данные удаляются по окончании сроков из раздела 2.</li></ul>
  <h2>7. Ваши права</h2>
  <p>Вы можете узнать, какие ваши данные у нас есть, потребовать уточнить, заблокировать или удалить их, отозвать согласие. Напишите: ${PD_CONTACT}. Ответим в течение 10 рабочих дней. Вы вправе обратиться в Роскомнадзор или в суд.</p>
  <h2>8. Cookie</h2>
  <p>Cookie используются для статистики посещений (Яндекс Метрика, включая Вебвизор) и подключаются только после нажатия «Согласен». Отключить cookie можно в настройках браузера — сайт продолжит работать.</p>
  <h2>9. Изменения</h2>
  <p>Политика может обновляться; актуальная редакция всегда на этой странице. Согласие на обработку данных для заявки — <a href="/consent/">на отдельной странице</a>.</p></div>`,
}))
const consentPage = (slug, title, intro, data, purpose, extra) => write(`${slug}/index.html`, shell({
  title: `${title} — REBORN LAB`,
  description: `${title}: текст согласия на обработку персональных данных на сайте rebornlab.ru.`,
  canonical: `/${slug}/`,
  jsonLd: [crumbsLd([['Главная', '/'], [title, `/${slug}/`]])],
  body: `${legalCss}<div class="wrap page-hd legal" style="max-width:860px">${crumbs([['Главная', '/'], [title, '']])}<h1 style="font-size:clamp(32px,5vw,52px)">${title}</h1>
  <p class="sub">Редакция от ${LEGAL_DATE}. Отдельный документ согласия по ст. 9 Федерального закона № 152-ФЗ.</p>
  <p>${intro} я свободно, своей волей и в своём интересе даю конкретное, предметное, информированное, сознательное и однозначное согласие оператору — ${esc(OPERATOR)} — на обработку моих персональных данных на следующих условиях.</p>
  <ul><li><b>Данные:</b> ${data}</li><li><b>Цель:</b> ${purpose}</li>
  <li><b>Действия:</b> сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача (предоставление доступа) лицам, указанным в <a href="/privacy/">политике</a>, блокирование, удаление и уничтожение — с использованием средств автоматизации.</li>
  ${extra}
  <li><b>Где хранятся данные:</b> на сервере оператора в России (ООО «РЕГ.РУ»); копия заявки направляется оператору на Яндекс Почту (Россия). Если для связи я сам(а) выбрал(а) Telegram (ОАЭ) или WhatsApp, я согласен(на) на трансграничную передачу данных в объёме переписки в этом мессенджере.</li>
  <li><b>Срок:</b> до достижения цели обработки, но не дольше 3 лет с момента последнего общения, либо до отзыва согласия.</li>
  <li><b>Отзыв:</b> в любой момент, написав оператору: ${PD_CONTACT}. Данные будут удалены в течение 10 рабочих дней, кроме сведений, которые оператор обязан хранить по закону.</li></ul>
  <p>Подробнее — в <a href="/privacy/">политике обработки персональных данных</a>.</p></div>`,
}))
consentPage('consent', 'Согласие на обработку персональных данных', 'Отправляя заявку на сайте rebornlab.ru и отмечая галочку согласия,',
  'контакт для связи (почта, ник в Telegram или номер WhatsApp), текст заявки, адрес сайта (если указан), а также IP-адрес, адрес страницы, дата и время отправки.',
  'рассмотрение заявки, связь со мной, обсуждение задачи и подготовка предложения; защита сайта от спама.', '')
write('consent-order/index.html', '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="https://rebornlab.ru/consent/"><meta http-equiv="refresh" content="0;url=/consent/"><a href="/consent/">Согласие на обработку персональных данных</a>')   // 09.11: оплаты на сайте нет

// ---------- ОФЕРТА (появляется, только когда в data.mjs есть реквизиты: operator + operatorInn) ----------
if (HAS_SELLER) write('oferta/index.html', shell({   // 12.11.2026: без фиксированных цен на сайте; демо — по договорённости; оплата по ссылке исполнителя
  title: 'Публичная оферта — REBORN LAB', description: 'Договор-оферта REBORN LAB: восстановление и перенос сайтов, демо по договорённости, оплата и возврат.', canonical: '/oferta/',
  jsonLd: [crumbsLd([['Главная', '/'], ['Публичная оферта', '/oferta/']])],
  body: `${legalCss}<div class="wrap page-hd legal" style="max-width:860px">${crumbs([['Главная', '/'], ['Публичная оферта', '']])}<h1 style="font-size:clamp(32px,5vw,52px)">Публичная оферта</h1>
  <p class="sub">Редакция от ${LEGAL_DATE}. Предложение заключить договор возмездного оказания услуг (ст. 435, 437, 779 ГК РФ).</p>
  <h2>1. Исполнитель</h2><p>${esc(OPERATOR)}. Связь: ${PD_CONTACT}. Исполнитель не является плательщиком НДС; чек выдаётся через приложение «Мой налог».</p>
  <h2>2. Услуги</h2><ul>
  <li><b>Демо (по договорённости):</b> аналог сайта заказчика (несколько страниц) на современном коде на временном адресе: сайт выглядит и работает как прежде, но пока без системы управления (CMS) — её подключают позже, при основной работе. Демо нужно, чтобы заказчик увидел результат до основной оплаты. Делается, только если стороны договорились о нём письменно; стоимость и срок согласуются заранее. На демо уходит реальная работа, поэтому <b>после того как демо подготовлено и показано заказчику, его оплата не возвращается</b>.</li>
  <li><b>Как идёт работа:</b> проверка сайта — бесплатно; исполнитель называет цену и срок письменно; при желании заказчика — демо; затем предоплата и полная работа (все страницы, формы, https, перенос на сервер в России); запуск на вашем домене; по желанию — подключение системы управления.</li>
  <li><b>Восстановление и перенос сайта</b> (из веб-архива, резервной копии или выгрузки товаров), пересборка сайта с Тильды или Битрикса на лёгкий движок, доработки, сайты и боты — цена и срок согласуются с заказчиком письменно (в мессенджере или по почте) до начала работы. Цена зависит от объёма и сложности сайта (число страниц, движок, каталоги, магазины, личные кабинеты, интеграции) и называется после бесплатной проверки.</li></ul>
  <h2>3. Как заключается договор</h2><p>Договор заключён с момента оплаты (акцепт оферты): по ссылке на оплату или по реквизитам, которые прислал исполнитель. Оплата — через ЮKassa (ООО НКО «ЮМани»): банковская карта или СБП. Данные карты вводятся на стороне ЮKassa, исполнитель их не получает. Основная работа начинается после предоплаты, размер которой согласуется письменно.</p>
  <h2>4. Результат и приёмка</h2><p>Результат показывается заказчику на временном или его собственном адресе. Если в течение 5 дней после показа заказчик не прислал замечаний, работа считается принятой. Замечания в пределах согласованной задачи исправляются без доплаты. Восстановление из веб-архива возможно в объёме, который в нём сохранился: если чего-то в архиве нет, исполнитель сообщает об этом до начала работы.</p>
  <h2>5. Возврат</h2><p>Если услуга не оказана в согласованный срок по вине исполнителя — возвращается вся сумма. Оплата согласованного демо после того, как демо подготовлено и показано заказчику, не возвращается: она покрывает уже выполненную работу. Заказчик вправе отказаться от услуги в любой момент, оплатив фактически выполненную работу (ст. 32 Закона «О защите прав потребителей», ст. 782 ГК РФ). Возврат — тем же способом, что и оплата, в течение 10 дней после заявления, направленного по контактам из раздела 1.</p>
  <h2>6. Права на материалы сайта</h2><p>Заказчик подтверждает, что обладает правами на материалы сайта (тексты, изображения, логотипы, товарные данные) либо правом на их использование, в том числе при восстановлении сайта из веб-архива, резервной копии или выгрузки. Исполнитель восстанавливает сайт по поручению заказчика, не проверяет законность этих прав и не отвечает за претензии третьих лиц к содержанию сайта.</p>
  <h2>7. Ответственность</h2><p>Исполнитель не гарантирует позиции сайта в поисковых системах и не отвечает за работу сторонних сервисов (хостинга заказчика, регистратора домена, поисковиков).</p>
  <h2>8. Заказчики — организации и ИП</h2><p>Если заказчиком является юридическое лицо или индивидуальный предприниматель, положения Закона «О защите прав потребителей» не применяются; отношения сторон регулируются Гражданским кодексом РФ.</p>
  <h2>9. Персональные данные</h2><p>Обрабатываются только данные, необходимые для связи и оказания услуги (контакт, адрес сайта, описание задачи, сведения о платеже), на основании согласия заказчика и договора. Состав данных, сроки хранения и порядок отзыва согласия — в <a href="/privacy/">политике</a> и <a href="/consent/">согласии</a>.</p>
  <h2>10. Споры</h2><p>Споры решаются переговорами; претензию можно направить по контактам из раздела 1, ответ — в течение 10 дней. При недостижении согласия спор рассматривается в порядке, установленном законодательством РФ.</p>
  <h2>11. Срок действия и изменения</h2><p>Предложение действует с даты публикации на rebornlab.ru до момента его отзыва исполнителем. Исполнитель может изменить оферту, опубликовав новую редакцию на этой странице; новая редакция применяется к отношениям, возникшим после её публикации. К уже оплаченным услугам применяется редакция, действовавшая на момент оплаты.</p></div>`,
}))

write('404.html', shell({ title: 'Страница не найдена — REBORN LAB', description: 'Такой страницы нет.', canonical: '/404.html',
  body: `<div class="wrap page-hd"><div class="kicker">404</div><h1>Такой страницы <span style="color:var(--acc)">нет</span></h1><p class="sub">Зато есть <a href="/#uslugi" style="color:var(--acc)">услуги</a>, <a href="/journal/" style="color:var(--acc)">журнал</a> и <a href="/contact/" style="color:var(--acc)">форма для вашей задачи</a>.</p></div><div style="height:120px"></div>` }))

// ---------- assets, sitemap, robots, rss ----------
for (const d of ['assets']) mkdirSync(path.join(OUT, d), { recursive: true })
copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(OUT, 'assets/styles.css'))
copyFileSync(path.join(ROOT, 'src/main.js'), path.join(OUT, 'assets/main.js'))
if (existsSync(path.join(ROOT, 'src/assets/journal'))) {   // 06.11: обложки статей
  mkdirSync(path.join(OUT, 'assets/journal'), { recursive: true })
  for (const f of readdirSync(path.join(ROOT, 'src/assets/journal'))) copyFileSync(path.join(ROOT, 'src/assets/journal', f), path.join(OUT, 'assets/journal', f))
}
if (existsSync(path.join(ROOT, 'src/assets/services'))) { mkdirSync(path.join(OUT, 'assets/services'), { recursive: true }); for (const f of readdirSync(path.join(ROOT, 'src/assets/services'))) copyFileSync(path.join(ROOT, 'src/assets/services', f), path.join(OUT, 'assets/services', f)) }   // 10.11: картинки карточек услуг
for (const f of ['favicon.svg', 'og.jpg', 'logo.png', 'svoya-liniya-logo.jpg', 'nick.jpg']) if (existsSync(path.join(ROOT, 'src/assets', f))) copyFileSync(path.join(ROOT, 'src/assets', f), path.join(OUT, 'assets', f))

const urls = [['/', today, '1.0'], ['/journal/', POSTS[0]?.date || today, '0.8'], ['/about/', today, '0.5'], ['/contact/', today, '0.6'], ['/beget/', today, '0.9'], ['/beget/server/', today, '0.8'], ['/beget/vosstanovit/', today, '0.8'], ['/beget/voprosy/', today, '0.8'], ['/vosstanovlenie-sajta/', today, '0.8'], ['/beget/pravila/', today, '0.4'], ['/oferta/', today, '0.3'],
  ...SERVICES.map((s) => [`/services/${s.slug}/`, today, '0.8']), ...POSTS.map((p) => [`/journal/${p.slug}/`, p.updated || p.date, '0.7'])]
// 09.11 (Ник): поиск по всему сайту — индекс /search.json (страницы, услуги, статьи, вопросы); noindex и закрытое сюда не попадает
{
  const strip = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const items = [
    { t: 'Статус восстановления Бегет', u: '/beget/', d: 'Живые замеры: серверы, сайты, график', k: 'Бегет' },
    { t: 'Мониторинг серверов Бегет по IP', u: '/beget/server/', d: 'Проверка сервера: включён ли, на каком сервере сайт, имя сервера, очередь восстановления', k: 'Бегет' },
    { t: 'Можно ли восстановить сайт', u: '/beget/vosstanovit/', d: 'Что сохранилось в веб-архиве и Яндекс Картинках', k: 'Бегет' },
    { t: 'Вопросы и ответы', u: '/beget/voprosy/', d: 'Сайт, почта, домен, копии, переезд', k: 'Бегет' },
    { t: 'Восстановление сайта: тарифы и сроки', u: '/vosstanovlenie-sajta/', d: 'Вернём сайт после сбоя хостинга · демо за 2–3 часа', k: 'Услуги' },
    { t: 'Услуги', u: '/#uslugi', d: 'Сайты, сервисы, AI, автоматизация, SEO', k: 'Услуги' },
    { t: 'Журнал', u: '/journal/', d: 'Разборы, кейсы и инструкции', k: 'Журнал' },
    { t: 'Обо мне', u: '/about/', d: 'Николай Чечельницкий — кто стоит за REBORN LAB', k: 'Страница' },
    { t: 'Контакты', u: '/contact/', d: 'Обсудить задачу', k: 'Страница' },
    ...SERVICES.map((s) => ({ t: s.title, u: `/services/${s.slug}/`, d: s.lead, k: 'Услуги' })),
    ...POSTS.map((p) => ({ t: p.title, u: `/journal/${p.slug}/`, d: p.description, k: 'Журнал' })),
  ]
  const vp = path.join(ROOT, 'beget/voprosy/index.html')
  if (existsSync(vp)) for (const m of readFileSync(vp, 'utf8').matchAll(/<summary>([^<]+)<\/summary>/g)) items.push({ t: strip(m[1]), u: '/beget/voprosy/?q=' + encodeURIComponent(strip(m[1])), d: 'Вопросы и ответы', k: 'Вопрос' })
  write('search.json', JSON.stringify(items.map((x) => ({ ...x, t: strip(x.t), d: strip(x.d).slice(0, 140) }))))
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, pr]) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`)
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /demo/\n\n# AI-поисковики приветствуются (GEO)\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: YandexBot\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`)
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>REBORN LAB — Журнал</title><link>${SITE.url}/journal/</link><description>AI, автоматизация, сайты, SEO и GEO — практические разборы.</description><language>ru</language>\n${POSTS.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE.url}/journal/${p.slug}/</link><guid>${SITE.url}/journal/${p.slug}/</guid><pubDate>${new Date(p.time ? isoDT(p) : p.date + 'T09:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}\n</channel></rss>\n`)
write('llms.txt', `# REBORN LAB\n\n> ${SITE.tagline}. Принесите задачу — соберём решение: сайты, веб-сервисы, AI-ассистенты и агенты, автоматизация, SEO/GEO, дизайн.\n\n## Услуги\n${SERVICES.map((s) => `- [${s.seoTitle}](${SITE.url}/services/${s.slug}/): ${s.lead}`).join('\n')}\n\n## Журнал\n${POSTS.map((p) => `- [${p.title}](${SITE.url}/journal/${p.slug}/): ${p.description}`).join('\n')}\n\n## Контакт\n- Telegram: https://t.me/${SITE.telegram}\n`)
{
  const home = readFileSync(path.join(OUT, 'index.html'), 'utf8')
  const foot = home.match(/<footer class="ftr">[\s\S]*?<\/footer>/)[0]
  for (const f of ['beget/index.html', 'beget/server/index.html', 'beget/vosstanovit/index.html', 'beget/voprosy/index.html', 'beget/pravila/index.html', 'vosstanovlenie-sajta/index.html']) {
    const fp = path.join(OUT, f)
    if (!existsSync(fp)) continue
    const news = POSTS.filter((x) => x.slug.startsWith('beget')).map((x) => `<a class="news-card" href="/journal/${x.slug}/">${x.image ? `<img src="${x.image}" alt="" loading="lazy" width="1200" height="630">` : ''}<span class="news-dt">${ruDT(x)}</span><b>${esc(x.title)}</b><span class="news-d">${esc(x.description)}</span></a>`).join('')
    const at = '/' + f.replace(/index\.html$/, '')
    const hdr = `<!--HDR:START-->${HEADER(at === '/beget/pravila/' ? '' : at)}${BEGET_BAR(at)}<!--HDR:END-->`
    let src = readFileSync(fp, 'utf8')
    src = src.includes('<!--HDR:START-->') ? src.replace(/<!--HDR:START-->[\s\S]*?<!--HDR:END-->/, () => hdr) : src.replace(/<body>/, () => '<body>\n' + hdr)
    const html = src.replace(/<footer class="ftr">[\s\S]*?<\/footer>/, () => foot)
      .replace(/<!--NEWS:START-->[\s\S]*?<!--NEWS:END-->/, () => `<!--NEWS:START--><div class="news-grid">${news}</div><!--NEWS:END-->`)
      .replace(/\/assets\/styles\.css(\?v=\w+)?"/, `/assets/styles.css?v=${ASSET_V}"`).replace(/\/assets\/main\.js(\?v=\w+)?"/, `/assets/main.js?v=${ASSET_V}"`)
    writeFileSync(fp, html)
  }
}
writeFileSync(path.join(OUT, 'CNAME'), 'rebornlab.ru\n')
writeFileSync(path.join(OUT, '.nojekyll'), '')
console.log(`built: ${urls.length} urls · ${POSTS.length} posts · ${PROJECTS.length} projects · ${SERVICES.length} services`)
