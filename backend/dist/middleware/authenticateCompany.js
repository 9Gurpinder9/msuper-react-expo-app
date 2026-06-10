"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generateJwt_1 = require("../utils/generateJwt");
const logger_1 = __importDefault(require("../utils/logger"));
const authenticateCompany = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Unauthorized: token missing.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, generateJwt_1.verifyJwt)(token);
        if (payload.role !== 'COMPANY') {
            logger_1.default.warn(`Role mismatch in company auth middleware. Expected COMPANY, got ${payload.role}`);
            res.status(403).json({ success: false, message: 'Forbidden: access denied.' });
            return;
        }
        // attach decoded payload to req.user
        ;
        req.user = payload;
        next();
    }
    catch (err) {
        logger_1.default.warn(`JWT verification failed for company: ${err.message}`);
        res.status(401).json({ success: false, message: 'Unauthorized: invalid token.' });
    }
};
exports.default = authenticateCompany;
