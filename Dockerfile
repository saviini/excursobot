# ---------- Stage 1: Build ----------
FROM node:18-slim AS builder

# Устанавливаем bash, git и другие утилиты
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем package.json и package-lock.json отдельно для кэширования
COPY package*.json ./

# Устанавливаем все зависимости (dev + prod) для сборки
RUN npm install

# Копируем весь исходный код
COPY . .

# Собираем TypeScript в dist/
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM node:18-slim AS runner

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем только production-зависимости
RUN npm install --omit=dev

# Копируем собранный JS-код из builder
COPY --from=builder /app/dist ./dist

# Открываем порт
EXPOSE 3000

# Запуск приложения
CMD ["node", "dist/index.js"]
