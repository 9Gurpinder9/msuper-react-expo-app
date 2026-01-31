import { config } from '../config';
import logger from './logger';

type HcaptchaResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  credit?: boolean;
  'error-codes'?: string[];
};

export async function verifyHcaptcha(token: string, remoteIp?: string) {
  if (!config.hcaptchaSecret) {
    throw new Error('HCAPTCHA_SECRET is not configured.');
  }

  const params = new URLSearchParams();
  params.set('secret', config.hcaptchaSecret);
  params.set('response', token);
  if (remoteIp) params.set('remoteip', remoteIp);

  const res = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as HcaptchaResponse;
  if (!data.success) {
    logger.warn('hCaptcha verification failed', { errors: data['error-codes'] });
  }
  return data;
}
