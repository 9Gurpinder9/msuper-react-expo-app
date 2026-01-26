// frontend/src/utils/ocrEngine.native.ts
import { NativeModules } from 'react-native';
import MlkitOcr from 'react-native-mlkit-ocr';
import type { OcrBlock, OcrResult } from './ocrEngine.types';

export async function runOcrFromUri(uri: string): Promise<OcrResult> {
  if (!MlkitOcr?.detectFromUri || !NativeModules?.MlkitOcr) {
    throw new Error(
      'ML Kit OCR native module is not available. Use a dev build (not Expo Go).'
    );
  }
  const blocks = (await MlkitOcr.detectFromUri(uri)) as OcrBlock[];
  const text = blocks.map((b) => b.text).join('\n').trim();
  return { text, blocks, engine: 'mlkit' };
}
