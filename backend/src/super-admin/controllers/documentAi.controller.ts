import { RequestHandler } from 'express';
import logger from '../../utils/logger';
import { processInvoiceDocument } from '../services/documentAi.service';

export const onlineScanBillHandler: RequestHandler = async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = (req.body || {}) as {
      imageBase64: string;
      mimeType?: string;
    };

    const data = await processInvoiceDocument({ imageBase64, mimeType });
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error(`POST /super-admin/online-scan-bill - ${err.message}`);
    next(err);
  }
};
