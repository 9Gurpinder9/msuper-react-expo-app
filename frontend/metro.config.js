// frontend/metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// --- existing customizations ---
config.watchFolders = [path.resolve(projectRoot, "src")];
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  // Ensure single React across the app to avoid version mismatches
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native-web': path.resolve(projectRoot, 'node_modules/react-native-web'),
  // Project aliases
  '@super-admin': path.resolve(projectRoot, 'src/super-admin'),
  '@config': path.resolve(projectRoot, 'config'),
  '@theme': path.resolve(projectRoot, 'src/theme'),
  '@utils': path.resolve(projectRoot, 'src/utils'),
};

// --- DEV log sink on Metro: POST /dev-logs ---
const LOG_DIR = path.join(projectRoot+'/src/', "utils", "logs");

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
    if (req.method === "OPTIONS" && req.url.startsWith("/dev-logs")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.url.startsWith("/dev-logs")) {
      res.setHeader("Access-Control-Allow-Origin", "*");

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const json = JSON.parse(body || "{}");
          const ts = new Date(json.ts || Date.now()).toISOString();
          const level = String(json.level || "info").toUpperCase();
          const msg = json.message || "";
          const meta = json.meta ? ` ${JSON.stringify(json.meta)}` : "";
          appendLine(`[${ts}] ${level}: ${msg}${meta}\n`);

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "bad_json" }));
        }
      });
      return;
    }

    return middleware(req, res, next);
  };

  return prevEnhance ? prevEnhance(enhanced) : enhanced;
};

module.exports = config;
