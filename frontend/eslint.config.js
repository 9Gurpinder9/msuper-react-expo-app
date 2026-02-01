const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

// Bridge existing .eslintrc.js config to ESLint v9 flat config
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

module.exports = [
  ...compat.config({
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "react", "react-hooks"],
    extends: [
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
      "plugin:@typescript-eslint/recommended",
      "prettier"
    ],
    parserOptions: { ecmaFeatures: { jsx: true } },
    settings: { react: { version: "detect" } }
  })
];
