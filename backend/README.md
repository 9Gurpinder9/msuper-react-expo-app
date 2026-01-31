# Backend (Node/Express + TypeScript)

Quick start
- Install deps: `cd backend && npm install`
- Dev (TS): `npm run dev`
- Build (TS->JS): `npm run build`
- Start (JS): `npm start`

Health checks
- Liveness: `curl -i http://localhost:4000/healthz`
- Readiness: `curl -i http://localhost:4000/readyz`

Super Admin API (examples)
- Login: `curl -i -X POST http://localhost:4000/super-admin/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"secret"}'`
- Verify OTP: `curl -i -X POST http://localhost:4000/super-admin/verify-otp -H "Content-Type: application/json" -d '{"email":"admin@example.com","otp":"123456"}'`
- Resend OTP: `curl -i -X POST http://localhost:4000/super-admin/resend-otp -H "Content-Type: application/json" -d '{"email":"admin@example.com"}'`
- Dashboard: `curl -i http://localhost:4000/super-admin/dashboard`

Endpoints
- `GET /healthz` liveness
- `GET /readyz` readiness
- `POST /super-admin/login`, `POST /super-admin/verify-otp`, `POST /super-admin/resend-otp`, `GET /super-admin/dashboard`

Notes
- Env validated in `src/config` (see `.env.example`)
- Logging: Winston + `morgan` + request id
- Rate limiting enabled globally
- Redis optional in local dev: leave `REDIS_URL` unset to skip connecting

hCaptcha (always-on for Super Admin login)
- Create a site in the hCaptcha dashboard and obtain keys.
- Set `HCAPTCHA_SECRET` in `backend/.env`.

