import { RequestHandler } from 'express';
import logger from '../../utils/logger';
import {
  processInvoiceDocument,
  processInvoiceDocumentBatch,
} from '../services/documentAi.service';

export const onlineScanBillHandler: RequestHandler = async (req, res, next) => {
  try {
    const { imageBase64, mimeType, files } = (req.body || {}) as {
      imageBase64?: string;
      mimeType?: string;
      files?: { imageBase64: string; mimeType?: string }[];
    };

    const data = Array.isArray(files) && files.length
      ? await processInvoiceDocumentBatch(files)
      : await processInvoiceDocument({ imageBase64: imageBase64 as string, mimeType });

    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error(`POST /super-admin/online-scan-bill - ${err.message}`);
    next(err);
  }
};
