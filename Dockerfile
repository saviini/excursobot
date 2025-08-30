# ---------- Stage 1: Build ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json отдельно (чтобы кэшировалось)
COPY package*.json ./

# Устанавливаем все зависимости (включая dev-зависимости, чтобы был tsc)
RUN npm install

# Копируем исходный код
COPY . .

# Собираем TypeScript в dist/
RUN npm run build


# ---------- Stage 2: Runtime ----------
FROM node:18-alpine AS runner

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем только production-зависимости
RUN npm install --only=production

# Копируем собранный JS-код из builder
COPY --from=builder /app/dist ./dist

# Открываем порт (если твой app слушает на 3000)
EXPOSE 3000

# Запуск приложения
CMD ["npm", "start"]
