# Monorepo Architecture Overview

This document provides a guide to the structure, layout rules, and technologies powering the application monorepo.

---

## 1. Technologies & Project Stack

- **Monorepo structure**: Driven by npm workspaces.
  - **Frontend**: Universal Expo React Native app (`frontend/`).
  - **Backend**: TypeScript-based Express v5 web server (`backend/`).
- **Data & Caching Layer**:
  - **Supabase**: Remote PostgreSQL database service.
  - **Redis**: Fast, in-memory caching system used for temporary keys like login verification OTP codes (with local fallback to memory shim when Redis host is omitted).

---

## 2. Ports Configuration

For consistency across testing environments, the following local ports are fixed and must never be altered:
- **Frontend App (Web Mode)**: `http://localhost:8081`
- **Backend API**: `http://localhost:4000`

---

## 3. Directory Layout (Expo Router)

The React Native application leverages Expo Router file-based layout structure:
- **`app/`**: Base directory.
  - **`_layout.tsx`**: Mounts the top-level contexts (ThemeModeProvider, React Query Client, ToastProvider).
  - **`(auth)/`**: Route group containing unauthenticated screens. Guard layouts automatically redirect users to active workspaces if credentials/tokens are already saved in AsyncStorage.
  - **`(app)/`**: Route group containing authenticated screens. Guard layouts redirect users to login forms if credentials/tokens are missing.

---

## 4. Operational Best Practices

- **Targeted Typechecking**: When modifications are made to TypeScript files, run compilation checks targeting those paths to verify syntax and API interfaces.
- **Maestro E2E Testing**: Physical device and web-mode visual checks are automated via Playwright/Maestro scripts under `frontend/e2e/`.
