// frontend/app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'm-super-app',
  slug: 'm-super-app',
  scheme: process.env.APP_SCHEME || 'msuperapp-superadmin', // ← your custom URL scheme
  plugins: ['expo-router'], // keeps router config in sync
  extra: {
    appVariant: process.env.APP_VARIANT || 'super-admin',
    API_BASE_URL: process.env.API_BASE_URL,
  },
});
