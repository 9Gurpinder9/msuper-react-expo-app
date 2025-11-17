# Required Versions (Frontend)

Pin these versions to avoid multi-React conflicts and unstable upgrades.

- Expo SDK: `expo ~53.0.20`
- React: `18.2.0`
- React DOM: `18.2.0`
- React Native: `^0.79.6` (Expo SDK 53 compatible)
- react-native-web: `^0.20.0`
- expo-router: `~5.1.0`
- react-native-reanimated: `~3.17.4`
- @tanstack/react-query: latest minor `^5.x` (currently `^5.59.6`)
- Typescript: `~5.8.3`
- @types/react / @types/react-dom: `^18.x`

Guidelines:

1. Do NOT install React 19 yet; Expo SDK 53 + RN Web 0.20 expect React 18 runtime.
2. After upgrading Expo SDK, revalidate React peer requirements before bumping React.
3. Avoid adding overrides that pull React 19 packages (e.g., `react-server-dom-webpack`).
4. If duplicate React warning appears, ensure only one physical `react` folder exists across hoisted workspaces.
5. Metro config forces React resolution to `frontend/node_modules` to prevent mismatches.

Update Procedure:

1. Remove all `node_modules` (root + workspace) and lock files.
2. Confirm `frontend/package.json` pins versions above.
3. Run `npm install` at repo root.
4. Start web with `expo start --web -c`.
5. If warning persists, inspect `node_modules/react` version and ensure no stray React 19 dependencies.
