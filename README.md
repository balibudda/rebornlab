# REBORN LAB — rebornlab.ru

Статичный сайт на GitHub Pages (корень ветки `main`). Генератор без зависимостей: `node build.mjs`.

- Данные (проекты, услуги, задачи, рынок) — `src/data.mjs`. Только реальные проекты, без выдуманных цифр.
- Стили и скрипт — `src/styles.css`, `src/main.js` (копируются в `assets/`).
- Журнал — `content/journal/*.md` с front matter (`title`, `description`, `date`, `category`, опционально `updated`, `draft`).
  Новая статья: добавить .md → `node build.mjs` → commit + push.
- Форма заявки → `https://api.rebornlab.ru/lead` (служба `reborn-leads` на сервере vpn-nl) → Telegram Нику.
- Яндекс Метрика: вписать номер счётчика в `SITE.metrikaId` (src/data.mjs) и пересобрать.
- Старый демо-макет «Всё для Победы» — ветка `archive-pobeda-demo`.
