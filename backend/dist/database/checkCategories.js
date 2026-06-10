"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseClient_1 = __importDefault(require("./supabaseClient"));
async function check() {
    const { data, error } = await supabaseClient_1.default.from('company_categories').select('name');
    if (error) {
        console.error(error);
    }
    else {
        console.log('Existing Categories:', data.map((d) => d.name));
    }
    process.exit(0);
}
check();
