# ExcursoBot - Telegram Bot для интересных фактов о местах

Telegram бот, который генерирует интересные факты о местах с помощью OpenAI GPT-4o-mini.

## 🚀 Быстрый старт

### 1. Создание бота в Telegram
1. Напишите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям и получите `TELEGRAM_TOKEN`

### 2. Получение OpenAI API ключа
1. Зарегистрируйтесь на [OpenAI Platform](https://platform.openai.com/)
2. Создайте API ключ в разделе API Keys
3. Скопируйте ключ

### 3. Локальный запуск

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd excursobot

# Установите зависимости
npm install

# Создайте .env файл
cp env.example .env

# Отредактируйте .env файл
# TELEGRAM_TOKEN=your_bot_token_here
# OPENAI_API_KEY=your_openai_key_here

# Запустите в режиме разработки
npm run dev
```

### 4. Продакшн запуск

```bash
# Соберите проект
npm run build

# Запустите
npm start
```

## 🐳 Docker

```bash
# Сборка образа
docker build -t excursobot .

# Запуск контейнера
docker run -d \
  --name excursobot \
  -e TELEGRAM_TOKEN=your_token \
  -e OPENAI_API_KEY=your_key \
  -e ENV=production \
  -p 3000:3000 \
  excursobot
```

## ⚙️ Конфигурация

### Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `TELEGRAM_TOKEN` | Токен бота от @BotFather | ✅ |
| `OPENAI_API_KEY` | API ключ OpenAI | ✅ |
| `WEBHOOK_URL` | URL для webhook (опционально) | ❌ |
| `PORT` | Порт для webhook сервера | ❌ (по умолчанию 3000) |
| `ENV` | Окружение (development/production) | ❌ (по умолчанию development) |

### Режимы работы

- **Polling** (по умолчанию): для локальной разработки
- **Webhook**: для продакшена на Railway/Heroku

## 📱 Использование

1. Отправьте боту команду `/start`
2. Отправьте свою локацию (скрепка → Местоположение)
3. Получите интересный факт о месте
4. Используйте `/help` для справки

## 🏗️ Разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка
npm run build

# Линтинг
npm run lint

# Форматирование кода
npm run format

# Проверка типов
npm run type-check

# Тестирование
npm test
```

## 🚀 Деплой на Railway

1. Подключите GitHub репозиторий к Railway
2. Установите переменные окружения:
   - `TELEGRAM_TOKEN`
   - `OPENAI_API_KEY`
   - `WEBHOOK_URL` (Railway автоматически генерирует)
   - `ENV=production`
3. Railway автоматически соберет и запустит приложение

## 📁 Структура проекта

```
src/
├── bot/           # Основная логика бота
├── handlers/      # Обработчики сообщений
├── services/      # Внешние сервисы (OpenAI)
├── lib/           # Утилиты (логгер, rate limiter)
└── index.ts       # Точка входа

tests/             # Тесты
docs/              # Документация
```

## 🔧 Технологии

- **Node.js 18+** - среда выполнения
- **TypeScript** - типизация
- **grammY** - Telegram Bot API
- **OpenAI** - генерация фактов
- **Docker** - контейнеризация

## 📝 Лицензия

MIT

## 🤝 Поддержка

Если у вас есть вопросы или проблемы, создайте issue в репозитории.
