"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = void 0;
const crypto_1 = require("crypto");
const requestId = (req, _res, next) => {
    const header = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
    req.requestId = header;
    next();
};
exports.requestId = requestId;
