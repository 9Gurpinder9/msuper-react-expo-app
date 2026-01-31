// frontend/src/utils/scanBillFilePicker.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export type ScanBillFileKind = 'image' | 'pdf';

export type ScanBillFile = {
  uri: string;
  name: string;
  mimeType: string;
  kind: ScanBillFileKind;
};

const EXT_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

function inferMimeTypeFromName(name: string) {
  const clean = name.split('?')[0];
  const parts = clean.split('.');
  if (parts.length < 2) return '';
  const ext = parts[parts.length - 1]?.toLowerCase();
  return (ext && EXT_MIME_MAP[ext]) || '';
}

function getKind(mimeType: string, name: string): ScanBillFileKind {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  const inferred = inferMimeTypeFromName(name);
  if (inferred === 'application/pdf') return 'pdf';
  return 'image';
}

export async function pickScanBillFile(): Promise<ScanBillFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const name = asset.name || 'upload';
  const mimeType = asset.mimeType || inferMimeTypeFromName(name) || 'application/octet-stream';

  return {
    uri: asset.uri,
    name,
    mimeType,
    kind: getKind(mimeType, name),
  };
}

export async function readScanBillFileBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
