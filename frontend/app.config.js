// frontend/app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'm-super-app',
  slug: 'm-super-app',
  scheme: process.env.APP_SCHEME || 'msuperapp-superadmin', // ← your custom URL scheme
  plugins: ['expo-router'], // keeps router config in sync
  ios: {
    ...(config.ios || {}),
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      NSCameraUsageDescription: 'Allow access to the camera to scan invoices.',
      NSPhotoLibraryUsageDescription: 'Allow access to your photos to scan invoices.',
      NSPhotoLibraryAddUsageDescription: 'Allow access to save scanned invoice images.',
    },
  },
  android: {
    ...(config.android || {}),
    permissions: Array.from(
      new Set([...(config.android?.permissions || []), 'CAMERA', 'READ_MEDIA_IMAGES', 'READ_EXTERNAL_STORAGE'])
    ),
  },
  extra: {
    appVariant: process.env.APP_VARIANT || 'super-admin',
    API_BASE_URL: process.env.API_BASE_URL,
    HCAPTCHA_SITE_KEY: process.env.HCAPTCHA_SITE_KEY,
  },
});
