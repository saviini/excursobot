# ---------- Stage 1: Build ----------
FROM node:18-alpine AS builder

# Устанавливаем bash и другие утилиты
RUN apk add --no-cache bash git

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
FROM node:18-alpine AS runner

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем только production-зависимости
RUN npm install --omit=dev

# Копируем собранный JS-код из builder
COPY --from=builder /app/dist ./dist

# Для ESM-совместимости добавляем package.json с типом модуля
# (если у тебя еще нет "type": "module" в package.json)
# COPY package.json ./package.json

# Открываем порт
EXPOSE 3000

# Запуск приложения
CMD ["node", "dist/index.js"]
