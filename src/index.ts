// src/index.ts
import { LocationFact } from './types';
import { getFactFromOpenAI } from './openai';
import { sendMessageToTelegram, setupWebhook } from './telegram';

const PORT = process.env.PORT || 8080;

async function startBot() {
    // Устанавливаем вебхук для Telegram
    await setupWebhook();

    console.log(`Сервер запущен на порту ${PORT}`);
}

// Обработка локации от пользователя
async function handleLocation(chatId: number, latitude: number, longitude: number) {
    try {
        const fact: LocationFact = await getFactFromOpenAI(latitude, longitude);
        await sendMessageToTelegram(chatId, fact.text);
        console.log('Факт отправлен пользователю', { chatId, fact });
    } catch (error) {
        console.error('Ошибка при обработке локации', error);
        await sendMessageToTelegram(chatId, 'Не удалось получить факт. Попробуйте ещё раз.');
    }
}

// Старт бота
startBot().catch(console.error);

// Экспорт для тестов или других модулей
export { handleLocation };
