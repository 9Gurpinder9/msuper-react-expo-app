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

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalTimestamp(date = new Date()) {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${day}-${month}-${year}-${hours}-${minutes}`;
}

async function getUniqueBaseName(baseName: string) {
  let name = baseName;
  let counter = 1;
  while (true) {
    const candidatePath = `${JSON_DIR}/${name}.json`;
    const info = await FileSystem.getInfoAsync(candidatePath);
    if (!info.exists) {
      return name;
    }
    name = `${baseName}-${counter}`;
    counter += 1;
  }
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

  const baseName = await getUniqueBaseName(formatLocalTimestamp());
  const id = baseName;
  let imagePath: string | undefined;

  if (params.imageUri) {
    const ext = getExtension(params.imageUri);
    imagePath = `${IMAGE_DIR}/${baseName}.${ext}`;
    await FileSystem.copyAsync({ from: params.imageUri, to: imagePath });
  }

  const record: ScanBillRecord = {
    id,
    createdAt: new Date().toISOString(),
    jsonPath: `${JSON_DIR}/${baseName}.json`,
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
