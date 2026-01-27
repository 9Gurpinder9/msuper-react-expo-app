// frontend/src/utils/scanBillStorage.ts
import * as FileSystem from 'expo-file-system';
import type { InvoiceData } from './invoiceParser';

export type ScanBillRecord = {
  id: string;
  createdAt: string;
  jsonPath: string;
  imagePath?: string;
  ocrEngine: 'mlkit' | 'tesseract' | 'documentai';
  data: InvoiceData;
};

const ROOT_DIR = `${FileSystem.documentDirectory}scan-bills`;
const JSON_DIR = `${ROOT_DIR}/json`;
const IMAGE_DIR = `${ROOT_DIR}/images`;

async function ensureDirs() {
  await FileSystem.makeDirectoryAsync(JSON_DIR, { intermediates: true });
  await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
}

function getExtension(uri: string) {
  const clean = uri.split('?')[0];
  const parts = clean.split('.');
  if (parts.length > 1) return parts[parts.length - 1];
  return 'jpg';
}

export async function saveScanBillRecord(params: {
  imageUri?: string;
  data: InvoiceData;
  ocrEngine: 'mlkit' | 'tesseract' | 'documentai';
}): Promise<ScanBillRecord> {
  await ensureDirs();

  const id = `SB-${Date.now()}`;
  let imagePath: string | undefined;

  if (params.imageUri) {
    const ext = getExtension(params.imageUri);
    imagePath = `${IMAGE_DIR}/${id}.${ext}`;
    await FileSystem.copyAsync({ from: params.imageUri, to: imagePath });
  }

  const record: ScanBillRecord = {
    id,
    createdAt: new Date().toISOString(),
    jsonPath: `${JSON_DIR}/${id}.json`,
    imagePath,
    ocrEngine: params.ocrEngine,
    data: params.data,
  };

  await FileSystem.writeAsStringAsync(record.jsonPath, JSON.stringify(record, null, 2));
  return record;
}

export async function listScanBillRecords(): Promise<ScanBillRecord[]> {
  await ensureDirs();
  const files = await FileSystem.readDirectoryAsync(JSON_DIR);

  const records: ScanBillRecord[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const path = `${JSON_DIR}/${file}`;
    try {
      const raw = await FileSystem.readAsStringAsync(path);
      const parsed = JSON.parse(raw) as ScanBillRecord;
      records.push({ ...parsed, jsonPath: path });
    } catch {
      // ignore malformed records
    }
  }

  return records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function deleteScanBillRecord(record: ScanBillRecord) {
  if (record.imagePath) {
    await FileSystem.deleteAsync(record.imagePath, { idempotent: true });
  }
  await FileSystem.deleteAsync(record.jsonPath, { idempotent: true });
}
