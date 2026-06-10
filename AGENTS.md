# Copilot instructions for msuper-react-expo-app

These instructions help AI agents work productively in this monorepo (frontend: Expo React Native, backend: Express + Supabase). Keep answers concrete and aligned to the codebase patterns below.

## Autonomy preference & planning flow

- **Mandatory Planning Rule:** Every time the user requests a new feature, design improvement, or code implementation, you **MUST first provide a clear summary/implementation plan** outlining the proposed changes.
- **Obtain Approval:** Do NOT start coding or making file edits for features until the user reviews the plan and explicitly confirms/approves to proceed.
- **No Auto-Commits:** Do NOT commit or push any changes to GitHub by default. Only perform a commit and push when the user explicitly/manually requests you to "commit and push to github".
- **Environment Autonomy:** For minor diagnostic commands or non-destructive terminal tasks, run them without manual confirmation if allowed by the sandbox. Ask only if blocked or destructive.
- **Mandatory Post-Edit Typecheck:** After completing any set of file edits that touch `.ts` or `.tsx` files, you **MUST** run a TypeScript typecheck before considering the task done. Use the following command scoped to the relevant workspace:
  - **Frontend** (Expo/React Native): `npx tsc --noEmit --skipLibCheck` run from the `frontend/` directory.
  - **Backend** (Express/TypeScript): `npm run build` or `npx tsc --noEmit` run from the `backend/` directory.
  - Fix **all** reported type errors in the edited files before finishing. Do not leave the task in a broken typecheck state.


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
- Frontend: `npm start` (Expo dev server). Web only: `npm run start:web` (port 8081). Variants: `npm run start:super-admin` or `npm run start:company`.
- **Fixed ports (always use these)**: Frontend web at `http://localhost:8081`, Backend API at `http://localhost:4000`. Do NOT attempt to start servers on alternative ports.
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

## Administrative Registry UI Pattern (Single Source of Truth: `countries.tsx`)

Every list/add/edit administrative registry module (e.g., Countries, States, Cities, etc.) MUST align 100% with the layout defined in [countries.tsx](file:///f:/AI_WORK/React-App/msuper-react-expo-app/frontend/app/(app)/super-admin/countries.tsx):

1. **Header & Search Bar**:
   - Toggles for search and list/table layout modes belong inside `TopAppBar` header actions.
   - Search bar renders conditionally underneath the header with style `styles.searchbar`.
   - Subheader text shows plain record count: `"Total records: X"`.

2. **List View Card**:
   - Render lists inside a single outer card (`listCard`) with `borderRadius: 12`, border, and shadow.
   - Separate list items with a bottom divider line (`borderBottomWidth: 1`), removing the bottom line from the last item.

3. **Table View Status Column**:
   - Do NOT add interactive status switches in the table cells. Display a simple status text badge styled as: `{color: item.is_active ? theme.colors.primary : theme.colors.error}` showing `ACTIVE` or `DISABLED`.

4. **Add/Edit Dialog positioning**:
   - Set dialog positioning to top-anchored top-to-bottom layout: `position: 'absolute', top: 40, left: 0, right: 0, margin: 16`.
   - Dialog titles must be centered.

5. **Fields & Validation**:
   - Format required labels with a red bold asterisk prefix: `<Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>`.
   - Outlines must reflect error status color with standard fallback colors: `outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}`.
   - Placeholders must have `'80'` opacity added to text color.
   - Dialog Actions must stack layout vertically with Save button (`minWidth: 140`, secondary burnt orange theme color) centered, and Close button aligned to the bottom right.

6. **Centralized Save Overlay**:
   - Save/Update buttons inside dialog modals must NOT show local loading spinner indicators (`loading={saving}`). Instead, keep them `disabled={saving}` to prevent multiple updates.
   - Integrate a centralized full-screen save progress overlay: wrap `<AppLoader message="..." icon="database-sync-outline" transparent />` inside a React Native Paper `<Portal>` rendering a theme-adaptive, semi-transparent backdrop color (`rgba(0,0,0,0.65)` in dark mode and `rgba(255,255,255,0.75)` in light mode) at the root level of the screen container wrapper view.


## Company Module UI Pattern (Mirror Super Admin Layout)

Every company module screen (auth, dashboard, sidebar drawer, list/add/edit pages) MUST visually match the corresponding super admin screen exactly. The following reference files define the canonical layout:

### 1. Company Auth Screens (`(auth)/company/login.tsx`, `otp-verify.tsx`)
Reference: [`(auth)/super-admin/login.tsx`](file:///f:/AI_WORK/React-App/msuper-react-expo-app/frontend/app/(auth)/super-admin/login.tsx), [`(auth)/super-admin/otp-verify.tsx`](file:///f:/AI_WORK/React-App/msuper-react-expo-app/frontend/app/(auth)/super-admin/otp-verify.tsx)

- Gradient background using slate colors, centered-brand logo + title + subtitle
- Form card: `borderRadius: 24`, border, shadow, `backgroundColor: theme.colors.surface`
- Field labels with red bold asterisk prefix: `<Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>`
- Input outline colors must be error-aware: `outlineColor={err ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}`
- Error display uses `<Text variant="bodySmall" style={styles.errorText}>` with red color, NOT `<HelperText>`
- Auth button: `buttonColor={theme.colors.secondary}`, `textColor={theme.colors.onSecondary}`, `minWidth: 140`, `borderRadius: 12`, `alignSelf: 'center'`
- Remember Me checkbox (where applicable): `Switch` + label inside a row, stored to AsyncStorage for OTP verify to read

### 2. Company Sidebar Drawer
Reference: [`SidebarDrawer.tsx`](file:///f:/AI_WORK/React-App/msuper-react-expo-app/frontend/src/super-admin/components/SidebarDrawer.tsx)

- Drawer header: `shield-account` icon (size 22) + `"Company Workspace"` title (`fontWeight: '700'`) + close `IconButton`
- Scrollable content with uppercase section headers (`NAVIGATION`, etc.) styled as: `fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.colors.onSurfaceVariant`
- Navigation buttons use `renderDrawerButton` pattern with per-item `getIconColor` map and active-route highlighting (`backgroundColor: theme.colors.primaryContainer` when active)
- Footer row (`footerRow`): Logout button (`mode="text"`, `theme.colors.error`) on the left, theme mode toggles (pill-shaped `themeRow` with 3 IconButtons) on the right
- Version text centered at bottom

### 3. Company Dashboard Widgets
Reference: [`(app)/super-admin/dashboard.tsx`](file:///f:/AI_WORK/React-App/msuper-react-expo-app/frontend/app/(app)/super-admin/dashboard.tsx)

- Welcome heading styled as `fontSize: 18, fontWeight: '800', letterSpacing: -0.3`
- Section headers: uppercase title + pill badge with record count
- Widget cards: `mode="outlined"`, `borderRadius: 14`, `borderColor: theme.colors.outlineVariant`, hover state changes border to `theme.colors.primary`
- Hover indicator: 4px-wide colored stripe at left edge (`position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.colors.primary`)
- Chevron-right icon at card trailing edge
- Grid layout: `flexDirection: 'row', flexWrap: 'wrap', gap: 12`, each item `width: '100%', maxWidth: 360`

### 4. Company List/Add/Edit Pages (all future company modules)
These MUST follow the **Administrative Registry UI Pattern** above (same Single Source of Truth: `countries.tsx`) with company-specific API endpoints and labels. The table view status column, dialog positioning, field validation styling, and centralized save overlay rules apply identically.

### 5. Enforcement
When building NEW company screens or refactoring existing ones, always:
1. Read the corresponding super admin reference file listed above first
2. Mirror the JSX structure, style keys, color references, and interaction patterns exactly
3. Use the same `getIconColor` / `renderDrawerButton` / `renderCategorySection` helper patterns
4. Never introduce a new UI pattern that differs from the super admin equivalent

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

## E2E Testing & Visual Reporting

We use Maestro CLI to run E2E test suites directly on the physical connected Android/iOS device.

> [!IMPORTANT]
> **Permanent Live Test Instruction**: Every time you are asked to write or execute tests for any registry module, always write Maestro E2E test scripts (under `frontend/e2e/`) that interact with the actual screen files (e.g., clicking on the Add FAB, entering text in the inputs, tapping Save, checking view lists) to create real live entries. Do not rely solely on database/backend seed scripts. Test execution must run directly on the connected external device to verify the complete visual flow.

- **Modular Test File Rule (Web/Mobile)**: For every E2E test (including Playwright web mode tests), always create a **separate test file** dedicated exclusively to the feature/module being tested (e.g. `countries_web_test.py`, `states_web_test.py`). Never mix multiple domains/registries into a single test file. Name the file after the test you are performing.
- **Playwright Web Test Ports**: All Playwright web E2E tests target `http://localhost:8081` (frontend) and use `http://localhost:4000` (backend API). Before running a Playwright test, verify both servers are already running on these fixed ports — do NOT start alternative instances.
- **Persistent Session Rule (Web E2E)**: Always save and restore browser state using `auth.json` in web E2E tests to bypass entering credentials and OTP repeatedly once authenticated.
- **Self-Healing Data Rule (Duplicate Entry Check)**: Prior to inserting test data in automated tests, query/scan the visible lists to see if the record already exists (e.g. searching for the test country name). If the record exists, skip the Add step and directly test the Edit/Update step. This ensures tests remain repeatable without throwing duplicate key errors.
- **Test execution script**:
  You can execute tests and compile JUnit XML + interactive HTML reports in one go by running:
  ```powershell
  npm run test:e2e:report --workspace=frontend
  ```
- **Report formats & locations**:
  - JUnit XML file: `frontend/e2e/reports/company_categories_report.xml`
  - Interactive HTML Report: `frontend/e2e/reports/index.html` (open this directly in Chrome/Edge to visualize pass/fail results, logs, and failure details).

## Local run helper script (PowerShell)

```powershell
# Start backend (nodemon) in a new window
Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "run","dev","--workspace","backend"

# Start frontend (Expo) in a new window
Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "start","--workspace","frontend"
```

