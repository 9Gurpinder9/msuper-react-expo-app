# Permission Management Design for SaaS App

This document outlines the **permission management** approach for our multi-tenant SaaS accounting application, covering database schema, triggers, caching strategies, token versioning, and client integration. All examples assume a PostgreSQL (Supabase) backend and Redis for caching.

---

## 1. Overview

- **Tenants**: Each customer is a "company" (tenant).
- **Users**: Company main admins and sub-users; super-admins are managed separately.
- **Menus**: Flat list of features (e.g., `invoice`, `customer`).
- **Actions**: Fixed set: `view`, `add`, `edit`, `delete`, `report`, `print`.
- **Permissions**: Combination `(menu, action)` granted at company level, then refined at user level.
- **Audit**: Immutable log of grants/revokes.
- **Versioning**: `perm_version` counter on each user triggers authentication invalidation when permissions change.
- **Caching**: Redis stores per-user permission maps and version for O(1) checks.

---

---

## 2. Extensions & Enums

```sql
-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Define user role enumeration
CREATE TYPE user_role_enum AS ENUM ('admin', 'sub_user');
```

---

## 3. Lookup Tables: States & Cities

```sql
-- States lookup table
CREATE TABLE states (
  id         BIGSERIAL       PRIMARY KEY,
  uuid       UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name       TEXT            NOT NULL UNIQUE,
  code       TEXT,
  created_at TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Cities lookup table
CREATE TABLE cities (
  id         BIGSERIAL       PRIMARY KEY,
  uuid       UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  state_id   BIGINT          NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name       TEXT            NOT NULL,
  created_at TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE(state_id, name)
);
```

---

## 4. Companies (Tenants)

`````sql
CREATE TABLE companies (
  id                   BIGSERIAL       PRIMARY KEY,
  customer_id          BIGINT          UNIQUE GENERATED ALWAYS AS IDENTITY (START WITH 1001),
  uuid                 UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  owner_name           TEXT            NOT NULL,
  name                 TEXT            NOT NULL,
  email                TEXT            NOT NULL UNIQUE,
  mobile1              TEXT            NOT NULL,
  mobile2              TEXT,
  state_id             BIGINT          NOT NULL REFERENCES states(id),
  state_name           TEXT            NOT NULL,
  city_id              BIGINT          NOT NULL REFERENCES cities(id),
  city_name            TEXT            NOT NULL,
  gst_no               TEXT,
  address1             TEXT,
  address2             TEXT,
  print_name           TEXT,
  validity_date        DATE            NOT NULL,
  expiry_date          DATE            NOT NULL,
  main_admin_user_id   BIGINT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);

````sql
CREATE TABLE companies (
  id                   BIGSERIAL       PRIMARY KEY,
  customer_id          BIGINT          UNIQUE GENERATED ALWAYS AS IDENTITY (START WITH 1001),
  company_id           BIGINT          UNIQUE GENERATED ALWAYS AS IDENTITY (START WITH 1),
  uuid                 UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  owner_name           TEXT            NOT NULL,
  name                 TEXT            NOT NULL,
  email                TEXT            NOT NULL UNIQUE,
  mobile1              TEXT            NOT NULL,
  mobile2              TEXT,
  state_id             BIGINT          NOT NULL REFERENCES states(id),
  state_name           TEXT            NOT NULL,
  city_id              BIGINT          NOT NULL REFERENCES cities(id),
  city_name            TEXT            NOT NULL,
  gst_no               TEXT,
  address1             TEXT,
  address2             TEXT,
  print_name           TEXT,
  validity_date        DATE            NOT NULL,
  expiry_date          DATE            NOT NULL,
  main_admin_user_id   BIGINT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);


````sql
CREATE TABLE companies (
  customer_id        BIGINT       GENERATED ALWAYS AS IDENTITY (START WITH 1001) PRIMARY KEY,
  company_id         BIGINT       GENERATED ALWAYS AS IDENTITY (START WITH 1) UNIQUE NOT NULL,
  uuid               UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  owner_name         TEXT         NOT NULL,
  name               TEXT         NOT NULL,
  email              TEXT         NOT NULL UNIQUE,
  mobile1            TEXT         NOT NULL,
  mobile2            TEXT,
  state_id           UUID         NOT NULL REFERENCES states(uuid),
  state_name         TEXT         NOT NULL,
  city_id            UUID         NOT NULL REFERENCES cities(uuid),
  city_name          TEXT         NOT NULL,
  gst_no             TEXT,
  address1           TEXT,
  address2           TEXT,
  print_name         TEXT,
  validity_date      DATE         NOT NULL,
  expiry_date        DATE         NOT NULL,
  main_admin_user_id UUID         NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

````sql
CREATE TABLE companies (
  id                   BIGSERIAL       PRIMARY KEY,

  uuid                 UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  owner_name           TEXT            NOT NULL,
  name                 TEXT            NOT NULL,
  email                TEXT            NOT NULL UNIQUE,
  mobile1              TEXT            NOT NULL,
  mobile2              TEXT,
  state_id             BIGINT          NOT NULL REFERENCES states(id),
  state_name           TEXT            NOT NULL,
  city_id              BIGINT          NOT NULL REFERENCES cities(id),
  city_name            TEXT            NOT NULL,
  address1              TEXT,
  address2              TEXT,
  main_admin_user_id   BIGINT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  validity_date        DATE            NOT NULL,
  expiry_date          DATE            NOT NULL,
  created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);
`````

---

## 5. Users

```sql
CREATE TABLE users (
  id            BIGSERIAL       PRIMARY KEY,
  uuid          UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  company_id    BIGINT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email         TEXT            NOT NULL,
  name          TEXT,
  role          user_role_enum  NOT NULL DEFAULT 'sub_user',
  mobile        TEXT,
  state_id      BIGINT          REFERENCES states(id),
  state_name    TEXT,
  city_id       BIGINT          REFERENCES cities(id),
  city_name     TEXT,
  address       TEXT,
  perm_version  INTEGER         NOT NULL DEFAULT 0,
  is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Ensure exactly one admin per company
CREATE UNIQUE INDEX idx_one_admin_per_company
  ON users(company_id)
  WHERE role = 'admin';
```

---

## 6. Menus & Actions

```sql
CREATE TABLE menus (
  id         BIGSERIAL       PRIMARY KEY,
  uuid       UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name       TEXT            NOT NULL,
  description TEXT,
  sort_order INTEGER         DEFAULT 0,
  is_active  BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE TABLE actions (
  id         SMALLSERIAL     PRIMARY KEY,
  uuid       UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name       TEXT            NOT NULL UNIQUE
);
INSERT INTO actions(name) VALUES ('view'),('add'),('edit'),('delete'),('report'),('print');
```

---

## 7. Permission Grants

```sql
-- Company-level grants
CREATE TABLE company_menu_actions (
  id          BIGSERIAL       PRIMARY KEY,
  uuid        UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  company_id  BIGINT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  menu_id     BIGINT          NOT NULL REFERENCES menus(id)       ON DELETE CASCADE,
  action_id   SMALLINT        NOT NULL REFERENCES actions(id)     ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE(company_id, menu_id, action_id)
);

-- User-level grants
CREATE TABLE user_menu_actions (
  id          BIGSERIAL       PRIMARY KEY,
  uuid        UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id     BIGINT          NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  menu_id     BIGINT          NOT NULL REFERENCES menus(id)      ON DELETE CASCADE,
  action_id   SMALLINT        NOT NULL REFERENCES actions(id)    ON DELETE CASCADE,
  granted_by  BIGINT          NULL REFERENCES users(id)         ON DELETE SET NULL,
  granted_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE(user_id, menu_id, action_id)
);
```

---

## 8. Audit Log

```sql
CREATE TABLE permission_audit_log (
  id                BIGSERIAL      PRIMARY KEY,
  uuid              UUID           NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  timestamp         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  performed_by      BIGINT         NULL REFERENCES users(id)         ON DELETE SET NULL,
  target_company_id BIGINT         NULL REFERENCES companies(id)    ON DELETE SET NULL,
  target_user_id    BIGINT         NULL REFERENCES users(id)        ON DELETE SET NULL,
  menu_id           BIGINT         NOT NULL REFERENCES menus(id)     ON DELETE SET NULL,
  action            TEXT           NOT NULL,
  details           JSONB
);
```

---

## 9. Triggers & Versioning

```sql
-- Bump perm_version on user_menu_actions changes
CREATE OR REPLACE FUNCTION bump_perm_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
    SET perm_version = perm_version + 1,
        updated_at   = now()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_uma_insert
  AFTER INSERT ON user_menu_actions
  FOR EACH ROW EXECUTE FUNCTION bump_perm_version();

CREATE TRIGGER trg_uma_delete
  AFTER DELETE ON user_menu_actions
  FOR EACH ROW EXECUTE FUNCTION bump_perm_version();

-- Audit user_menu_actions changes
CREATE OR REPLACE FUNCTION audit_uma_changes()
RETURNS TRIGGER AS $$
DECLARE act TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT 'GRANT_'||name INTO act FROM actions WHERE id = NEW.action_id;
    INSERT INTO permission_audit_log(
      performed_by, target_user_id, menu_id, action
    ) VALUES (
      NEW.granted_by, NEW.user_id, NEW.menu_id, act
    );
    RETURN NEW;
  ELSE
    SELECT 'REVOKE_'||name INTO act FROM actions WHERE id = OLD.action_id;
    INSERT INTO permission_audit_log(
      performed_by, target_user_id, menu_id, action
    ) VALUES (
      OLD.granted_by, OLD.user_id, OLD.menu_id, act
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_uma_insert
  AFTER INSERT ON user_menu_actions
  FOR EACH ROW EXECUTE FUNCTION audit_uma_changes();

CREATE TRIGGER trg_audit_uma_delete
  AFTER DELETE ON user_menu_actions
  FOR EACH ROW EXECUTE FUNCTION audit_uma_changes();

-- Sync companies.main_admin_user_id ↔ users.role
CREATE OR REPLACE FUNCTION sync_company_admin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET role='sub_user'
    WHERE company_id = NEW.id AND role='admin' AND id <> NEW.main_admin_user_id;
  UPDATE users SET role='admin'
    WHERE id = NEW.main_admin_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_main_admin
  AFTER INSERT OR UPDATE OF main_admin_user_id ON companies
  FOR EACH ROW EXECUTE FUNCTION sync_company_admin();

CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    UPDATE companies SET main_admin_user_id = NEW.id
      WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_role_change
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION sync_user_role();
```

## 10. Caching Strategy. Caching Strategy

- **Redis keys:**

  - `user:perms:{userId}` → JSON blob of `{ menu: [actions] }`
  - `user:perm_ver:{userId}` → integer version

- **On login/refresh:**

  1. Read from Redis; if missing, query DB and populate Redis.
  2. Return both JSON map and JWT (with `perm_version`).

- **On permission change:**

  1. Trigger updates `users.perm_version`.
  2. App-level hook regenerates permission map and sets both Redis keys.

---

## 11. API & Client Integration

1. **Auth middleware**:

   ```js
   const token = verifyJWT();
   const redisVer = await redis.get(`user:perm_ver:${token.sub}`);
   if (redisVer !== token.perm_version) throw new AuthError("PERMS_STALE");
   req.permMap = await redis.get(`user:perms:${token.sub}`);
   ```

2. **Client**:

   - Store `permMap` in memory (e.g., React state).
   - Render top-level menus: `Object.keys(permMap)`.
   - Render action buttons: `permMap[menu].includes(action)`.
   - On `PERMS_STALE`, call `/refresh-perms`, update state, retry as needed.

---

## 12. Real‑Time Considerations

- **Optional**: subscribe to Supabase Realtime on `user_menu_actions` & `company_menu_actions` for immediate UI updates without waiting for an API call to detect version mismatch.
- The Redis/JWT approach alone is sufficient for <1s sync on next API call; real‑time is a UX enhancement.
