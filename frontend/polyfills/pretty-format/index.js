const cjs = require('pretty-format/build/index.js');
const format = cjs.default || cjs;

module.exports = Object.assign(format, cjs, { default: format });
