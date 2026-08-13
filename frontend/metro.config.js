// frontend/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');
const config = getDefaultConfig(projectRoot);
const { resolve: metroResolve } = require('metro-resolver');

// Preserve Expo default watchFolders while including monorepo root
config.watchFolders = Array.from(
  new Set([...(config.watchFolders || []), projectRoot, monorepoRoot, path.resolve(projectRoot, 'src')])
);
config.resolver = config.resolver || {};
function resolveModule(name) {
  const local = path.resolve(projectRoot, 'node_modules', name);
  if (fs.existsSync(local)) return local;
  const hoisted = path.resolve(monorepoRoot, 'node_modules', name);
  if (fs.existsSync(hoisted)) return hoisted;
  return local;
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  // Ensure single React & key libraries across the app to avoid version mismatches
  react: resolveModule('react'),
  'react-dom': resolveModule('react-dom'),
  'react-native-web': resolveModule('react-native-web'),
  // Ensure React runtimes resolve from the same React copy (avoid root hoisted React 19)
  'react/jsx-runtime': resolveModule('react/jsx-runtime.js'),
  'react/jsx-dev-runtime': resolveModule('react/jsx-dev-runtime.js'),
  scheduler: resolveModule('scheduler'),
  'expo-router': resolveModule('expo-router'),
  // Project aliases
  '@super-admin': path.resolve(projectRoot, 'src/super-admin'),
  '@config': path.resolve(projectRoot, 'config'),
  '@theme': path.resolve(projectRoot, 'src/theme'),
  '@utils': path.resolve(projectRoot, 'src/utils'),
  // Force pretty-format to our CJS-friendly shim to avoid undefined .default on web overlays
  'pretty-format': path.resolve(projectRoot, 'polyfills/pretty-format/index.js'),
  'pretty-format/build/index.js': path.resolve(projectRoot, 'polyfills/pretty-format/index.js'),
};

// Avoid duplicate React by resolving modules from this workspace or hoisted monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Keep resolver simple and avoid breaking package resolution on web.
// We rely on extraNodeModules mapping above; do not override resolveRequest.
delete config.resolver.resolveRequest;

// --- DEV log sink on Metro: POST /dev-logs ---
const LOG_DIR = path.join(projectRoot + '/src/', 'utils', 'logs');

function ensureLogDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}
function todayFilePath() {
  ensureLogDir();
  const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `${d}.log`);
}
function appendLine(line) {
  try {
    fs.appendFileSync(todayFilePath(), line);
  } catch {
    // ignore write errors in dev
  }
}

config.server = config.server || {};
const prevEnhance = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware /*, server */) => {
  const enhanced = (req, res, next) => {
    // Handle CORS preflight for web
    if (req.method === 'OPTIONS' && req.url.startsWith('/dev-logs')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'content-type');
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.url.startsWith('/dev-logs')) {
      res.setHeader('Access-Control-Allow-Origin', '*');

      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          const ts = new Date(json.ts || Date.now()).toISOString();
          const level = String(json.level || 'info').toUpperCase();
          const msg = json.message || '';
          const meta = json.meta ? ` ${JSON.stringify(json.meta)}` : '';
          appendLine(`[${ts}] ${level}: ${msg}${meta}\n`);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'bad_json' }));
        }
      });
      return;
    }

    return middleware(req, res, next);
  };

  return prevEnhance ? prevEnhance(enhanced) : enhanced;
};

module.exports = config;
// Configure Metro symbolicator to avoid trying to read pseudo-files like "<anonymous>"
config.symbolicator = config.symbolicator || {};
config.symbolicator.customizeFrame = async (frame) => {
  try {
    const file = typeof frame.file === 'string' ? frame.file : '';
    if (
      !file ||
      file === '<anonymous>' ||
      file.startsWith('eval') ||
      file.includes('Debugger eval code')
    ) {
      return { collapse: true };
    }
  } catch { }
  return {};
};
config.symbolicator.customizeStack = async (stack /*, extraData */) => {
  // no-op passthrough; required to keep type shape
  return stack;
};
