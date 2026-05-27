# Copilot instructions for msuper-react-expo-app

These instructions help AI agents work productively in this monorepo (frontend: Expo React Native, backend: Express + Supabase). Keep answers concrete and aligned to the codebase patterns below.

## Autonomy preference & planning flow

- **Mandatory Planning Rule:** Every time the user requests a new feature, design improvement, or code implementation, you **MUST first provide a clear summary/implementation plan** outlining the proposed changes.
- **Obtain Approval:** Do NOT start coding or making file edits for features until the user reviews the plan and explicitly confirms/approves to proceed.
- **Environment Autonomy:** For minor diagnostic commands or non-destructive terminal tasks, run them without manual confirmation if allowed by the sandbox. Ask only if blocked or destructive.

## Skill triggers (use installed skills when prompts match)

> [!IMPORTANT]
> If a skill seems relevant to your current task, you MUST use the `view_file` tool on its `SKILL.md` file to read the full instructions before proceeding.

- frontend-design: Use for any UI or visual build request (design, layout, styling, landing page, dashboard, component polish, "make it look nice", "improve UI/UX").
- ui-ux-pro-max: Use for UX reviews, design systems, typography/color/spacing guidance, or "design/optimize/check UI/UX".
- react-best-practices: Use when reading or writing React components, hooks, effects, or performance fixes.
- react-native-architecture: Use for Expo/React Native navigation, native modules, offline sync, device APIs, or mobile app architecture.
- react-patterns: Use for standard React design patterns, component composition, and hooks.
- react-state-management: Use when designing or optimizing state management solutions (e.g. Context API, state updates).
- react-ui-patterns: Use for structured guidelines when building reusable React UI components.
- react-modernization: Use when refactoring legacy React patterns to modern functional standards.
- react-nextjs-development: Use for Next.js-specific React patterns (Server Components, App Router).
- react-flow-node-ts: Use for creating custom node systems using React Flow and TypeScript.
- zustand-store-ts: Use when creating or updating Zustand state stores.
- fp-react: Use for combining functional programming principles (fp-ts) with React components.

## Architecture overview

- Monorepo with npm workspaces: `frontend/` (Expo Router) and `backend/` (Express v5, TypeScript).
- Backend
  - Entry: `src/server.ts` loads env, connects Redis (optional), starts `src/app.ts`.
  - App wiring: security (`helmet`, `cors`), JSON body, request id, access logs (`morgan`), global rate limit, routes from `src/routes/index.ts`, final `errorHandler`.
  - Config: `src/config/index.ts` validates env via Joi. Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `REDIS_URL`, `JWT_SECRET`, `APP_NAME`, `SMTP_USER/SMTP_PASS`, `TELEGRAM_BOT_TOKEN`.
  - Data/infra: Supabase client (`database/supabaseClient.ts`), Redis client with in-memory fallback when `REDIS_URL` is missing (`database/redisClient.ts`).
  - Feature examples:
    - Super-Admin OTP login flow under `src/super-admin/` with Joi schemas, controller, service, and router mounted at `/super-admin`.
    - Company Bookmarks & Categories feature under `src/company/` with Joi schemas, controllers, and services mounted at `/company` (secured by app secret).
  - Health/diagnostics: `GET /healthz`; `GET /test-database` performs a minimal Supabase query and reports reachability.
- Frontend
  - Router: `app/` folder (expo-router) with grouped layouts. Root providers in `app/_layout.tsx`: ThemeMode, React Query, SafeArea, Toast.
    - `(auth)` group: unauthenticated screens (e.g., `super-admin/login`, `super-admin/otp-verify`). The group layout redirects to dashboard if a token exists.
    - `(app)` group: authenticated screens (e.g., `super-admin/dashboard`, `company/bookmarks`, `company/categories`). The group layout redirects to login if no token.
  - Theming: `src/theme/` with `ThemeModeProvider` and `getTheme`; `TopAppBar` exposes a mode switcher.
  - Utilities: `src/utils/logger.ts` (dev log collector + global error handlers), `src/utils/network.ts` (`fetchJson` wrapper with logging), `src/utils/ToastProvider.tsx` (Snackbar-based toasts with type icons).

## Routing at a glance

```
app/
  _layout.tsx
  (auth)/
    _layout.tsx
    super-admin/
      login.tsx
      otp-verify.tsx
  (app)/
    _layout.tsx
    super-admin/
      dashboard.tsx
    company/
      dashboard.tsx
      bookmarks.tsx
      categories.tsx
```

- Group names in parentheses are not part of the URL.
- Guards live in each group's `_layout.tsx` and redirect based on `authToken` in AsyncStorage.
- Add new public pages under `(auth)` and protected pages under `(app)` to inherit the correct guard automatically.

## Dev workflows

- Root scripts (npm workspaces):
  - Start both apps: `npm run dev` (runs backend dev and frontend start concurrently).
  - Lint all: `npm run lint` — Typecheck all: `npm run typecheck` — Test all: `npm test`.
- Backend: `npm run dev` (ts-node + nodemon), `npm run build` (tsc), `npm start` (node dist/server.js).
- Frontend: `npm start` (Expo dev server). Web only: `npm run start:web` (port 19006). Variants: `npm run start:super-admin` or `npm run start:company`.
- Environment
  - Frontend API base URL is read from Expo extra: see `frontend/app.config.js` and `frontend/config/index.ts` (expects `API_BASE_URL`). For device testing, use your LAN IP (e.g., http://192.168.x.x:4000) and clear cache (`expo start --clear`).
  - Note: `src/services/auth.ts` also supports `EXPO_PUBLIC_API_BASE`. Prefer `config/API_BASE_URL` for new code and keep both until unified.

## Backend conventions

- Route mounting: add feature routers in `src/routes/index.ts` only. Keep `errorHandler` last and middleware ordered as in `app.ts`.
- Validation: use Joi schemas + `middleware/validate.ts` to sanitize `req.body` and return 400 with `errors`.
- Auth: JWT via `utils/generateJwt.ts`; secret defaults to `dev-secret` when not set in non-prod.
- Rate limiting: global `apiRateLimiter` in `app.ts`. Adjust in `middleware/rateLimit.ts` if adding bursty endpoints.
- Redis usage: `database/redisClient.ts` provides an in-memory shim with TTL for local dev when Redis is not configured; don't assume `.connect()` exists.
- Logging: use `utils/logger.ts` for server logs; request IDs set by `middleware/requestId.ts`. Avoid `console.*` in handlers.

## Super-Admin OTP flow (reference pattern)

- POST `/super-admin/login` — validate creds, generate OTP, send via email/Telegram (dev logs OTP), `redis.set(otp:email, OTP, EX=20m)` + cooldown key, returns message.
- POST `/super-admin/verify-otp` — validate OTP, issue JWT with role=SUPER_ADMIN.
- POST `/super-admin/resend-otp` — server enforces a cooldown (30s by default). Frontend UI currently uses a 60s resend timer.
- GET `/super-admin/dashboard` — protected by `middleware/authenticate.ts` (Bearer token).
- Example files: controller `super-admin/controllers/superAdmin.controller.ts`, service `super-admin/services/superAdmin.service.ts`, schemas `super-admin/schemas.ts`, router `super-admin/routes.ts`.

## Company Bookmarks & Categories flow (reference pattern)

- Sub-routes under `/company` are protected by `appSecretGuard` middleware.
- POST `/company/bookmarks` — creates a new bookmark, fetches URL meta details (title, description, image) via urlMeta utility, and returns the metadata.
- POST `/company/bookmarks/:id/refresh-meta` — refetches and updates metadata for an existing bookmark.
- GET `/company/categories` and GET `/company/bookmarks` — lists categories and bookmarks.

## Frontend conventions

- Use `frontend/config/index.ts` for configuration; call `assertApiBaseUrl()` in entry points if needed.
- Network calls: prefer `src/utils/network.ts` + `fetchJson(url, init)` which returns `{ ok, status, data, raw, headers }` and auto-logs.
- Toasts: `useToast()` from `src/utils/toast` within `ToastProvider`. Prefer typed helpers: `showSuccess`, `showError`, `showWarning`, `showInfo`.
- Theme: Wrap screens in providers from `app/_layout.tsx`. Use `useThemeMode()` for light/dark/system toggle.
- Auth flow example: `app/(auth)/super-admin/login.tsx` (stores email in AsyncStorage) → `app/(auth)/super-admin/otp-verify.tsx` (verifies & stores `authToken`) → `app/(app)/super-admin/dashboard.tsx` (Authorization: Bearer). Group layouts enforce redirects based on token presence.

## Adding new features (apply these patterns)

- Backend feature
  1. Create `src/<feature>/schemas.ts`, `services/`, `controllers/`, `routes.ts` with Joi validation and minimal controller logic.
  2. Mount router in `src/routes/index.ts` under a clear base path.
  3. Use Supabase via `database/supabaseClient.ts`; handle permission/table errors by returning informative messages (see `testConnection.ts`).
- Frontend feature
  1. Add screens under `app/<feature>/` with expo-router. Use `fetchJson` and `useToast` for UX feedback.
  2. Keep API base from `config/index.ts`. Persist small auth/session bits in AsyncStorage if needed.

## Integration & troubleshooting tips

- CORS/device: On devices, point `API_BASE_URL` to LAN IP; web shows clearer CORS errors. Login screen already hints this in error copy.
- Missing Redis: backend falls back to in-memory store; OTP works but is ephemeral and single-process only.
- Health checks: `GET /healthz`; Supabase reachability via `GET /test-database`.

## Local run helper script (PowerShell)

```powershell
# Start backend (nodemon) in a new window
Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "run","dev","--workspace","backend"

# Start frontend (Expo) in a new window
Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "start","--workspace","frontend"
```
