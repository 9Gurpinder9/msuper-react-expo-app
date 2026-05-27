"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testConnection_1 = require("./testConnection");
async function main() {
    try {
        const result = await (0, testConnection_1.checkSupabaseConnection)();
        // Simple CLI output for quick diagnostics
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
    }
    catch (err) {
        console.error(err?.message || err);
        process.exit(2);
    }
}
main();
