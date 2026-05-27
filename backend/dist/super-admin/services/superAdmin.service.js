"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAdminByEmail = findAdminByEmail;
exports.verifyPassword = verifyPassword;
exports.getAdminPublicByEmail = getAdminPublicByEmail;
exports.updateAdminPassword = updateAdminPassword;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const bcrypt_1 = __importDefault(require("bcrypt"));
async function findAdminByEmail(email) {
    const { data, error } = await supabaseClient_1.default
        .from('super_admins')
        .select('*')
        .eq('email', email);
    if (error)
        throw error;
    return data?.[0] ?? null;
}
async function verifyPassword(plain, hash) {
    return bcrypt_1.default.compare(plain, hash);
}
async function getAdminPublicByEmail(email) {
    const { data, error } = await supabaseClient_1.default
        .from('super_admins')
        .select('id, email, name')
        .eq('email', email)
        .order('id', { ascending: true })
        .limit(1);
    if (error)
        throw error;
    return data?.[0] ?? null;
}
async function updateAdminPassword(email, passwordHash) {
    const { data, error } = await supabaseClient_1.default
        .from('super_admins')
        .update({ password: passwordHash })
        .eq('email', email)
        .select('id');
    if (error)
        throw error;
    return data?.[0] ?? null;
}
