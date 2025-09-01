// src/index.ts
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { Logger } from './lib/logger';
import OpenAI from 'openai';

// Загружаем переменные окружения
dotenv.config();

const telegramToken = process.env.TELEGRAM_TOKEN!;
const openaiApiKey = process.env.OPENAI_API_KEY!;
const webhookUrl = process.env.WEBHOOK_URL;
const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 3000;

const openai = new OpenAI({ apiKey: openaiApiKey });

// Получение факта по координатам
async function getFactForLocation(latitude: number, longitude: number): Promise<string> {
  const prompt = `Расскажи один интересный факт о месте с координатами ${latitude}, ${longitude}.
- Отвечай ТОЛЬКО на русском языке
- Максимум 1-2 предложения
- Расскажи что-то необычное, историческое или географическое
- Если знаешь название места - укажи его`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Ты - эксперт по географии и истории. Дай один интересный факт, 1-2 предложения, только на русском.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message?.content || 'Не удалось получить факт';
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error('openai_error', 'Ошибка при получении факта', { error: errorMessage });
    return 'Не удалось получить факт';
  }
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error('telegram_error', 'Ошибка при отправке сообщения в Telegram', { error: errorMessage, chatId });
  }
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

    if (!chatId || latitude == null || longitude == null) {
      res.sendStatus(400);
      return;
    }

    const fact = await getFactForLocation(latitude, longitude);
    await sendTelegramMessage(chatId, fact);

    res.sendStatus(200);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error('location_processing_error', 'Ошибка при обработке локации', { error: errorMessage });
    res.sendStatus(500);
  }
});

// Запуск бота
async function startBot() {
  try {
    if (env === 'production' && webhookUrl) {
      const webhookEndpoint = webhookUrl.endsWith('/webhook') ? webhookUrl : `${webhookUrl}/webhook`;
      await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookEndpoint }),
      });
      Logger.info('bot_startup', 'Вебхук установлен', { webhookUrl: webhookEndpoint });
    } else {
      Logger.info('app_startup', 'Запуск в режиме polling (локальная разработка)');
      console.log('Polling mode пока не реализован');
    }

    app.listen(port, () => Logger.info('app_startup', `Сервер запущен на порту ${port}`));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error('app_startup_error', 'Ошибка запуска бота', { error: errorMessage });
    process.exit(1);
  }
}

startBot();
