// Sync .github/copilot-instructions.md into AGENTS.md for Codex CLI context
// Usage: npm run sync:agents

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const src = path.join(repoRoot, '.github', 'copilot-instructions.md');
const dest = path.join(repoRoot, 'AGENTS.md');

function main() {
  if (!fs.existsSync(src)) {
    console.error('Missing .github/copilot-instructions.md');
    process.exit(1);
  }
  const body = fs.readFileSync(src, 'utf8');
  const header = 'NOTE: This file is auto-synced from .github/copilot-instructions.md. Edit that file and run `npm run sync:agents` to regenerate.\n\n';
  fs.writeFileSync(dest, header + body, 'utf8');
  console.log('AGENTS.md updated from .github/copilot-instructions.md');
}

main();

