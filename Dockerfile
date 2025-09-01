# ---------- Stage 1: Build ----------
FROM node:18-slim AS builder

# Устанавливаем bash и git
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Кэширование зависимостей
COPY package*.json ./
RUN npm install

# Копируем весь исходный код
COPY . .

# Собираем TypeScript в CommonJS (dist)
RUN npx tsc

# ---------- Stage 2: Runtime ----------
FROM node:18-slim AS runner

WORKDIR /app

# Копируем package.json и устанавливаем только production-зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем собранный код из builder
COPY --from=builder /app/dist ./dist

# Открываем порт
ENV PORT=8080
EXPOSE 8080

# Запуск приложения
CMD ["node", "dist/index.js"]
