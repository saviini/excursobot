import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { TelegramUpdate } from './types.js';
import { getFactForLocation } from './openai.js';
import { sendTelegramMessage } from './telegram.js';
import { Logger } from './lib/logger.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const port = parseInt(process.env.PORT || '8080', 10);
const webhookUrl = process.env.WEBHOOK_URL;
const env = process.env.NODE_ENV || 'development';

app.post('/webhook', async (req: Request, res: Response) => {
  res.sendStatus(200); // сразу отвечаем Telegram

  const update = req.body as TelegramUpdate;
  const chatId = update.message?.chat?.id;
  const latitude = update.message?.location?.latitude;
  const longitude = update.message?.location?.longitude;

  if (!chatId || latitude === undefined || longitude === undefined) return;

  Logger.info('location_received', 'Получена локация', { chatId, latitude, longitude });

  try {
    const fact = await getFactForLocation(latitude, longitude);
    await sendTelegramMessage(chatId, fact);
  } catch (err) {
    Logger.error('location_processing_error', 'Ошибка при обработке локации', { error: err instanceof Error ? err.message : String(err) });
  }
});

async function startBot() {
  if (env === 'production' && webhookUrl) {
    try {
      // Ставим вебхук
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl + '/webhook' }),
      });
      Logger.info('bot_startup', 'Вебхук установлен', { webhookUrl });
    } catch (err) {
      Logger.error('bot_startup_error', 'Не удалось установить вебхук', { error: err instanceof Error ? err.message : String(err) });
    }
  }

  app.listen(port, () => Logger.info('app_startup', `Сервер запущен на порту ${port}`));
}

startBot();
