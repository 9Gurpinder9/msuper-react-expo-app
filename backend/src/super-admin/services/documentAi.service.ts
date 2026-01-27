import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { config } from '../../config';
import logger from '../../utils/logger';

type InvoiceLineItem = {
  description: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
  raw: string;
};

type InvoiceData = {
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

function toDate(entity: any) {
  const date = entity?.normalizedValue?.dateValue;
  if (!date?.year || !date?.month || !date?.day) return undefined;
  const mm = String(date.month).padStart(2, '0');
  const dd = String(date.day).padStart(2, '0');
  return `${date.year}-${mm}-${dd}`;
}

function firstEntity(entities: any[], type: string) {
  return entities.find((entity) => entity.type === type);
}

function pickProperty(entity: any, types: string[]) {
  const props = entity?.properties || [];
  return props.find((prop: any) => types.includes(prop.type));
}

function parseLineItems(entities: any[]): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];
  const lineEntities = entities.filter((entity) => entity.type === 'line_item');

  for (const line of lineEntities) {
    const descriptionEntity =
      pickProperty(line, ['description', 'line_item_description', 'item_description']) || line;
    const qtyEntity = pickProperty(line, ['quantity', 'line_item_quantity']);
    const unitPriceEntity = pickProperty(line, ['unit_price', 'price', 'line_item_unit_price']);
    const amountEntity = pickProperty(line, ['amount', 'line_item_amount']);

    const qty = qtyEntity?.normalizedValue?.numberValue
      ? Number(qtyEntity.normalizedValue.numberValue)
      : undefined;
    const unitPrice = toAmount(unitPriceEntity).amount;
    const lineTotal = toAmount(amountEntity).amount;

    const description = descriptionEntity?.mentionText || 'Item';
    items.push({
      description,
      qty,
      unitPrice,
      lineTotal,
      raw: line?.mentionText || description,
    });
  }

  return items;
}

function buildInvoiceData(document: any): InvoiceData {
  const text = document?.text || '';
  const lines = normalizeLines(text);
  const entities = document?.entities || [];

  const supplier = firstEntity(entities, 'supplier_name');
  const invoiceId = firstEntity(entities, 'invoice_id');
  const invoiceDate = firstEntity(entities, 'invoice_date');
  const totalAmount = firstEntity(entities, 'total_amount');
  const netAmount = firstEntity(entities, 'net_amount');
  const totalTax = firstEntity(entities, 'total_tax_amount');

  const total = toAmount(totalAmount);
  const subtotal = toAmount(netAmount);
  const tax = toAmount(totalTax);

  const currency = total.currency || subtotal.currency || tax.currency || undefined;

  return {
    vendor: supplier?.mentionText || undefined,
    invoiceNumber: invoiceId?.mentionText || undefined,
    date: toDate(invoiceDate),
    subtotal: subtotal.amount,
    tax: tax.amount,
    total: total.amount,
    currency,
    items: parseLineItems(entities),
    rawText: text,
    lines,
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
