"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineScanBillHandler = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const documentAi_service_1 = require("../services/documentAi.service");
const onlineScanBillHandler = async (req, res, next) => {
    try {
        const { imageBase64, mimeType, files } = (req.body || {});
        const data = Array.isArray(files) && files.length
            ? await (0, documentAi_service_1.processInvoiceDocumentBatch)(files)
            : await (0, documentAi_service_1.processInvoiceDocument)({ imageBase64: imageBase64, mimeType });
        return res.json({ success: true, data });
    }
    catch (err) {
        logger_1.default.error(`POST /super-admin/online-scan-bill - ${err.message}`);
        next(err);
    }
};
exports.onlineScanBillHandler = onlineScanBillHandler;
