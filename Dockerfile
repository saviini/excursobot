# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем все файлы проекта
COPY . .

# Устанавливаем зависимости
RUN npm install

# Собираем TypeScript в JavaScript
RUN npm run build

# Удаляем исходный код и dev-зависимости
RUN rm -rf src/ tsconfig.json node_modules

# Устанавливаем только production зависимости
RUN npm install --only=production

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
