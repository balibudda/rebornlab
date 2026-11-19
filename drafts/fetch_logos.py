#!/usr/bin/env python3
"""19.11.2026: иконки хостингов для рейтинга и страниц (Ник: «лого с каждым добавляй»). Берём с официальных сайтов:
apple-touch-icon / icon из <link rel> / favicon — самую крупную. Кладём локально в assets/hosting-logos/<slug>.<ext> (без внешних запросов на странице)."""
import re, urllib.request, urllib.parse, ssl, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'hosting-logos'; OUT.mkdir(parents=True, exist_ok=True)
SITES = {'regru': 'https://www.reg.ru/', 'timeweb': 'https://timeweb.com/ru/', 'spaceweb': 'https://sweb.ru/', 'ru-center': 'https://www.nic.ru/',
         'jino': 'https://jino.ru/', 'sprinthost': 'https://sprinthost.ru/', 'hostland': 'https://www.hostland.ru/', 'mchost': 'https://mchost.ru/',
         'majordomo': 'https://www.majordomo.ru/', 'ihc': 'https://www.ihc.ru/', 'netangels': 'https://www.netangels.ru/', 'masterhost': 'https://masterhost.ru/',
         'ruweb': 'https://ruweb.net/', 'tilda': 'https://tilda.ru/', 'selectel': 'https://selectel.ru/', 'yandex-cloud': 'https://yandex.cloud/ru/',
         'vk-cloud': 'https://cloud.vk.com/', 'cloud-ru': 'https://cloud.ru/', 'serverspace': 'https://serverspace.ru/', 'firstvds': 'https://firstvds.ru/',
         'vdsina': 'https://www.vdsina.ru/', 'adminvps': 'https://adminvps.ru/', 'aeza': 'https://aeza.net/ru/', 'justhost': 'https://justhost.ru/',
         'fornex': 'https://fornex.com/', 'hostkey': 'https://hostkey.ru/', '4vps': 'https://4vps.su/'}
CTX = ssl.create_default_context()
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'}


def get(u, n=600000):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20, context=CTX) as r:
        return r.read(n), r.headers.get('Content-Type', '')


def cands(base):
    out = []
    try:
        h = get(base)[0].decode('utf-8', 'ignore')
        for m in re.finditer(r'<link[^>]+>', h, re.I):
            t = m.group(0)
            if re.search(r'rel=["\'][^"\']*(apple-touch-icon|icon)[^"\']*["\']', t, re.I):
                href = re.search(r'href=["\']([^"\']+)', t)
                if href:
                    sz = re.search(r'sizes=["\'](\d+)', t)
                    pri = (2 if 'apple-touch' in t else 1) * 1000 + (int(sz.group(1)) if sz else (300 if '.svg' in href.group(1) else 32))
                    out.append((pri, urllib.parse.urljoin(base, href.group(1))))
    except Exception as e:
        print('  главная не открылась:', type(e).__name__)
    out += [(1500, urllib.parse.urljoin(base, '/apple-touch-icon.png')), (10, urllib.parse.urljoin(base, '/favicon.ico'))]
    return [u for _, u in sorted(out, reverse=True)]


for slug, base in SITES.items():
    ok = False
    for u in cands(base):
        try:
            data, ct = get(u, 400000)
        except Exception:
            continue
        ext = 'svg' if ('svg' in ct or u.split('?')[0].endswith('.svg')) else 'png' if ('png' in ct or data[:8] == b'\x89PNG\r\n\x1a\n') else 'ico' if ('icon' in ct or u.split('?')[0].endswith('.ico')) else 'jpg' if 'jpeg' in ct else ''
        if not ext or len(data) < 100 or (ext == 'svg' and b'<svg' not in data[:2000]):
            continue
        for old in OUT.glob(slug + '.*'):
            old.unlink()
        (OUT / f'{slug}.{ext}').write_bytes(data)
        print(f'{slug:13} {ext:4} {len(data):7} {u[:80]}'); ok = True
        break
    if not ok:
        print(f'{slug:13} НЕ НАШЁЛ')
