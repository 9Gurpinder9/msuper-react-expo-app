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
  }),
  {
    files: [
      "app.config.js",
      ".eslintrc.js",
      "eslint.config.js",
      "babel.config.js",
      "metro.config.js"
    ],
    languageOptions: {
      globals: {
        module: "readonly",
        process: "readonly",
        require: "readonly",
        __dirname: "readonly"
      }
    }
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-empty": "warn"
    }
  }
];
