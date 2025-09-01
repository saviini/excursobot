import OpenAI from "openai";
import { Logger } from "../lib/logger.js";

export interface LocationFact {
  fact: string;
  placeName?: string;
  distance?: string;
}

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async getFactForLocation(latitude: number, longitude: number): Promise<LocationFact> {
    try {
      Logger.info("openai_request", "Отправка запроса к OpenAI", {
        latitude,
        longitude,
        model: "gpt-4o-mini",
      });

      const prompt = this.buildLocationPrompt(latitude, longitude);

      Logger.info("openai_prompt", "Сформированный prompt для OpenAI", {
        preview: prompt.slice(0, 200),
      });

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Ты - эксперт по географии и истории. Твоя задача - рассказать один интересный факт о месте рядом с указанными координатами. Отвечай ТОЛЬКО на русском языке, 1-2 предложения максимум. Будь краток, но информативен.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const fact = response.choices[0]?.message?.content?.trim();

      if (!fact) {
        throw new Error("Пустой ответ от OpenAI");
      }

      Logger.info("openai_response", "Получен ответ от OpenAI", {
        latitude,
        longitude,
        factLength: fact.length,
      });

      return { fact };
    } catch (error: any) {
      Logger.error("openai_error", "Ошибка при запросе к OpenAI", {
        latitude,
        longitude,
        error: error?.message || String(error),
      });

      if (error?.status === 429) {
        throw new Error("Превышен лимит запросов. Попробуйте через минуту.");
      }
      if (error?.status >= 500) {
        throw new Error("Сервис OpenAI временно недоступен. Попробуйте позже.");
      }

      throw new Error("Не удалось получить факт. Попробуйте ещё раз.");
    }
  }

  private buildLocationPrompt(latitude: number, longitude: number): string {
    return `Расскажи один интересный факт о месте с координатами ${latitude}, ${longitude}.
    
Инструкции:
- Отвечай ТОЛЬКО на русском языке
- Максимум 1-2 предложения
- Расскажи что-то необычное, историческое или географическое
- Если знаешь название места - укажи его
- Будь краток, но информативен

Примеры хороших ответов:
"В этом месте в 1812 году проходила армия Наполеона во время отступления из Москвы."
"Здесь находится древний курган, датируемый 3-м тысячелетием до нашей эры."`;
  }
}
