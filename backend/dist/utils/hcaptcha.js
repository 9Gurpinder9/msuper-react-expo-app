"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHcaptcha = verifyHcaptcha;
const config_1 = require("../config");
const logger_1 = __importDefault(require("./logger"));
async function verifyHcaptcha(token, remoteIp) {
    if (!config_1.config.hcaptchaSecret) {
        throw new Error('HCAPTCHA_SECRET is not configured.');
    }
    const params = new URLSearchParams();
    params.set('secret', config_1.config.hcaptchaSecret);
    params.set('response', token);
    if (remoteIp)
        params.set('remoteip', remoteIp);
    const res = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });
    const data = (await res.json());
    if (!data.success) {
        logger_1.default.warn('hCaptcha verification failed', { errors: data['error-codes'] });
    }
    return data;
}
