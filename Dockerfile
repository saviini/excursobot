# ---------- Stage 1: Build ----------
FROM node:18-slim AS builder

# Устанавливаем bash, git и утилиты
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Кэширование зависимостей
COPY package*.json ./
RUN npm install

# Копируем весь исходный код и билдим TypeScript
COPY . .
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM node:18-slim AS runner

WORKDIR /app

# Только production-зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем собранный код
COPY --from=builder /app/dist ./dist

# Открываем порт 8080
EXPOSE 8080

# Запуск приложения
CMD ["node", "dist/index.js"]
