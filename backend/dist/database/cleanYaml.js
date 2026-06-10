"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yamlPath = path_1.default.join(__dirname, '../../../frontend/e2e/company_categories.yaml');
console.log('Cleaning up YAML file:', yamlPath);
try {
    let content = fs_1.default.readFileSync(yamlPath, 'utf8');
    // Add hideKeyboard after inputText
    content = content.replace(/- inputText:\s+"([^"]+)"\r?\n- tapOn:\r?\n\s+id:\s+"save-category-button"/g, '- inputText: "$1"\n- hideKeyboard\n- tapOn:\n    id: "save-category-button"');
    fs_1.default.writeFileSync(yamlPath, content, 'utf8');
    console.log('Successfully cleaned up the YAML file with hideKeyboard!');
}
catch (err) {
    console.error('Error cleaning YAML:', err);
}
