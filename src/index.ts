import dotenv from 'dotenv';
import { BotApp } from './bot/app.js';
import { Logger } from './lib/logger.js';

// Загружаем переменные окружения
dotenv.config();

async function main(): Promise<void> {
  try {
    // Проверяем обязательные переменные окружения
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const webhookUrl = process.env.WEBHOOK_URL;
    const port = parseInt(process.env.PORT || '3000');
    const env = process.env.NODE_ENV || 'development'; // ✅ используем NODE_ENV

    Logger.info('env_check', 'Проверка переменных окружения', {
      hasTelegramToken: !!telegramToken,
      hasOpenAIKey: !!openaiApiKey,
      telegramTokenLength: telegramToken?.length || 0,
      openAIKeyLength: openaiApiKey?.length || 0,
      env,
      port,
      hasWebhookUrl: !!webhookUrl
    });

    if (!telegramToken) {
      throw new Error('TELEGRAM_TOKEN не установлен в переменных окружения');
    }

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY не установлен в переменных окружения');
    }

    Logger.info('app_startup', 'Запуск приложения', {
      env,
      port,
      hasWebhookUrl: !!webhookUrl
    });

    // Создаем экземпляр бота
    const bot = new BotApp(telegramToken, openaiApiKey);

    // Обработка сигналов завершения
    process.on('SIGINT', async () => {
      Logger.info('app_shutdown', 'Получен сигнал SIGINT, завершение работы');
      await bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      Logger.info('app_shutdown', 'Получен сигнал SIGTERM, завершение работы');
      await bot.stop();
      process.exit(0);
    });

    // 🚀 Запуск бота
    if (env === 'production' && webhookUrl) {
      Logger.info('app_startup', 'Запуск в режиме webhook', { webhookUrl, port });
      await bot.startWebhook(port, webhookUrl);
    } else {
      Logger.info('app_startup', 'Запуск в режиме polling (локальная разработка)');
      await bot.startPolling();
    }

    Logger.info('app_startup', 'Приложение успешно запущено');

  } catch (error) {
    Logger.error('app_startup_error', 'Критическая ошибка при запуске приложения', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
}

// Запускаем приложение
main().catch((error) => {
  Logger.error('app_main_error', 'Неожиданная ошибка в main функции', {
    error: error instanceof Error ? error.message : String(error)
  });
  
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
