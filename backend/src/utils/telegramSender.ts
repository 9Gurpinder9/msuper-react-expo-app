import axios from 'axios';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const appName = process.env.APP_NAME || 'Your App';

export async function sendOtpTelegram(telegramId: string, otp: string) {
    const message = `
🔐 *${appName} Login OTP*

Use the following OTP to log in:

*${otp}*

_This OTP is valid for 10 minutes. Do not share it with anyone._
  `.trim();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    try {
        const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: telegramId,
            text: message,
            parse_mode: 'Markdown',
        });
        logger.info(`Telegram OTP send success. Chat ID: ${telegramId}, Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
        const status = error.response?.status;
        const responseData = error.response?.data;
        logger.error(`Telegram OTP send failed. Chat ID: ${telegramId}, Message: ${error.message}, Status: ${status}, Data: ${JSON.stringify(responseData)}`);
        throw error;
    }
}
