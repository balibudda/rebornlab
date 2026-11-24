#!/usr/bin/env python3
"""Лендинг «Серверы и защита» (24.11.2026).
Без аргумента -> черновик demo/draft-servery/index.html (noindex).
publish        -> servery/index.html (боевая; только после «публикуй» Ника).
Шапка/подвал/стили берутся из собранной services/site-fix/index.html."""
import json, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tpl = open(os.path.join(ROOT, 'services/site-fix/index.html'), encoding='utf-8').read()
main = open(os.path.join(ROOT, 'drafts/servery-main.part.html'), encoding='utf-8').read()
pub = len(sys.argv) > 1 and sys.argv[1] == 'publish'
URL = 'https://rebornlab.ru/servery/'
TITLE = 'Настройка VPS и облачных серверов, защита от парсеров и ботов, сопровождение | REBORN LAB'
DESC = ('Настрою VPS или облачный сервер под сайт, закрою от парсеров, сканеров и взлома без капчи, '
        'сделаю копии в другой стране и запасной сервер. Мониторинг и сопровождение, сигнал в Telegram. Разбор бесплатно.')

head_end = tpl.index('<link rel="stylesheet"')
head = tpl[:head_end]
# вырезаем всё SEO старой страницы: title, description, canonical, og, twitter
head = re.sub(r'<title>.*?</title>', f'<title>{TITLE}</title>', head, flags=re.S)
head = re.sub(r'<meta (name|property)="(description|og:[^"]+|twitter:[^"]+)"[^>]*>\n?', '', head)
head = re.sub(r'<link rel="canonical"[^>]*>\n?', '', head)
robots = '' if pub else '<meta name="robots" content="noindex, nofollow">\n'
seo = (f'{robots}<meta name="description" content="{DESC}">\n<link rel="canonical" href="{URL}">\n'
       f'<meta property="og:type" content="website">\n<meta property="og:site_name" content="REBORN LAB">\n'
       f'<meta property="og:title" content="{TITLE}">\n<meta property="og:description" content="{DESC}">\n'
       f'<meta property="og:url" content="{URL}">\n<meta property="og:image" content="https://rebornlab.ru/assets/og.jpg">\n'
       '<meta name="twitter:card" content="summary_large_image">\n')
head = head.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + seo, 1) if '<meta charset="utf-8">' in head else head + seo

rest = tpl[head_end:]
ld_start = rest.index('<script type="application/ld+json">')
css_link = rest[:ld_start]
after_ld = rest[rest.index('<script>window.RL_METRIKA'):]

faq = re.findall(r'<summary>(.*?)</summary><p>(.*?)</p>', main, flags=re.S)
ld = [
 {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"Главная","item":"https://rebornlab.ru/"},
  {"@type":"ListItem","position":2,"name":"Услуги","item":"https://rebornlab.ru/#uslugi"},
  {"@type":"ListItem","position":3,"name":"Серверы и защита","item":URL}]},
 {"@context":"https://schema.org","@type":"Service","name":"Настройка серверов, защита сайта от ботов и взлома, сопровождение",
  "description":DESC,"provider":{"@type":"Organization","name":"REBORN LAB","url":"https://rebornlab.ru"},
  "areaServed":"RU","serviceType":"Настройка и сопровождение серверов","url":URL},
 {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":re.sub('<[^>]+>','',a)}} for q,a in faq]},
]
ld_html = ''.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>\n' for x in ld)

# 24.11: шапку — в метки HDR, иначе build.mjs вставляет вторую (было две шапки)
after_ld = re.sub(r'<header class="hdr">[\s\S]*?</header>', lambda m: '<!--HDR:START-->' + m.group(0) + '<!--HDR:END-->', after_ld, count=1)
body_start = after_ld.index('<main>') + len('<main>')
body_end = after_ld.index('</main>')
out = head + css_link + ld_html + after_ld[:body_start] + '\n' + main + '\n' + after_ld[body_end:]

dst = os.path.join(ROOT, 'servery/index.html' if pub else 'demo/draft-servery/index.html')
os.makedirs(os.path.dirname(dst), exist_ok=True)
open(dst, 'w', encoding='utf-8').write(out)
print(dst, len(out))
