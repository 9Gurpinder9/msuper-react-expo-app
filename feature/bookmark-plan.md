# Bookmark Feature Plan (Company Dashboard)

## Status
Approved: Use shared app secret header for API access (basic protection).

## Goal
Build a professional, single-screen bookmark manager inside the Company Dashboard. Provide card/list views, manual refresh sync across devices, modern UI/UX with animations, and local device lock. Use existing Expo + Express + Supabase stack. Later, move feature behind company login.

## Scope
- Frontend: Expo React Native (Android + Web). Desktop is web now; package later.
- Backend: Existing Express API with Supabase.
- Sync: Manual refresh only (button + pull-to-refresh). No auto polling.
- Auth: No login/signup now. Local device lock only.

## Confirmed Decisions
- API security: Shared app secret header (simple guard, not strong security).
- Desktop: Use Expo Web now; package with Tauri/Electron later.
- Manual refresh only.

## Open Decisions (for later)
- Thumbnail source: backend metadata fetch vs third-party API.
- Company login migration details (when implemented).

## UX Summary (Single Screen)
- Left sidebar menu for navigation and filters.
- Main content area shows bookmarks, default card layout.
- Top toolbar: search, view toggle (card/list/compact), refresh button, add button.
- Bookmark actions: Open, Copy, Edit, Delete, Favorite, Category/Tag edit.
- Theme: system default with manual light/dark switch.
- Smooth micro-interactions: hover/press animations, list entrance.

## Sidebar Menu (Company Dashboard)
- Dashboard (All)
- Favorites
- Categories
- Tags
- Recently Added
- Trash (soft delete)
- Settings (theme, lock, refresh, data info)

## Data Model (Final)
Table: `bookmark_categories`
- id (uuid, primary key)
- name (text, unique, required)
- created_at (timestamptz, default now)
- updated_at (timestamptz, default now)

Table: `bookmarks`
- id (uuid, primary key)
- title (text, required)
- url (text, required)
- description (text, optional)
- category_id (uuid, optional, references bookmark_categories.id)
- tags (jsonb array, default [])
- is_favorite (boolean, default false)
- thumbnail_url (text, optional)
- favicon_url (text, optional)
- og_title (text, optional)
- og_description (text, optional)
- og_image (text, optional)
- created_at (timestamptz, default now)
- updated_at (timestamptz, default now)
- deleted_at (timestamptz, nullable)

### SQL (Supabase)
```sql
create table if not exists public.bookmark_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bookmark_categories_name_unique
  on public.bookmark_categories (name);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  description text,
  category_id uuid references public.bookmark_categories (id),
  tags jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  thumbnail_url text,
  favicon_url text,
  og_title text,
  og_description text,
  og_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists bookmarks_url_unique
  on public.bookmarks (url)
  where deleted_at is null;

create index if not exists bookmarks_created_at_idx on public.bookmarks (created_at desc);
create index if not exists bookmarks_favorite_idx on public.bookmarks (is_favorite);
create index if not exists bookmarks_category_idx on public.bookmarks (category_id);
create index if not exists bookmarks_deleted_at_idx on public.bookmarks (deleted_at);
create index if not exists bookmarks_tags_gin_idx on public.bookmarks using gin (tags);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bookmarks_updated_at on public.bookmarks;
create trigger trg_bookmarks_updated_at
before update on public.bookmarks
for each row
execute function public.set_updated_at();
```

## API Endpoints (Draft)
- GET `/company/bookmarks` (filters + pagination)
- POST `/company/bookmarks`
- PUT `/company/bookmarks/:id`
- DELETE `/company/bookmarks/:id`
- POST `/company/bookmarks/:id/refresh-meta`

## API Security (Shared Secret Header)
- Client sends `x-app-secret: <APP_SECRET>` on every request.
- Backend validates against env var (e.g. `APP_SECRET`).
- Limitation: secret can be extracted from client; acceptable for now.

## Frontend Architecture
- Route group: `app/(app)/company/`
- Feature folder: `frontend/src/features/bookmarks/`
- Components:
  - `BookmarkCard`, `BookmarkListItem`, `BookmarkGrid`
  - `BookmarkEditorModal`
  - `BookmarkToolbar` (search + view toggle + refresh)
  - `BookmarkFilters` (favorites, categories, tags)
- State:
  - React Query with manual `refetch`.
  - AsyncStorage for layout and lock preferences.

## Local Lock
- Mobile: biometric with PIN fallback.
- Web/Desktop: PIN only.
- Lock state stored only locally (AsyncStorage / SecureStore).

## Visual Direction (UI)
- Editorial + modern utility.
- Distinct typography: display font for headings, clean body font.
- Cards with subtle gradient + shadow; list view with crisp separators.
- Animated transitions on add/edit and view toggle.
- Light/dark mode with strong contrast, not generic purple-on-white.

## Implementation Milestones
1. Create feature folder and route skeleton in company dashboard.
2. Define Supabase schema + backend CRUD routes.
3. Build sidebar + toolbar + view toggle UI.
4. Hook CRUD actions and manual refresh.
5. Add thumbnail/meta pipeline.
6. Add local lock and settings UI.
7. UX polish and animation pass.

## Migration Plan (Later)
- Move company dashboard routes behind company login.
- Add auth guard in route group.
- Replace app secret with user token (if required).

## Possible Enhancements
- Import/export bookmarks (CSV/JSON).
- Bulk actions (multi-select).
- Pinned bookmarks.
- Offline mode with queued changes (still manual refresh).
- Share sheet quick-add (mobile).

---
Owner: Company Dashboard
Status: Approved Draft
