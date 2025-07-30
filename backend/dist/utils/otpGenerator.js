"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNumericOtp = generateNumericOtp;
function generateNumericOtp(length = 6) {
    return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
}
