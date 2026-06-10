"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseClient_1 = __importDefault(require("./supabaseClient"));
async function check() {
    const { data, error } = await supabaseClient_1.default.from('companies').select('id, name, owner_name, email, validity_date, expiry_date');
    if (error) {
        console.error(error);
    }
    else {
        console.log('Existing Companies:', data);
    }
    process.exit(0);
}
check();
