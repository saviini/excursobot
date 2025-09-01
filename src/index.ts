import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { Logger } from './lib/logger.js';
import OpenAI from 'openai';

// Загружаем переменные окружения
dotenv.config();

const telegramToken = process.env.TELEGRAM_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const webhookUrl = process.env.WEBHOOK_URL;
const port = parseInt(process.env.PORT || '8080', 10); // всегда 8080 на Railway
const env = process.env.NODE_ENV || 'development';

if (!telegramToken) throw new Error('TELEGRAM_TOKEN не установлен');
if (!openaiApiKey) throw new Error('OPENAI_API_KEY не установлен');
if (!webhookUrl) Logger.warn('WEBHOOK_URL не установлен, нужно для production');

const openai = new OpenAI({ apiKey: openaiApiKey });

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
        {
          role: 'system',
          content: 'Ты - эксперт по географии и истории. Дай один интересный факт, 1-2 предложения, только на русском.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const fact = response.choices[0]?.message?.content?.trim();
    if (!fact) throw new Error('Пустой ответ от OpenAI');
    return fact;
  } catch (err: any) {
    Logger.error('openai_error', 'Ошибка при запросе к OpenAI', { error: err.message || String(err) });
    throw new Error('Не удалось получить факт. Попробуйте ещё раз.');
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err: any) {
    Logger.error('telegram_error', 'Не удалось отправить сообщение', { error: err.message || String(err), chatId });
  }
}

// Express сервер для вебхука
const app = express();
app.use(bodyParser.json());

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
    Logger.error('location_processing_error', 'Ошибка при обработке локации', { error: err instanceof Error ? err.message : String(err) });
    res.sendStatus(500);
  }
});

async function startBot() {
  try {
    if (env === 'production' && webhookUrl) {
      const webhookPath = '/webhook';
      const fullWebhookUrl = webhookUrl.endsWith(webhookPath) ? webhookUrl : `${webhookUrl}${webhookPath}`;

      // Устанавливаем вебхук один раз
      await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullWebhookUrl }),
      });
      Logger.info('bot_startup', 'Вебхук установлен', { webhookUrl: fullWebhookUrl });
    } else {
      Logger.info('app_startup', 'Запуск в режиме polling (локальная разработка)');
      console.log('Polling mode пока не реализован');
    }

    app.listen(port, () => Logger.info('app_startup', `Сервер запущен на порту ${port}`));
  } catch (err) {
    Logger.error('app_startup_error', 'Ошибка запуска бота', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }
}

startBot();
