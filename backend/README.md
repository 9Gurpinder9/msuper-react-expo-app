# Backend (Node/Express + TypeScript)

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm start`

Endpoints
- `GET /healthz` liveness
- `GET /readyz` readiness
- `POST /super-admin/login`, `POST /super-admin/verify-otp`, `POST /super-admin/resend-otp`, `GET /super-admin/dashboard`

Notes
- Env validated in `src/config` (see `.env.example`)
- Logging: Winston + `morgan` + request id
- Rate limiting enabled globally

