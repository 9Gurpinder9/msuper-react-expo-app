// frontend/src/utils/ocrEngine.types.ts
export type OcrBlock = {
  text: string;
  frame?: { left: number; top: number; width: number; height: number };
};

export type OcrResult = {
  text: string;
  blocks: OcrBlock[];
  engine: 'mlkit' | 'tesseract';
};
