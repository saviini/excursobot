---
alwaysApply: false
---

# Implementation plan — MVP Telegram bot

**Важно:** у каждого пункта есть статус: `TODO` / `DONE`. Начинать работу нужно с первого невыполненного пункта в списке (сверху вниз).

---

## Milestone 1 — Project scaffolding & initial configuration
- TODO: Создать приватный репозиторий на GitHub и подключить Cursor.
- TODO: **Перед первым коммитом** создать `.gitignore` и включить туда `.env`, `.env.*`, `venv/`, `__pycache__/`, `dist/`, `.pytest_cache/`, `.DS_Store` и т.п. (ВАЖНО: .env файлы не должны попасть в git).
- TODO: Инициализировать проект: создать `pyproject.toml` (или `requirements.txt`), настроить минимальную metadata и зависимости.
- TODO: Добавить `python-dotenv` в зависимости (чтобы локально загружать env vars).
- TODO: Создать структуру каталогов (см. file_structure_document.mdc): `src/`, `src/bot/`, `src/services/`, `src/handlers/`, `src/lib/`, `tests/`, `scripts/`, `docs/`.
- TODO: Добавить `.env.example` с перечислением переменных: `TELEGRAM_TOKEN`, `OPENAI_API_KEY`, `WEBHOOK_URL`, `PORT`, `ENV`.
- TODO: Добавить минимальный `README.md` с инструкцией: как запустить локально (venv, pip install -r requirements), как настроить .env, как запускать в polling режиме.
- TODO: Создать `Dockerfile` на основе `python:3.12-slim` и следовать **строго** порядку шагов (editable install):
  - TODO: `COPY pyproject.toml ./`
  - TODO: `COPY src/ ./src/`  # ОБЯЗАТЕЛЬНО перед `pip install -e .`
  - TODO: `RUN pip install --no-cache-dir -e .`
- TODO: Создать `.dockerignore` для оптимизации контекста сборки (`.git`, `venv`, `.env`, `__pycache__`, `*.pyc`, `dist`).
- TODO: Добавить базовые dev-зависимости: `pytest`, `flake8`/`ruff`, `black`/`prettier` (в зависимости от предпочтений), `mypy` (опционально).
- TODO: Настроить базовый CI workflow `.github/workflows/ci.yml` с тестами и линтингом (проверка на PR).

---

## Milestone 2 — Core Bot + OpenAI integration (MVP feature)
- TODO: Создать `src/bot/__init__.py` и `src/bot/app.py` (точка входа для приложения).
- TODO: Установить и настроить Telegram Bot SDK (например `python-telegram-bot` v.XX если выбираем Python) и официальную OpenAI SDK (`openai` python package) в зависимостях.
- TODO: **ВАЖНО (asyncio)**: не использовать `asyncio.run()` в `main` для контейнерной среды; вызывать `application.run_polling()` или `application.run_webhook()` напрямую — python-telegram-bot управляет event loop самостоятельно.
- TODO: Реализовать `src/handlers/location_handler.py`:
  - TODO: получать `message.location.latitude` и `message.location.longitude`;
  - TODO: валидировать координаты;
  - TODO: логировать приход локации (chat_id, user_id, lat, lon, timestamp).
- TODO: Сделать `src/services/openai_client.py` — обёртку над OpenAI SDK:
  - TODO: функция `get_fact_for_location(lat, lon)` формирует промпт и вызывает `gpt-4.1-mini`;
  - TODO: ограничивать длину и явно просить ответ на русском, 1–2 предложения;
  - TODO: обрабатывать и логировать ошибки от OpenAI (rate limit, 5xx).
- TODO: Реализовать flow: при получении локации — бот вызывает openai_client → получает текст → отправляет `send_message(chat_id, text)`.
- TODO: Добавить базовую обработку ошибок и fallback-ответ (например: «Не получилось найти факт, попробуйте ещё раз через минуту»).
- TODO: Добавить базовый rate limiter per-chat (например: не чаще 1 запроса в 10 секунд на одного пользователя) в `src/lib/rate_limiter.py`.
- TODO: Добавить `src/lib/logger.py` с удобным логированием (structured logs — timestamp, level, event).
- TODO: Написать unit-тесты для openai_client (mock OpenAI) и handler (mock Telegram update) в `tests/`.

---

## Milestone 3 — Local testing, Deployment on Railway, basic monitoring
- TODO: Реализовать переключатель Polling vs Webhook в `src/index.py` / `src/bot/app.py` на основе `ENV` или переменной `WEBHOOK_URL`: если `WEBHOOK_URL` задан — запускать webhook, иначе polling (это удобно для Cursor локал dev).
- TODO: Для webhook: реализовать `/webhook` endpoint (FastAPI/Flask/Starlette) и проброс HTTP requests к Telegram.
- TODO: Настроить команды в боте: `/start`, `/stop` (для остановки live-рассылки), `/help`.
- TODO: Подготовить Railway Deployment:
  - TODO: добавить `railway.json` (опционально) и инструкции в README;
  - TODO: задать env vars в Railway (TELEGRAM_TOKEN, OPENAI_API_KEY, WEBHOOK_URL, PORT);
  - TODO: настроить автодеплой с GitHub → Railway.
- TODO: Провести smoke tests в проде: отправить локацию, убедиться, что бот отвечает корректно; проверить webhook delivery и retries.
- TODO: Настроить простое мониторинг-уведомление (например, на Rollbar/Sentry или просто логирование ошибок в stdout) и health-check endpoint `/health`.
- TODO: Добавить в README инструкции по деплою и rollback.
- TODO: Добавить `Dockerfile`-based build & локальное тестирование контейнера: `docker build -t telegram-facts .` и `docker run -e ...`.
- TODO: Проверить Docker build на соответствие шагов editable install (см. Milestone 1).

---

## Milestone 4 — v1.1 (optional) — Live location & periodic facts
- TODO: Реализовать детектирование `live_period` в `message.location` и обработку edited live-location updates.
- TODO: Спроектировать runtime-state (в памяти или лёгкая БД) для хранения активных live-сессий: `chat_id`, `message_id`, `expires_at`, `last_sent_at`, `current_lat`, `current_lon`.
- TODO: Добавить механизм планировщика задач (например APScheduler или встроенный asyncio loop tasks) для отправки нового факта каждые 10 минут на активную сессию.
- TODO: Защититься от спама: ограничение — не более 6 фактов в час на одного пользователя и возможность остановки `/stop`.
- TODO: Тестировать живые локации из мобильного клиента Telegram (поделиться live-location и наблюдать обновления).
- TODO: Обработать сценарии: пользователь выходит/закрывает live, Telegram не шлёт обновления, истёк `live_period`.

---

# Acceptance Checklist
- TODO: Репозиторий создан и защищён `.gitignore` **перед первым коммитом**.
- TODO: Локальный запуск в режиме polling: бот запускается, принимает `message.location` и логирует координаты.
- TODO: OpenAI-запрос: `gpt-4.1-mini` вызывается корректно, и ответ отправляется пользователю (1–2 предложения, русский).
- TODO: Переменные окружения (`TELEGRAM_TOKEN`, `OPENAI_API_KEY`, `WEBHOOK_URL`) читаются из `.env` при локальном запуске.
- TODO: Docker image собирается успешно и соответствует порядку `COPY pyproject.toml`, `COPY src/`, `pip install -e .`.
- TODO: Деплой на Railway: приложение поднимается, webhook обрабатывает обновления, бот отвечает в продакшн-чате.
- TODO: Базовый rate limit работает (защита от частых запросов).
- TODO: Unit-тесты для core логики (openai client + handler) проходят.
- TODO: Линтинг и форматирование настроены (flake8/ruff + black) и CI их проверяет.

---

**@Cursor**: После завершения задачи поменяй её статус на DONE и добавь краткий маркер «// done by Cursor» с описанием, что именно сделано.

