// app.config.js
import "dotenv/config";

export default ({ config }) => ({
  ...config,
  extra: {
    appVariant: process.env.APP_VARIANT,
    apiBaseUrl: process.env.API_BASE_URL,
  },
});
