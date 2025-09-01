# ---------- Stage 1: Build ----------
FROM node:18-slim AS builder

WORKDIR /app

# Кэшируем зависимости
COPY package*.json ./
RUN npm install

# Копируем весь код и собираем TypeScript
COPY . .
# Используем флаг --skipLibCheck чтобы сборка не падала из-за проблем с типами
RUN npx tsc --skipLibCheck

# ---------- Stage 2: Runtime ----------
FROM node:18-slim AS runner

WORKDIR /app

# Копируем package.json и устанавливаем только production зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем собранный код
COPY --from=builder /app/dist ./dist

# Устанавливаем порт для Railway
ENV PORT=8080
EXPOSE 8080

# Гарантируем использование правильного порта из окружения
CMD ["node", "dist/index.js"]
