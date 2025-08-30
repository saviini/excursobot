# ---------- Stage 1: Build ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json отдельно для кэширования
COPY package*.json ./

# Устанавливаем все зависимости (dev + prod) для сборки
RUN npm install

# Копируем весь исходный код
COPY . .

# Проверяем, что src/ существует (отладка)
RUN ls -la src/

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

# Открываем порт
EXPOSE 3000

# Запуск приложения
CMD ["npm", "start"]
