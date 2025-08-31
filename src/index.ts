import dotenv from "dotenv";
import { BotApp } from "./app";
import { Logger } from "./lib/logger";

// Загружаем переменные окружения
dotenv.config();

async function main(): Promise<void> {
  try {
    // Проверяем обязательные переменные окружения
    const telegramToken = process.env.BOT_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const env = process.env.NODE_ENV || "development";

    Logger.info("env_check", "Проверка переменных окружения", {
      hasTelegramToken: !!telegramToken,
      hasOpenAIKey: !!openaiApiKey,
      telegramTokenLength: telegramToken?.length || 0,
      openAIKeyLength: openaiApiKey?.length || 0,
      env,
    });

    if (!telegramToken) {
      throw new Error("❌ BOT_TOKEN не установлен в переменных окружения");
    }

    if (!openaiApiKey) {
      throw new Error("❌ OPENAI_API_KEY не установлен в переменных окружения");
    }

    Logger.info("app_startup", "Запуск приложения", { env });

    // Создаем экземпляр бота
    const bot = new BotApp(telegramToken, openaiApiKey);

    // Обработка сигналов завершения
    process.on("SIGINT", async () => {
      Logger.info("app_shutdown", "SIGINT — завершение работы");
      await bot.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      Logger.info("app_shutdown", "SIGTERM — завершение работы");
      await bot.stop();
      process.exit(0);
    });

    // Railway → запускаем polling
    await bot.startPolling();

    Logger.info("app_startup", "Приложение успешно запущено");
  } catch (error) {
    Logger.error("app_startup_error", "Критическая ошибка при запуске", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.error("❌ Ошибка запуска:", error);
    process.exit(1);
  }
}

// Запускаем приложение
main().catch((error) => {
  Logger.error("app_main_error", "Неожиданная ошибка в main()", {
    error: error instanceof Error ? error.message : String(error),
  });

  console.error("❌ Критическая ошибка:", error);
  process.exit(1);
});
