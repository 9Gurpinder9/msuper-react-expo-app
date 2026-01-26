// frontend/src/utils/ocrEngine.web.ts
import Tesseract from 'tesseract.js';
import type { OcrBlock, OcrResult } from './ocrEngine.types';

export async function runOcrFromUri(uri: string): Promise<OcrResult> {
  const result = await Tesseract.recognize(uri, 'eng');
  const text = result?.data?.text?.trim() || '';
  const blocks = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line }));
  return { text, blocks, engine: 'tesseract' };
}
