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
    if (ctx.message) r
