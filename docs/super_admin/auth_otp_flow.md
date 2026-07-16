# Super Admin OTP Authentication Flow

This document details the authentication design, step-by-step logic, and session security implementation for Super Admin users.

---

## 1. Credentials Verification Step

1. **User Request**: The user enters their email credentials on the login form.
2. **Joi Validation**: The backend validates the payload shape using Joi request validation middleware.
3. **DB Verification**: The server queries the Supabase database to check if the user exists and holds the `SUPER_ADMIN` role level.
4. **OTP Code Generation**: If verification passes, the server generates a cryptographically random, numeric One-Time Password (OTP) (typically 6 digits).

---

## 2. Dispatching & Temp Caching

1. **Temp Storage**: The server saves the OTP code to a Redis server with a 20-minute Time-To-Live (TTL) using the key template: `otp:email`. (If Redis is offline, it falls back to an in-memory TTL shim).
2. **OTP Dispatch**: The server delivers the OTP using the Bot API (Telegram chat notification) or SMTP Mail services depending on user preferences and configuration.
3. **Resend Cooldown**: A cooldown block is initialized (defaulting to 30 seconds enforced on the server, with the UI locking the request button for 60 seconds) to prevent script-based API spam.

---

## 3. Verification & JWT Issuance

1. **OTP Matching**: The user inputs the OTP code on the verification screen, which submits a request to the validation endpoint.
2. **Token Issuance**: The server verifies that the code matches the value cached in Redis. Once validated, the server signs a JSON Web Token (JWT) loaded with the user's ID, email, and security role.
3. **Session Storage**: The frontend saves the JWT token into local storage, enabling the user to bypass authentication forms on future application launches.
