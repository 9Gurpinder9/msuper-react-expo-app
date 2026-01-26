// frontend/src/utils/ocrEngine.ts
import { Platform } from 'react-native';
import type { OcrResult } from './ocrEngine.types';

export type { OcrBlock, OcrResult } from './ocrEngine.types';

export async function runOcrFromUri(uri: string): Promise<OcrResult> {
  if (Platform.OS === 'web') {
    const mod = await import('./ocrEngine.web');
    return mod.runOcrFromUri(uri);
  }
  const mod = await import('./ocrEngine.native');
  return mod.runOcrFromUri(uri);
}
