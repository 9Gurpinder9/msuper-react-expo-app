import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { config } from '../../config';
import logger from '../../utils/logger';

type InvoiceTaxBreakdown = {
  percent?: number;
  amount?: number;
};

type InvoiceItem = {
  srNo?: number;
  name?: string;
  hsnOrSac?: string;
  uom?: string;
  qty?: number;
  includingTaxPrice?: number;
  discountAmount?: number;
  taxableAmount?: number;
  sgst?: InvoiceTaxBreakdown;
  cgst?: InvoiceTaxBreakdown;
  total?: number;
  raw: string;
};

type InvoiceCompany = {
  name?: string;
  gstin?: string;
  msme?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  state?: string;
  stateCode?: string;
};

type InvoiceCustomer = {
  name?: string;
  address?: string;
  pincode?: string;
  gstin?: string;
  contactNo?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  reverseCharge?: string;
  payMode?: string;
  grNo?: string;
  grDate?: string;
  placeOfSupply?: string;
  stateCode?: string;
};

type InvoiceItemsTotal = {
  uomQty?: number;
  discount?: number;
  taxableAmount?: number;
  sgstPercent?: number;
  sgstAmount?: number;
  cgstPercent?: number;
  cgstAmount?: number;
  total?: number;
};

type InvoiceOthers = {
  bankName?: string;
  bankAccountNo?: string;
  ifsc?: string;
  totalAmountBeforeTax?: number;
  sgst?: number;
  cgst?: number;
  totalAmountAfterTax?: number;
  discount?: number;
  netBillAmount?: number;
  amountInWords?: string;
};

type InvoiceData = {
  company: InvoiceCompany;
  customer: InvoiceCustomer;
  items: InvoiceItem[];
  items_total: InvoiceItemsTotal;
  others: InvoiceOthers;
  rawText: string;
  lines: string[];
  // Compatibility fields (for existing UI)
  vendor?: string;
  invoiceNumber?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
};

type ProcessDocumentInput = {
  imageBase64: string;
  mimeType?: string;
};

function getClient() {
  const location = config.documentAiLocation || 'us';
  const apiEndpoint =
    location === 'eu' ? 'eu-documentai.googleapis.com' : 'us-documentai.googleapis.com';
  if (config.documentAiServiceAccountKey) {
    let credentials: { client_email?: string; private_key?: string } | undefined;
    try {
      const parsed = JSON.parse(config.documentAiServiceAccountKey);
      credentials = {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    } catch (error: any) {
      throw new Error(`DOCUMENTAI_SA_KEY is not valid JSON: ${error?.message || error}`);
    }

    if (!credentials?.client_email || !credentials?.private_key) {
      throw new Error('DOCUMENTAI_SA_KEY must include client_email and private_key fields.');
    }

    return new DocumentProcessorServiceClient({
      apiEndpoint,
      credentials,
      projectId: config.documentAiProjectId,
    });
  }

  return new DocumentProcessorServiceClient({ apiEndpoint });
}

function requireDocAiConfig() {
  if (!config.documentAiProjectId || !config.documentAiProcessorId || !config.documentAiLocation) {
    throw new Error(
      'Document AI config missing. Set DOCUMENTAI_PROJECT_ID, DOCUMENTAI_LOCATION, DOCUMENTAI_PROCESSOR_ID.'
    );
  }
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function toAmount(entity: any) {
  const money = entity?.normalizedValue?.moneyValue;
  if (!money) return { amount: undefined, currency: undefined };
  const units = Number(money.units || 0);
  const nanos = Number(money.nanos || 0);
  const amount = units + nanos / 1e9;
  const currency = money.currencyCode || undefined;
  return { amount, currency };
}

function firstEntity(entities: any[], type: string) {
  return entities.find((entity) => entity.type === type);
}

function parseAmount(input: string) {
  const cleaned = input.replace(/[^0-9,.\-]/g, '');
  if (!cleaned) return undefined;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.replace(/,/g, '');
  } else if (hasComma && !hasDot) {
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length === 2) {
      normalized = cleaned.replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function findLineIndex(lines: string[], pattern: RegExp) {
  return lines.findIndex((line) => pattern.test(line));
}

function extractValue(lines: string[], pattern: RegExp) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(pattern);
    if (match?.[1]) return match[1].trim();
    if (match && i + 1 < lines.length) {
      return lines[i + 1].trim();
    }
  }
  return undefined;
}

function extractAmount(lines: string[], pattern: RegExp) {
  const value = extractValue(lines, pattern);
  return value ? parseAmount(value) : undefined;
}

function parseCompany(lines: string[], supplierName?: string): InvoiceCompany {
  const name = supplierName || extractValue(lines, /^\s*([A-Z][A-Z\s&.-]+)\s*$/);
  const gstin = extractValue(lines, /GSTIN\s*[:\-]?\s*([A-Z0-9]+)/i);
  const msme = extractValue(lines, /MSME\s*[:\-]?\s*([A-Za-z0-9\s]+)/i);
  const pan = extractValue(lines, /PAN\s*NO\.?\s*[:\-]?\s*([A-Z0-9]+)/i);
  const mobile = extractValue(lines, /Mob(?:ile)?\s*[:\-]?\s*([0-9,+\s]+)/i);
  const email = extractValue(lines, /Email\s*[:\-]?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);

  const locationLine = lines.find((line) => /Pin/i.test(line) && /State/i.test(line));
  const pincode = locationLine?.match(/Pin(?:code)?\s*[-:]?\s*([0-9]{5,6})/i)?.[1];
  const state = locationLine?.match(/State\s*[:\-]?\s*([A-Za-z\s]+)/i)?.[1]?.trim();
  const stateCode = locationLine?.match(/State\s*Code\s*[:\-]?\s*([0-9]{1,2})/i)?.[1];

  const addressLines: string[] = [];
  for (const line of lines) {
    if (
      /GSTIN|MSME|PAN|Mob|Email|TAX INVOICE|Invoice/i.test(line) ||
      line === name
    ) {
      continue;
    }
    if (addressLines.length < 4 && /[A-Za-z]/.test(line)) {
      addressLines.push(line);
    }
  }

  return {
    name,
    gstin,
    msme,
    pan,
    mobile,
    email,
    address: addressLines.length ? addressLines.join(', ') : undefined,
    city: locationLine?.split(',')[0]?.trim(),
    pincode,
    state,
    stateCode,
  };
}

function parseCustomer(lines: string[]): InvoiceCustomer {
  const invoiceDate =
    extractValue(lines, /Invoice\s*Date\.?\s*[:\-]?\s*([0-9./-]+)/i) ||
    extractValue(lines, /Invoice\s*Date\.?/i);
  const payMode =
    extractValue(lines, /Pay\s*Mode\s*[:\-]?\s*([A-Za-z]+)/i) || extractValue(lines, /Pay\s*Mode/i);
  const grNo = extractValue(lines, /G\.R\.?No\.?\s*[:\-]?\s*([A-Za-z0-9-]+)/i) || extractValue(lines, /G\.R\.?No\.?/i);
  const grDate = extractValue(lines, /G\.R\.?Dt\.?\s*[:\-]?\s*([0-9./-]+)/i) || extractValue(lines, /G\.R\.?Dt\.?/i);

  return {
    name: extractValue(lines, /Name\s*[:\-]?\s*(.+)/i),
    address: extractValue(lines, /Address\s*[:\-]?\s*(.+)/i),
    pincode: extractValue(lines, /Pincode\s*[:\-]?\s*([0-9]{5,6})/i),
    gstin: extractValue(lines, /GSTIN\s*[:\-]?\s*(Unregistered|[A-Z0-9]+)/i),
    contactNo: extractValue(lines, /Contact\s*No\.?\s*[:\-]?\s*([0-9,+\s]+)/i),
    invoiceNo: extractValue(lines, /Invoice\s*No\.?\s*[:\-]?\s*([A-Z0-9-]+)/i),
    invoiceDate,
    reverseCharge: extractValue(lines, /Reverse\s*Charge\s*[:\-]?\s*([A-Za-z]+)/i),
    payMode,
    grNo,
    grDate,
    placeOfSupply: extractValue(lines, /Place\s*of\s*Supply\s*[:\-]?\s*(.+)/i),
    stateCode: extractValue(lines, /State\s*Code\s*[:\-]?\s*([0-9]{1,2})/i),
  };
}

function isItemStart(line: string) {
  if (!/^\d+\s+/.test(line)) return false;
  if (/^(?:\d+)\s*(?:%|Pc|Pcs)$/i.test(line)) return false;
  if (/^(?:\d+)\s*(?:GST|SGST|CGST|HSN|ISAC)/i.test(line)) return false;
  return /[A-Za-z]/.test(line);
}

function parseItemBlocks(lines: string[]): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  let current: { lines: string[]; srNo?: number; name?: string } | null = null;

  const flush = () => {
    if (!current) return;
    const raw = current.lines.join(' | ');
    const blockText = current.lines.join(' ');
    const hsn = blockText.match(/\b\d{6,8}\b/)?.[0];
    const unitMatch = blockText.match(/\b(\d+(?:\.\d+)?)\s*(Pc|Pcs|Nos|Kg|Ltr|Box|Set)\b/i);
    const qty = unitMatch ? parseAmount(unitMatch[1]) : undefined;
    const uom = unitMatch?.[2];

    const amounts = Array.from(blockText.matchAll(/\d[\d,]*\.\d{2}/g))
      .map((m) => parseAmount(m[0]))
      .filter((v): v is number => typeof v === 'number')
      .sort((a, b) => a - b);

    const total = amounts.length ? amounts[amounts.length - 1] : undefined;
    const taxableAmount = amounts.length > 1 ? amounts[amounts.length - 2] : undefined;
    const includingTaxPrice = amounts.length > 2 ? amounts[0] : undefined;
    const discountAmount = blockText.includes('0.00') ? 0 : undefined;

    const taxMatches = Array.from(blockText.matchAll(/(\d{1,2})%\s*([0-9,]+\.\d{2})/g));
    const sgst =
      taxMatches.length > 0
        ? { percent: Number(taxMatches[0][1]), amount: parseAmount(taxMatches[0][2]) }
        : undefined;
    const cgst =
      taxMatches.length > 1
        ? { percent: Number(taxMatches[1][1]), amount: parseAmount(taxMatches[1][2]) }
        : undefined;

    items.push({
      srNo: current.srNo,
      name: current.name,
      hsnOrSac: hsn,
      uom,
      qty,
      includingTaxPrice,
      discountAmount,
      taxableAmount,
      sgst,
      cgst,
      total,
      raw,
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isItemStart(line)) {
      flush();
      const [srToken, ...rest] = line.split(' ');
      current = {
        srNo: Number(srToken),
        name: rest.join(' ').trim() || undefined,
        lines: [line],
      };
      continue;
    }
    if (!current) continue;
    current.lines.push(line);
  }

  flush();
  return items;
}

function parseItems(lines: string[]) {
  const headerIndex = findLineIndex(lines, /Sr\./i);
  const endIndex = findLineIndex(lines, /Item\s*Total|Total\s*Amount\s*Before\s*Tax/i);
  if (headerIndex === -1 || endIndex === -1 || endIndex <= headerIndex) return [];
  const slice = lines.slice(headerIndex + 1, endIndex);
  return parseItemBlocks(slice);
}

function parseItemsTotal(lines: string[]): InvoiceItemsTotal {
  const idx = findLineIndex(lines, /Item\s*Total/i);
  if (idx === -1) return {};

  const numeric = lines
    .slice(idx, idx + 12)
    .flatMap((line) => Array.from(line.matchAll(/\d[\d,]*\.\d{2}|\b\d+\b/g)).map((m) => m[0]))
    .map((value) => (value.includes('.') ? parseAmount(value) : Number(value)))
    .filter((value) => Number.isFinite(value)) as number[];

  return {
    uomQty: numeric.find((val) => Number.isInteger(val) && val > 0),
    discount: numeric.find((val) => val === 0),
    taxableAmount: numeric.find((val) => val > 1000),
    sgstAmount: numeric.find((val) => val > 100 && val < 10000),
    cgstAmount: numeric.find((val) => val > 100 && val < 10000),
    total: numeric.length ? numeric[numeric.length - 1] : undefined,
  };
}

function parseOthers(lines: string[]): InvoiceOthers {
  return {
    bankName: extractValue(lines, /OUR\s*BANK\s*[:\-]?\s*(.+)/i),
    bankAccountNo: extractValue(lines, /BANK\s*A\/C\s*NO\.?\s*[:\-]?\s*([0-9]+)/i),
    ifsc: extractValue(lines, /IFSC\s*CODE\s*[:\-]?\s*([A-Z0-9]+)/i),
    totalAmountBeforeTax: extractAmount(lines, /Total\s*Amount\s*Before\s*Tax\s*[:\-]?\s*([0-9,]+\.\d{2})/i),
    sgst: extractAmount(lines, /\bSGST\b\s*[:\-]?\s*([0-9,]+\.\d{2})/i),
    cgst: extractAmount(lines, /\bCGST\b\s*[:\-]?\s*([0-9,]+\.\d{2})/i),
    totalAmountAfterTax: extractAmount(lines, /Total\s*Amount\s*After\s*Tax\s*[:\-]?\s*([0-9,]+\.\d{2})/i),
    discount: extractAmount(lines, /Discount\s*[:\-]?\s*([0-9,]+\.\d{2})/i),
    netBillAmount: extractAmount(lines, /Net\s*Bill\s*Amount\s*[:\-]?\s*([0-9,]+\.\d{2})/i),
    amountInWords: extractValue(lines, /Amount\s*in\s*Words\s*[:\-]?\s*(.+)/i),
  };
}

function buildInvoiceData(document: any): InvoiceData {
  const text = document?.text || '';
  const lines = normalizeLines(text);
  const entities = document?.entities || [];

  const supplier = firstEntity(entities, 'supplier_name')?.mentionText;
  const companyEndIdx = findLineIndex(lines, /Name\s*[:\-]/i);
  const companyLines = companyEndIdx > 0 ? lines.slice(0, companyEndIdx) : lines.slice(0, 12);
  const customerStartIdx = findLineIndex(lines, /Name\s*[:\-]/i);
  const customerEndIdx = findLineIndex(lines, /Place\s*of\s*Supply/i);
  const customerLines =
    customerStartIdx >= 0
      ? lines.slice(customerStartIdx, customerEndIdx > customerStartIdx ? customerEndIdx + 1 : undefined)
      : [];

  const company = parseCompany(companyLines, supplier);
  const customer = parseCustomer(customerLines);
  const items = parseItems(lines);
  const items_total = parseItemsTotal(lines);
  const others = parseOthers(lines);

  const subtotal = others.totalAmountBeforeTax || items_total.taxableAmount;
  const tax =
    (others.sgst ?? 0) + (others.cgst ?? 0) ||
    (items_total.sgstAmount ?? 0) + (items_total.cgstAmount ?? 0);
  const total = others.totalAmountAfterTax || items_total.total;

  return {
    company,
    customer,
    items,
    items_total,
    others,
    rawText: text,
    lines,
    vendor: company.name,
    invoiceNumber: customer.invoiceNo,
    date: customer.invoiceDate,
    subtotal,
    tax: tax || undefined,
    total,
    currency: 'INR',
  };
}

export async function processInvoiceDocument({
  imageBase64,
  mimeType,
}: ProcessDocumentInput): Promise<InvoiceData> {
  requireDocAiConfig();
  const client = getClient();
  const content = imageBase64.replace(/^data:.+;base64,/, '');

  const name = client.processorPath(
    config.documentAiProjectId as string,
    config.documentAiLocation as string,
    config.documentAiProcessorId as string
  );

  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: Buffer.from(content, 'base64'),
      mimeType: mimeType || 'image/jpeg',
    },
  });

  if (!result?.document) {
    logger.warn('Document AI returned empty document.');
  }

  return buildInvoiceData(result?.document);
}
