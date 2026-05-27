"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
let warned = false;
const appSecretGuard = (req, res, next) => {
    const expected = config_1.config.appSecret;
    if (!expected) {
        if (!warned) {
            warned = true;
            logger_1.default.warn('APP_SECRET not set. Company endpoints are not protected.');
        }
        next();
        return;
    }
    const provided = req.header('x-app-secret');
    if (!provided || provided !== expected) {
        res.status(401).json({ success: false, message: 'Unauthorized: invalid app secret.' });
        return;
    }
    next();
};
exports.default = appSecretGuard;
