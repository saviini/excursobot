import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { Logger } from './lib/logger.js';
import OpenAI from 'openai';

dotenv.config();

const telegramToken = process.env.TELEGRAM_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const webhookUrl = process.env.WEBHOOK_URL;
const port = parseInt(process.env.PORT || '8080', 10);
const env = process.env.NODE_ENV || 'development';

if (!telegramToken) throw new Error('TELEGRAM_TOKEN не установлен');
if (!openaiApiKey) throw new Error('OPENAI_API_KEY не установлен');

const openai = new OpenAI({ apiKey: openaiApiKey });

// Получение факта по координатам
async function getFactForLocation(latitude: number, longitude: number): Promise<string> {
  const prompt = `Расскажи один интересный факт о месте с координатами ${latitude}, ${longitude}.
- Отвечай только на русском языке
- 1-2 предложения
- Уникальный исторический, географический или необычный факт`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Ты - эксперт по географии и истории. Дай интересный факт 1-2 предложения, только на русском.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const fact = response.choices?.[0]?.message?.content?.trim();
    if (!fact) throw new Error('Пустой ответ от OpenAI');
    return fact;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error('openai_error', 'Ошибка при запросе к OpenAI', { error: errorMessage });
    throw new Error('Не удалось получить факт. Попробуйте ещё раз.');
  }
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Express сервер
const app = express();
app.use(bodyParser.json());

// Вебхук
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    const chatId = update.message?.chat?.id;
    const latitude = update.message?.location?.latitude;
    const longitude = update.message?.location?.longitude;

    if (!chatId || latitude === undefined || longitude === undefined) {
      return res.sendStatus(200);
    }

    Logger.info('location_received', 'Получена локация от пользователя', { chatId, latitude, longitude });

    const fact = await getFactForLocation(latitude, longitude);
    await sendTelegramMessage(chatId, fact);

    res.sendStatus(200);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error('location_processing_error', 'Ошибка при обработке локации', { error: errorMessage });
    res.sendStatus(500);
  }
});

// Запуск бота
async function startBot() {
  try {
    if (env === 'production' && webhookUrl) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      Logger.info('bot_startup', 'Вебхук установлен', { webhookUrl });
      app.listen(port, () => Logger.info('app_startup', `Сервер запущен на порту ${port}`));
    } else {
      Logger.info('app_startup', 'Запуск в режиме polling (локальная разработка)');
      console.log('Polling mode пока не реализован');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error('app_startup_error', 'Ошибка запуска бота', { error: errorMessage });
    process.exit(1);
  }
}

startBot();
