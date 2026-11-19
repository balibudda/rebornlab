#!/bin/bash
# 19.11.2026: раз в неделю обновляет замеры на страницах хостингов (/hosting/<хостинг>/ — раздел «за неделю», таблица по дням, description).
# launchd ru.rebornlab.hm-week (понедельник 10:00). Лог — /tmp/hm-week-refresh.log
set -e
cd "$HOME/WebstormProjects/rebornlab"
ssh -o BatchMode=yes -o ConnectTimeout=30 vpn-ru 'python3 /root/hmstats.py' > drafts/hm-week.json.new
python3 -c "import json;d=json.load(open('drafts/hm-week.json.new'));assert len(d['providers'])>=20" && mv drafts/hm-week.json.new drafts/hm-week.json
python3 tools-mk_proverka.py publish >/dev/null
node build.mjs >/dev/null
git add drafts/hm-week.json hosting sitemap.xml search.json llms.txt
git commit -qm "Хостинги: замеры за неделю $(date +%d.%m)" || exit 0
git pull -q --rebase --autostash && git push -q
python3 - <<'EOF'
import json, os, urllib.request
hs = sorted(d for d in os.listdir("hosting") if os.path.isfile(f"hosting/{d}/index.html"))
urls = [f"https://rebornlab.ru/hosting/{h}/" for h in hs]
body = json.dumps({"host": "rebornlab.ru", "key": "646c0b7675125b14a2c6f4c8b2b0b7ec", "urlList": urls}).encode()
print("IndexNow", urllib.request.urlopen(urllib.request.Request("https://yandex.com/indexnow", body, {"Content-Type": "application/json"}), timeout=30).status)
EOF
echo "$(date '+%F %T') ok"
