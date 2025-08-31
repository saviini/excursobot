import { Bot, Context, session } from 'grammy';
import { LocationHandler } from "../handlers/location-handler";
import { Logger } from "../lib/logger";

// Интерфейс для сессии пользователя
interface SessionData {
  isLiveLocationActive: boolean;
  lastFactSent: number;
}

// Расширяем контекст для поддержки сессий
interface MyContext extends Context {
  session: SessionData;
}

export class BotApp {
  private bot: Bot<MyContext>;
  private locationHandler: LocationHandler;

  constructor(token: string, openaiApiKey: string) {
    this.bot = new Bot<MyContext>(token);
    this.locationHandler = new LocationHandler(openaiApiKey);

    this.setupMiddleware();
    this.setupCommands();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Middleware для сессий
    this.bot.use(
      session({
        initial: (): SessionData => ({
          isLiveLocationActive: false,
          lastFactSent: 0,
        }),
      })
    );

    // Middleware для логирования
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      const updateType = this.getUpdateType(ctx);
      Logger.info('bot_request', 'Получен запрос', {
        updateType,
        chatId: ctx.chat?.id,
        userId: ctx.from?.id,
      });

      try {
        await next();
      } finally {
        const duration = Date.now() - start;
        Logger.info('bot_response', 'Запрос обработан', {
          updateType,
          chatId: ctx.chat?.id,
          userId: ctx.from?.id,
          duration,
        });
      }
    });
  }

  private getUpdateType(ctx: MyContext): string {
    if (ctx.message) return 'message';
    if (ctx.editedMessage) return 'edited_message';
    if (ctx.channelPost) return 'channel_post';
    if (ctx.editedChannelPost) return 'edited_channel_post';
    if (ctx.inlineQuery) return 'inline_query';
    if (ctx.chosenInlineResult) return 'chosen_inline_result';
    if (ctx.callbackQuery) return 'callback_query';
    if (ctx.shippingQuery) return 'shipping_query';
    if (ctx.preCheckoutQuery) return 'pre_checkout_query';
    if (ctx.poll) return 'poll';
    if (ctx.pollAnswer) return 'poll_answer';
    if (ctx.myChatMember) return 'my_chat_member';
    if (ctx.chatMember) return 'chat_member';
    if (ctx.chatJoinRequest) return 'chat_join_request';
    return 'unknown';
  }

  private setupCommands(): void {
    // Команда /start
    this.bot.command('start', async (ctx) => {
      const welcomeMessage = `👋 Привет! Я бот, который рассказывает интересные факты о местах.

📍 **Как использовать:**
1. Отправь мне свою локацию (нажми на скрепку → Местоположение)
2. Я найду интересный факт об этом месте
3. Получишь факт и ссылку на карту

🔍 **Команды:**
/start - это сообщение
/help - справка
/stop - остановить live-локацию (если активна)

Попробуй отправить локацию прямо сейчас!`;

      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Команда /help
    this.bot.command('help', async (ctx) => {
      const helpMessage = `📚 **Справка по использованию бота**

📍 **Отправка локации:**
• Нажми на скрепку 📎 в чате
• Выбери "Местоположение"
• Отправь свою локацию

🎯 **Что происходит:**
• Бот получает координаты
• Отправляет запрос к AI
• Возвращает интересный факт
• Даёт ссылку на карту

⚡ **Ограничения:**
• Не чаще 1 запроса в 10 секунд
• Факты генерируются на русском языке
• Максимум 1–2 предложения

🆘 **Если что-то не работает:**
• Проверь интернет-соединение
• Попробуй через минуту
• Убедись, что локация корректна`;

      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    // Команда /stop
    this.bot.command('stop', async (ctx) => {
      if (ctx.session.isLiveLocationActive) {
        ctx.session.isLiveLocationActive = false;
        await ctx.reply('🛑 Live-локация остановлена. Новые факты не будут отправляться.');
        Logger.info('live_location_stopped', 'Пользователь остановил live-локацию', {
          chatId: ctx.chat?.id,
          userId: ctx.from?.id,
        });
      } else {
        await ctx.reply('ℹ️ Live-локация не была активна.');
      }
    });
  }

  private setupHandlers(): void {
    // Обработчик локации
    this.bot.on('message:location', async (ctx) => {
      await this.locationHandler.handleLocation(ctx);
    });

    // Обработчик текстовых сообщений (кроме команд)
    this.bot.on('message:text', async (ctx) => {
      if (ctx.message.text.startsWith('/')) return;

      await ctx.reply(
        '📍 Отправь мне локацию, чтобы получить интересный факт о месте!\n\n' +
          'Нажми на скрепку 📎 и выбери "Местоположение".'
      );
    });

    // Обработчик остальных типов сообщений
    this.bot.on('message', async (ctx) => {
      if (ctx.message.location) return; // уже обработано выше

      await ctx.reply(
        '📍 Я понимаю только локации и команды.\n\n' +
          'Отправь локацию или используй /help для справки.'
      );
    });
  }

  private setupErrorHandling(): void {
    this.bot.catch((err) => {
      const error = err.error as Error;
      Logger.error('bot_error', 'Критическая ошибка в боте', {
        error: error.message,
        stack: error.stack,
      });
    });
  }

  // Запуск в режиме polling
  async startPolling(): Promise<void> {
    Logger.info('bot_startup', 'Запуск бота в режиме polling');

    try {
      try {
        await this.bot.api.deleteWebhook();
        Logger.info('bot_startup', 'Webhook успешно удален');
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          Logger.info('bot_startup', 'Webhook не был установлен, продолжаем запуск');
        } else {
          Logger.warn('bot_startup', 'Ошибка при удалении webhook', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await this.bot.start();
      Logger.info('bot_startup', 'Бот успешно запущен в режиме polling');
    } catch (error) {
      Logger.error('bot_startup_error', 'Ошибка при запуске бота', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Запуск в режиме webhook
  async startWebhook(port: number, webhookUrl: string): Promise<void> {
    Logger.info('bot_startup', 'Запуск бота в режиме webhook', { port, webhookUrl });

    try {
      await this.bot.api.setWebhook(webhookUrl);
      Logger.info('bot_startup', 'Webhook успешно установлен', { webhookUrl });

      // Временно используем polling
      await this.startPolling();
    } catch (error) {
      Logger.error('bot_startup_error', 'Ошибка при запуске webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Остановка бота
  async stop(): Promise<void> {
    Logger.info('bot_shutdown', 'Остановка бота');
    await this.bot.stop();
  }
}
