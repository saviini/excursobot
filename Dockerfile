# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY src/ ./src/

# Копируем конфигурационные файлы
COPY tsconfig.json ./

# Собираем TypeScript в JavaScript
RUN npm run build

# Удаляем исходный код и dev-зависимости
RUN rm -rf src/ tsconfig.json

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bot -u 1001

# Меняем владельца файлов
RUN chown -R bot:nodejs /app
USER bot

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
