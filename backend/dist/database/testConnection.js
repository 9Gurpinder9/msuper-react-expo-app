"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSupabaseConnection = checkSupabaseConnection;
const supabaseClient_1 = __importDefault(require("./supabaseClient"));
/**
 * Attempts a minimal query to verify Supabase is reachable.
 * Uses a tiny select against a lightweight table. If the table
 * does not exist or permissions are restricted, we still treat
 * the instance as reachable and return details in `error`.
 */
async function checkSupabaseConnection() {
    try {
        const { data, error, status } = await supabaseClient_1.default
            .from('test_data')
            .select('id')
            .limit(1);
        if (error) {
            return {
                ok: false,
                reachable: true,
                status,
                error: {
                    message: error.message,
                    details: error.details ?? null,
                    hint: error.hint ?? null,
                    code: error.code ?? null,
                },
            };
        }
        return {
            ok: true,
            reachable: true,
            status: status ?? 200,
            rows: (data ?? []).length,
        };
    }
    catch (e) {
        return {
            ok: false,
            reachable: false,
            error: { message: e?.message || String(e) },
        };
    }
}
