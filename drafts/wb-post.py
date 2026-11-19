#!/usr/bin/env python3
"""19.11.2026: черновик поста про WB Банк для vc.ru — страница, чтобы Ник скопировал текст с картинками разом.
md с рабочего стола → demo/draft-wb-bank/index.html (noindex, светлая простая вёрстка — удобно копировать в редактор vc.ru) + картинки."""
import re, html, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
MD = ROOT / 'drafts' / 'wb-post.md'   # 19.11: полный текст поста (файл на рабочем столе может быть открыт у Ника)
OUT = ROOT / 'demo' / 'draft-wb-bank'
OUT.mkdir(parents=True, exist_ok=True)


def inl(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<a href="\2">\1</a>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![*\w])\*([^*]+)\*(?!\*)', r'<i>\1</i>', t)
    return t


src = MD.read_text()
blocks = re.split(r'\n\s*\n', src.strip())
out = []
for b in blocks:
    b = b.strip()
    if b == '---':
        out.append('<hr>')
    elif b.startswith('# '):
        out.append(f'<h1>{inl(b[2:])}</h1>')
    elif b.startswith('## '):
        out.append(f'<h2>{inl(b[3:])}</h2>')
    elif b.startswith('### '):
        out.append(f'<h3>{inl(b[4:])}</h3>')
    elif b.startswith('>'):
        out.append('<blockquote>' + inl(re.sub(r'^>\s?', '', b, flags=re.M)) + '</blockquote>')
    elif b.startswith('|'):
        rows = [[c.strip() for c in l.strip().strip('|').split('|')] for l in b.split('\n') if not re.match(r'^\|[-|\s]+\|$', l.strip())]
        out.append('<table><tr>' + ''.join(f'<th>{inl(c)}</th>' for c in rows[0]) + '</tr>' +
                   ''.join('<tr>' + ''.join(f'<td>{inl(c)}</td>' for c in r) + '</tr>' for r in rows[1:]) + '</table>')
    elif re.match(r'^\d+\.\s', b):
        out.append('<ol>' + ''.join(f'<li>{inl(re.sub(r"^\d+\.\s*", "", l))}</li>' for l in b.split('\n') if l.strip()) + '</ol>')
    elif b.startswith('- '):
        out.append('<ul>' + ''.join(f'<li>{inl(l[2:])}</li>' for l in b.split('\n') if l.strip()) + '</ul>')
    else:
        out.append(f'<p>{inl(b)}</p>')
body = '\n'.join(out)
# картинки: скриншот уведомления — после первого абзаца истории; схема оснований — перед таблицей; сроки — в разделе «Сколько длится»
body = body.replace('<p>Я самозанятый.', '<figure style="max-width:420px;margin:22px auto"><img src="wb-notice.png" alt="Уведомление WB Банка: дистанционный доступ к кошельку ограничен"><figcaption>Уведомление в приложении WB Банка, 19.11.2026</figcaption></figure>\n<p>Я самозанятый.', 1)
body = body.replace('<h2>Что я нашёл</h2>', '<h2>Что я нашёл</h2>\n<figure><img src="wb-types.png" alt="30 историй блокировок WB Кошелька по основаниям"><figcaption>30 публичных историй, май 2025 — ноябрь 2026</figcaption></figure>', 1)
body = body.replace('<h3>Сколько длится</h3>', '<h3>Сколько длится</h3>\n<figure><img src="wb-time.png" alt="Сколько длится разблокировка и вывод денег из WB Кошелька"><figcaption>Сроки из историй, где есть даты</figcaption></figure>', 1)
# 19.11 (Ник: «где все 30 историй, скрины и чем закончились — чтобы был разрыв»): карточки со скриншотами
import json as _j
ST = _j.loads((ROOT / 'drafts' / 'wb-stories.json').read_text())
ITOG = {1: 'итог не известен', 2: 'итог не известен', 3: 'доступ вернули после документов — по словам автора статьи, за несколько дней',
        4: 'итог не известен', 5: 'ответа по существу нет', 6: 'окончательного ответа нет', 7: 'поддержка отвечает шаблоном раз в неделю, деньги заморожены',
        8: 'подал на закрытие; документы принимают только в московском офисе или Почтой России', 9: 'банк предложил на выбор: документы или закрытие счёта',
        10: 'ждёт перевода остатка больше двух недель', 11: 'итог не известен', 12: 'банк прислал инструкцию, как закрыть кошелёк и вывести деньги',
        13: 'закрытие и вывод денег — около 30 дней', 14: 'юристы советуют претензию, потом суд', 15: 'деньги вернулись на транзитный счёт банка, ждёт с октября',
        16: 'счёт закроют через 31 день после получения заявления', 17: 'повторное заявление почти месяц не берут в работу',
        18: 'банк ссылается на арест от налоговой, автор пишет, что ареста нет', 19: 'ответа по существу пока нет', 20: 'деньги удерживают уже неделю',
        21: 'банк: блокировка автоматическая, список документов не дают', 22: 'выписку отправила, разблокировки нет', 23: 'выписку и описание операций отправила, сроков нет',
        24: 'звонка из банка нет', 25: 'хочет закрыть счёт, но не закрывается накопительный счёт', 26: 'обновление паспорта через Госуслуги не помогло, итога нет',
        27: 'итога нет', 28: 'ограничение сняли через 2 дня после обновления паспорта', 29: 'ограничение сняли через 29 дней', 30: 'банк ответил через 5,5 месяца: «счёт активен»'}
SEC = {'Проверка «откуда деньги» (115-ФЗ, п. 6.4.5 договора)': 'п. 6.4.5 и 115-ФЗ', 'Долгий вывод остатка после закрытия': 'вывод денег после закрытия',
       'Антифрод «защита от мошенничества» (п. 4.3.9, 161-ФЗ), ноябрь 2026': '«защита от мошенничества», п. 4.3.9', 'Паспорт и идентификация (банк тоже ссылается на 115-ФЗ)': 'паспорт и идентификация'}
cards = []
for r in ST:
    if r['n'] == 31:
        continue
    what = re.sub(r'\s+', ' ', r['what']).strip()
    url = r['url'] or next(x['url'] for x in ST if x['n'] == 2)
    cards.append(f'<div class="st"><div class="sh"><b>История {r["n"]}</b> · {html.escape(r["date"])} · {html.escape(SEC.get(r["sec"], r["sec"]))}</div>'
                 f'<p>{html.escape(what)}</p><p class="it"><b>Чем кончилось:</b> {html.escape(ITOG.get(r["n"], "итог не известен"))}</p>'
                 f'<figure><a href="{url}"><img src="shots/s{r["n"]}.jpg" alt="Скриншот истории {r["n"]}" loading="lazy"></a><figcaption>Источник: <a href="{url}">{html.escape(('banki.ru, вопрос ' + r['src'].split(',')[0]) if re.match(r'^\d+(,|$)', r['src']) else re.sub(r"[(].*", "", r["src"]).strip())}</a></figcaption></figure></div>')
# AFTER_SPLIT: всё после «## Все 30 историй» в md, начиная с «Что видно из этих 30 историй», ставим после карточек
_tail = ''
if '<h2>Что видно из этих 30 историй</h2>' in body:
    body, _tail = body.split('<h2>Что видно из этих 30 историй</h2>', 1)
    _tail = '<h2>Что видно из этих 30 историй</h2>' + _tail
body += '\n' + '\n'.join(cards) + '\n' + _tail
# мой вопрос — скриншот рядом со ссылкой в начале
body = body.replace('А потом пошёл искать, один ли я такой.</p>',
                    'А потом пошёл искать, один ли я такой.</p>\n<figure><a href="https://www.banki.ru/services/questions-answers/question/1147283/"><img src="shots/s31.jpg" alt="Мой вопрос WB Банку на banki.ru"></a><figcaption>Мой вопрос на banki.ru, 19.11.2026</figcaption></figure>', 1)
page = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Черновик: WB Банк — пост для vc.ru</title>
<style>body{{margin:0;background:#f4f4f2;color:#1b1b1b;font:18px/1.6 -apple-system,"Segoe UI",Roboto,sans-serif}}
.w{{max-width:760px;margin:0 auto;padding:28px 20px 80px;background:#fff}}.note{{background:#fff7d6;border:1px solid #f0d77a;padding:12px 14px;border-radius:10px;font-size:15px;margin-bottom:20px}}
h1{{font-size:30px;line-height:1.25}}h2{{font-size:24px;margin-top:34px}}h3{{font-size:20px}}a{{color:#1a5fd6}}
blockquote{{margin:18px 0;padding:12px 16px;background:#f2f6ff;border-left:4px solid #1a5fd6;border-radius:6px}}
table{{border-collapse:collapse;width:100%;font-size:16px;margin:16px 0}}th,td{{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}}th{{background:#f6f6f6}}
figure{{margin:22px 0}}figure img{{width:100%;height:auto;border-radius:10px;border:1px solid #eee}}figcaption{{font-size:14px;color:#777;margin-top:6px;text-align:center}}
hr{{border:0;border-top:1px solid #e6e6e6;margin:26px 0}}.st{{border:1px solid #e8e8e8;border-radius:12px;padding:14px 16px;margin:18px 0}}.st .sh{{font-size:14px;color:#666}}.st .it{{background:#f7f7f7;padding:8px 10px;border-radius:8px}}</style></head><body><div class="w">
<div class="note">Черновик для vc.ru. Выделите всё (Cmd+A внутри текста) и вставьте в редактор vc.ru — картинки и ссылки перенесутся. Если какая-то картинка не вставилась — перетащите её мышкой отдельно. Страница закрыта от поисковиков.</div>
{body}
</div></body></html>'''
(OUT / 'index.html').write_text(page)
print(OUT / 'index.html')
