# REBORN LAB — rebornlab.ru

Статичный сайт на GitHub Pages (корень ветки `main`). Генератор без зависимостей: `node build.mjs`.

- Данные (проекты, услуги, задачи, рынок) — `src/data.mjs`. Только реальные проекты, без выдуманных цифр.
- Стили и скрипт — `src/styles.css`, `src/main.js` (копируются в `assets/`).
- Журнал — `content/journal/*.md` с front matter (`title`, `description`, `date`, `category`, опционально `updated`, `draft`).
  Новая статья: добавить .md → `node build.mjs` → commit + push.
- Форма заявки → `https://api.rebornlab.ru/lead` → Telegram.
- Яндекс Метрика — `SITE.metrikaId` (src/data.mjs), загружается после согласия посетителя.
