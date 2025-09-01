// index.ts
import express from "express";
import bodyParser from "body-parser";
import { Something } from "./types.js";
import { callOpenAI } from "./openai.js";
import { sendTelegramMessage } from "./telegram.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

// Вебхук Telegram
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    if (!update.message || !update.message.location) {
      return res.sendStatus(400);
    }

    const chatId = update.message.chat.id;
    const { latitude, longitude } = update.message.location;

    console.log("location_received", { chatId, latitude, longitude });

    // Пример вызова OpenAI (у тебя должна быть своя функция callOpenAI)
    let fact: string;
    try {
      fact = await callOpenAI({ latitude, longitude });
    } catch (err) {
      console.error("openai_error", err);
      fact = "Не удалось получить факт. Попробуйте ещё раз.";
    }

    // Отправка сообщения пользователю через Telegram
    try {
      await sendTelegramMessage(chatId, fact);
    } catch (err) {
      console.error("telegram_error", err);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("webhook_error", err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log("app_startup - Сервер запущен на порту", PORT);
});
