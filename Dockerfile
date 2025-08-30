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

# Удаляем исходный код и dev-зависимости ПОСЛЕ сборки
RUN rm -rf src/ tsconfig.json

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
