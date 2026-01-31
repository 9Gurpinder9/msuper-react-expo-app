# Frontend (Expo React)

- Start (web/native dev): `npm start`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm test`

Environment
- Configure public API base via `API_BASE_URL` in `app.config.js` or env.
- hCaptcha (always-on for Super Admin login):
  - Create a site in the hCaptcha dashboard and obtain keys.
  - Set `HCAPTCHA_SITE_KEY` in the root `.env` used by Expo.

Structure
- Routes: `app/` via expo-router
- Feature code: `src/super-admin`
- Theme: `src/theme`
- Utilities: `src/utils`
- Services/Hooks: `src/services`, `src/hooks`
