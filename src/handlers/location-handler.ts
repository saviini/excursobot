import { Context, InlineKeyboard } from 'grammy';
import { OpenAIClient, LocationFact } from "../services/openai-client";
import { Logger } from "../lib/logger";
import { RateLimiter } from "../lib/rate-limiter";

export class LocationHandler {
  private openaiClient: OpenAIClient;
  private rateLimiter: RateLimiter;

  constructor(openaiApiKey: string) {
    this.openaiClient = new OpenAIClient(openaiApiKey);
    this.rateLimiter = new RateLimiter(1, 10000); // 1 запрос в 10 секунд
  }

  async handleLocation(ctx: Context): Promise<void> {
    try {
      const chatId = ctx.chat?.id;
      const userId = ctx.from?.id;
      const location = ctx.message?.location;

      if (!chatId || !userId || !location) {
        Logger.warn('location_handler', 'Отсутствуют необходимые данные', {
          chatId,
          userId,
          hasLocation: !!location,
        });
        return;
      }

      const { latitude, longitude } = location;

      // Валидация координат
      if (!this.validateCoordinates(latitude, longitude)) {
        await ctx.reply(
          '❌ Получены некорректные координаты. Попробуйте отправить локацию ещё раз.'
        );
        return;
      }

      // Логирование получения локации
      Logger.info('location_received', 'Получена локация от пользователя', {
        chatId,
        userId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

      // Проверка rate limit
      const rateLimitKey = `user_${userId}`;
      if (!this.rateLimiter.isAllowed(rateLimitKey)) {
        const remainingTime = this.rateLimiter.getRemainingTime(rateLimitKey);
        const seconds = Math.ceil(remainingTime / 1000);
        await ctx.reply(`⏳ Слишком частые запросы. Попробуйте через ${seconds} секунд.`);
        return;
      }

      // Отправляем сообщение о начале обработки
      const processingMsg = await ctx.reply('🔍 Ищу интересные факты об этом месте...');

      try {
        // Получаем факт от OpenAI
        const fact: LocationFact = await this.openaiClient.getFactForLocation(latitude, longitude);

        // Создаем клавиатуру с ссылкой на карту
        const keyboard = new InlineKeyboard().url(
          '🗺️ Открыть на карте',
          this.buildMapUrl(latitude, longitude)
        );

        // Отправляем результат
        await ctx.reply(`✨ **Интересный факт:**\n\n${fact.fact}`, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });

        // Удаляем сообщение о обработке
        await ctx.api.deleteMessage(chatId, processingMsg.message_id);

        Logger.info('location_processed', 'Локация успешно обработана', {
          chatId,
          userId,
          latitude,
          longitude,
          factLength: fact.fact.length,
        });
      } catch (error) {
        // Удаляем сообщение о обработке
        await ctx.api.deleteMessage(chatId, processingMsg.message_id);

        // Отправляем сообщение об ошибке
        const errorMessage =
          error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
        await ctx.reply(`❌ ${errorMessage}`);

        Logger.error('location_processing_error', 'Ошибка при обработке локации', {
          chatId,
          userId,
          latitude,
          longitude,
          error: errorMessage,
        });
      }
    } catch (error) {
      Logger.error('location_handler_error', 'Критическая ошибка в обработчике локации', {
        error: error instanceof Error ? error.message : String(error),
      });

      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  }

  private validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  private buildMapUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  // Метод для очистки rate limiter (можно вызывать периодически)
  cleanup(): void {
    this.rateLimiter.cleanup();
  }
}
