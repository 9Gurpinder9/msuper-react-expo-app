"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJwt = generateJwt;
exports.verifyJwt = verifyJwt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const secret = (process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-secret' : undefined));
const expiry = process.env.JWT_EXPIRY || '1d';
/**
 * Create a signed JWT with optional overrides (e.g. custom expiry)
 */
function generateJwt(payload, options) {
    return jsonwebtoken_1.default.sign(payload, secret, {
        expiresIn: expiry,
        ...options,
    });
}
/**
 * Verify and decode a JWT, throws if invalid/expired
 */
function verifyJwt(token) {
    return jsonwebtoken_1.default.verify(token, secret);
}
