import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { Logger } from './lib/logger.js';

dotenv.config();

// --- OpenAIClient ---
class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async getFactForLocation(latitude: number, longitude: number): Promise<string> {
    const prompt = `Расскажи один интересный факт о месте с координатами ${latitude}, ${longitude}.

Инструкции:
- Отвечай ТОЛЬКО на русском языке
- Максимум 1-2 предложения
- Расскажи что-то необычное, историческое или географическое
- Если знаешь название места - укажи его
- Будь краток, но информативен`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты - эксперт по географии и истории. Отвечай кратко, информативно, 1-2 предложения, только на русском.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const fact = response.choices[0]?.message?.content?.trim();
      if (!fact) throw new Error('Пустой ответ от OpenAI');
      return fact;
    } catch (err: any) {
      Logger.error('openai_error', 'Ошибка при запросе к OpenAI', {
        error: err?.message || String(err)
      });
      throw new Error('Не удалось получить факт. Попробуйте ещё раз.');
    }
  }
}

// --- Telegram BotApp ---
class BotApp {
  private telegramToken: string;
  private openAIClient: OpenAIClient;
  private server?: any;

  constructor(telegramToken: string, openaiApiKey: string) {
    this.telegramToken = telegramToken;
    this.openAIClient = new OpenAIClient(openaiApiKey);
  }

  async startWebhook(port: number, webhookUrl: string) {
    const app = express();
    app.use(bodyParser.json());

    app.post(`/${this.telegramToken}`, async (req, res) => {
      try {
        const update = req.body;
        if (update.message?.location) {
          const { latitude, longitude } = update.message.location;
          const chatId = update.message.chat.id;

          try {
            const fact = await this.openAIClient.getFactForLocation(latitude, longitude);

            await fetch(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: fact })
            });
          } catch (err) {
            await fetch(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: 'Не удалось получить факт. Попробуйте ещё раз.' })
            });
          }
        }
        res.sendStatus(200);
      } catch (err) {
        Logger.error('webhook_error', 'Ошибка webhook', { error: err instanceof Error ? err.message : String(err) });
        res.sendStatus(500);
      }
    });

    this.server = app.listen(port, async () => {
      Logger.info('bot_startup', 'Webhook сервер запущен', { port, webhookUrl });
      // Устанавливаем вебхук у Telegram
      try {
        const setWebhookRes = await fetch(
          `https://api.telegram.org/bot${this.telegramToken}/setWebhook`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: `${webhookUrl}/${this.telegramToken}` })
          }
        );
        const result = await setWebhookRes.json();
        Logger.info('bot_startup', 'Webhook установлен', { result });
      } catch (err) {
        Logger.error('bot_startup_error', 'Не удалось установить webhook', { error: err instanceof Error ? err.message : String(err) });
      }
    });
  }

  async startPolling() {
    Logger.info('bot_startup', 'Polling пока не реализован (для разработки)');
    // Здесь можно добавить реализацию polling для локальной разработки
  }

  async stop() {
    if (this.server) this.server.close();
    Logger.info('bot_shutdown', 'Бот остановлен');
  }
}

// --- Main ---
async function main(): Promise<void> {
  try {
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const webhookUrl = process.env.WEBHOOK_URL;
    const port = parseInt(process.env.PORT || '3000');
    const env = process.env.NODE_ENV || 'development';

    Logger.info('env_check', 'Проверка переменных окружения', {
      hasTelegramToken: !!telegramToken,
      hasOpenAIKey: !!openaiApiKey,
      telegramTokenLength: telegramToken?.length || 0,
      openAIKeyLength: openaiApiKey?.length || 0,
      env,
      port,
      hasWebhookUrl: !!webhookUrl
    });

    if (!telegramToken || !openaiApiKey) throw new Error('Не заданы обязательные переменные окружения');

    const bot = new BotApp(telegramToken, openaiApiKey);

    process.on('SIGINT', async () => { Logger.info('app_shutdown', 'SIGINT'); await bot.stop(); process.exit(0); });
    process.on('SIGTERM', async () => { Logger.info('app_shutdown', 'SIGTERM'); await bot.stop(); process.exit(0); });

    if (env === 'production' && webhookUrl) {
      await bot.startWebhook(port, webhookUrl);
    } else {
      await bot.startPolling();
    }

    Logger.info('app_startup', 'Приложение успешно запущено');

  } catch (error) {
    Logger.error('app_startup_error', 'Ошибка запуска', { error: error instanceof Error ? error.message : String(error) });
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
}

main().catch(err => {
  Logger.error('app_main_error', 'Неожиданная ошибка в main', { error: err instanceof Error ? err.message : String(err) });
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});
