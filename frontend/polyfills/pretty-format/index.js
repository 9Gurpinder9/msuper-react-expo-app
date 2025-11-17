// Minimal CJS shim for pretty-format on web dev overlay.
// Avoid requiring the original package to prevent ESM/CJS default issues.
const fallback = (v) => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};
fallback.plugins = {};
module.exports = fallback;
module.exports.default = fallback;
