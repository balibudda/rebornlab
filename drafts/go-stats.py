#!/usr/bin/env python3
"""20.11.2026 (Ник: «историю переходов собирай на партнёрки»). Переходы rebornlab.ru/go/* на сайты хостингов.
Журнал /var/log/nginx/rl-go.log (+ архивы .gz), без IP: время, адрес, устройство (pc/mobile/bot), страница-источник.
  go-stats            — сводка за 7 дней (печать)
  go-stats 30         — за 30 дней
  go-stats --send     — то же Нику в бот (rl-notify), cron по понедельникам"""
import collections, glob, gzip, json, os, re, subprocess, sys, time

days = next((int(a) for a in sys.argv[1:] if a.isdigit()), 7)
since = time.strftime('%Y-%m-%dT%H:%M', time.localtime(time.time() - days * 86400))
NAMES = {'reg': 'REG.RU', 'regru': 'REG.RU', 'timeweb': 'Timeweb', 'sprinthost': 'Sprinthost', 'mchost': 'Макхост', 'majordomo': 'Majordomo', 'ihc': 'IHC',
         'jino': 'Джино', 'ruweb': 'RuWeb', 'netangels': 'NetAngels', 'spaceweb': 'SpaceWeb', 'fornex': 'Fornex', 'vdsina': 'VDSina', 'adminvps': 'AdminVPS',
         'firstvds': 'FirstVDS', 'selectel': 'Selectel', 'cloud-ru': 'Cloud.ru', 'masterhost': 'Masterhost', 'hostland': 'Hostland', 'hostkey': 'HOSTKEY',
         'justhost': 'JustHost', '4vps': '4VPS', 'aeza': 'Aeza', 'serverspace': 'Serverspace', 'vk-cloud': 'VK Cloud', 'yandex-cloud': 'Yandex Cloud',
         'ru-center': 'RU-CENTER', 'tilda': 'Tilda'}
by_host, by_page, by_day, dev = collections.Counter(), collections.Counter(), collections.Counter(), collections.Counter()
for f in sorted(glob.glob('/var/log/nginx/rl-go.log*')):
    op = gzip.open if f.endswith('.gz') else open
    try:
        for l in op(f, 'rt', errors='replace'):
            p = l.split(' ', 3)
            if len(p) < 3 or p[0][:16] < since:
                continue
            t, uri, d = p[0], p[1], p[2]
            ref = p[3].strip() if len(p) > 3 else ''
            if d == 'bot':
                continue
            m = re.match(r'/go/(?:h-)?([a-z0-9-]+)', uri)
            k = m.group(1) if m else uri
            k = 'regru' if k.startswith('reg-') or k == 'regru' else k
            by_host[NAMES.get(k, k)] += 1
            page = re.sub(r'^https?://(www\.)?rebornlab\.ru', '', ref) or '(без источника)'
            by_page[page.split('?')[0]] += 1
            by_day[t[:10]] += 1
            dev[d] += 1
    except OSError:
        pass
total = sum(by_host.values())
lines = [f'🔗 Переходы на хостинги с rebornlab.ru за {days} дн.: {total}' + (f' (телефон {dev["mobile"]}, компьютер {dev["pc"]})' if total else '')]
if total:
    lines.append('\nПо хостингам:\n' + '\n'.join(f'  {n} — {c}' for n, c in by_host.most_common(15)))
    lines.append('\nОткуда переходили:\n' + '\n'.join(f'  {p} — {c}' for p, c in by_page.most_common(8)))
    lines.append('\nПо дням: ' + ', '.join(f'{d[8:10]}.{d[5:7]} — {c}' for d, c in sorted(by_day.items())))
text = '\n'.join(lines)
if '--send' in sys.argv:
    payload = json.dumps({'text': text, 'mail': False}).encode()
    subprocess.run(['ssh', '-T', '-F', '/dev/null', '-i', '/root/.ssh/rl_notify', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=12',
                    'root@202.155.157.101'], input=payload, capture_output=True, timeout=60)
else:
    print(text)
