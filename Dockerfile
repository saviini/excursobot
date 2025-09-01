# ---------- Stage 1: Build ----------
FROM node:18-slim AS builder

WORKDIR /app

# Кэшируем зависимости
COPY package*.json ./
RUN npm install

# Копируем весь код и собираем TypeScript
COPY . .
RUN npx tsc

# ---------- Stage 2: Runtime ----------
FROM node:18-slim AS runner

WORKDIR /app

# Копируем package.json и production зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем собранный код из билд-стадии
COPY --from=builder /app/dist ./dist

# Устанавливаем порт для Railway
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
