"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpTelegram = sendOtpTelegram;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const appName = process.env.APP_NAME || 'Your App';
async function sendOtpTelegram(telegramId, otp) {
    const message = `
🔐 *${appName} Login OTP*

Use the following OTP to log in:

*${otp}*

_This OTP is valid for 10 minutes. Do not share it with anyone._
  `.trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown',
    });
}
