// frontend/src/utils/invoiceParser.ts
import { Platform } from 'react-native';

export type InvoiceLineItem = {
  description: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
  raw: string;
};

export type InvoiceData = {
  vendor?: string;
  invoiceNumber?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  items: InvoiceLineItem[];
  rawText: string;
  lines: string[];
};

const DATE_PATTERNS = [
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i,
  /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/i,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/i,
];

const INVOICE_NUMBER_PATTERN =
  /\b(?:invoice|inv|receipt|bill)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([a-z0-9-]+)/i;

const CURRENCY_SYMBOLS = ['$', '€', '£', '₹'];
const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'INR'];

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter((line) => line.length > 0);
}

function detectCurrency(text: string) {
  const upper = text.toUpperCase();
  const symbol = CURRENCY_SYMBOLS.find((s) => text.includes(s));
  if (symbol) return symbol;
  const code = CURRENCY_CODES.find((c) => upper.includes(c));
  return code || undefined;
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

function pickVendor(lines: string[]) {
  const excluded = /(invoice|receipt|bill|tax|total|subtotal|date|amount)/i;
  for (const line of lines.slice(0, 6)) {
    if (line.length >= 3 && /[a-z]/i.test(line) && !excluded.test(line)) {
      return line;
    }
  }
  return undefined;
}

function extractDate(lines: string[]) {
  for (const line of lines.slice(0, 10)) {
    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern);
      if (match) return match[0];
    }
  }
  return undefined;
}

function extractInvoiceNumber(lines: string[]) {
  for (const line of lines) {
    const match = line.match(INVOICE_NUMBER_PATTERN);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function extractTotals(lines: string[]) {
  const totals: { subtotal?: number; tax?: number; total?: number } = {};

  for (const line of lines) {
    const lower = line.toLowerCase();
    const amountMatch = line.match(/([€$£₹]?\s?\d[\d.,]+(?:\s?(?:usd|eur|gbp|inr))?)/i);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : undefined;

    if (amount === undefined) continue;

    if (!totals.total && /(total|amount due|balance due|grand total)/i.test(lower)) {
      totals.total = amount;
      continue;
    }
    if (!totals.subtotal && /(subtotal|sub-total|sub total)/i.test(lower)) {
      totals.subtotal = amount;
      continue;
    }
    if (!totals.tax && /(tax|vat|gst)/i.test(lower)) {
      totals.tax = amount;
    }
  }

  return totals;
}

function parseLineItems(lines: string[]) {
  const items: InvoiceLineItem[] = [];
  const exclude = /(subtotal|total|tax|balance due|amount due|invoice|receipt)/i;

  for (const line of lines) {
    if (exclude.test(line)) continue;

    const match =
      line.match(
        /^(.*?)(\d+(?:\.\d+)?)\s*(?:x|\*)\s*([€$£₹]?\s?[\d.,]+)\s+([€$£₹]?\s?[\d.,]+)$/i
      ) ||
      line.match(
        /^(.*?)(\d+(?:\.\d+)?)\s+([€$£₹]?\s?[\d.,]+)\s+([€$£₹]?\s?[\d.,]+)$/i
      );

    if (match) {
      const description = normalizeText(match[1] || 'Item');
      const qty = parseAmount(match[2] || '');
      const unitPrice = parseAmount(match[3] || '');
      const lineTotal = parseAmount(match[4] || '');
      items.push({
        description,
        qty,
        unitPrice,
        lineTotal,
        raw: line,
      });
    }
  }

  return items;
}

export function extractInvoiceData(rawText: string): InvoiceData {
  const lines = normalizeLines(rawText);
  const currency = detectCurrency(rawText);
  const vendor = pickVendor(lines);
  const date = extractDate(lines);
  const invoiceNumber = extractInvoiceNumber(lines);
  const totals = extractTotals(lines);
  const items = parseLineItems(lines);

  return {
    vendor,
    invoiceNumber,
    date,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    currency,
    items,
    rawText,
    lines,
  };
}

export function formatMoney(amount?: number, currency?: string) {
  if (amount === undefined) return undefined;
  const code = currency && currency.length > 1 ? currency : undefined;
  try {
    return new Intl.NumberFormat(Platform.OS === 'web' ? undefined : 'en-US', {
      style: code ? 'currency' : 'decimal',
      currency: code || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}
