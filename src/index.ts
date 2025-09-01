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

if (!telegramToken) throw new Error('TELEGRAM_TOKEN не установлен');
if (!openaiApiKey) throw new Error('OPENAI_API_KEY не установлен');
if (!webhookUrl) throw new Error('WEBHOOK_URL не установлен');

const openai = new OpenAI({ apiKey: openaiApiKey });

async function getFactForLocation(lat: number, lon: number): Promise<string> {
  const prompt = `Расскажи один интересный факт о месте с координатами ${lat}, ${lon}.
- Только на русском, 1-2 предложения.`;

  const sanitizedPrompt = Buffer.from(prompt, 'utf-8')
    .toString()
    .replace(/[^\x00-\x7Fа-яА-ЯёЁ.,:;!?0-9 \n-]/g, '');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Ты - эксперт по географии и истории.' },
        { role: 'user', content: sanitizedPrompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const fact = response.choices[0]?.message?.content?.trim();
    if (!fact) throw new Error('Пустой ответ от OpenAI');
    return fact;
  } catch (err: any) {
    Logger.error('openai_error', 'Ошибка при запросе к OpenAI', { error: err.message || String(err) });
    throw new Error('Не удалось получить факт.');
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

const app = express();
app.use(bodyParser.json());

// Все обновления от Telegram будут приходить сюда
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    const chatId = update.message?.chat?.id;
    const latitude = update.message?.location?.latitude;
    const longitude = update.message?.location?.longitude;

    if (!chatId || latitude === undefined || longitude === undefined) return res.sendStatus(200);

    Logger.info('location_received', 'Получена локация от пользователя', { chatId, latitude, longitude });

    const fact = await getFactForLocation(latitude, longitude);
    await sendTelegramMessage(chatId, fact);

    res.sendStatus(200);
  } catch (err) {
    Logger.error('location_processing_error', 'Ошибка при обработке локации', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.sendStatus(500);
  }
});

async function setupWebhook() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${webhookUrl}/webhook` }),
    });

    const data = await res.json();
    if (!data.ok) throw new Error(JSON.stringify(data));

    Logger.info('bot_startup', 'Webhook установлен', { webhookUrl: `${webhookUrl}/webhook` });

    app.listen(port, () => {
      Logger.info('app_startup', `Сервер запущен на порту ${port}`);
    });
  } catch (err) {
    Logger.error('webhook_setup_error', 'Не удалось установить webhook', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

setupWebhook();
