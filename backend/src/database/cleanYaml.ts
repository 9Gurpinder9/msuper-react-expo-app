import fs from 'fs';
import path from 'path';

const yamlPath = path.join(__dirname, '../../../frontend/e2e/company_categories.yaml');
console.log('Cleaning up YAML file:', yamlPath);

try {
  let content = fs.readFileSync(yamlPath, 'utf8');
  // Add hideKeyboard after inputText
  content = content.replace(/- inputText:\s+"([^"]+)"\r?\n- tapOn:\r?\n\s+id:\s+"save-category-button"/g, '- inputText: "$1"\n- hideKeyboard\n- tapOn:\n    id: "save-category-button"');
  fs.writeFileSync(yamlPath, content, 'utf8');
  console.log('Successfully cleaned up the YAML file with hideKeyboard!');
} catch (err) {
  console.error('Error cleaning YAML:', err);
}
