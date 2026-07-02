# Company Module

## Overview

The Company module provides a dedicated workspace for registered company users within the application. It offers a full authentication system, bookmark management, category organization, and a customizable dashboard.

---

## Authentication

Company authentication is a multi-step flow ensuring secure access:

### Login
- Email and password form with optional captcha verification
- "Remember Me" option persists the session across browser/device restarts
- Successful login triggers an OTP sent to the registered email

### OTP Verification
- 6-digit one-time passcode entry with a 3-minute expiry timer
- Progress bar showing remaining time
- Resend button with a cooldown period to prevent abuse
- On successful verification, a session token is stored and the user is redirected to the dashboard

### Password Reset Flow
- **Forgot Password** — enter email to request a password reset OTP
- **Reset OTP** — verify the 6-digit reset OTP to acquire a reset token
- **Reset Password** — set a new password with strength validation (minimum length, uppercase, lowercase, number, symbol requirements)

---

## Dashboard

The main landing page after authentication features:

- **Welcome heading** with personalized greeting
- **Widget grid** — navigation cards for bookmarks and categories, each with:
  - Hover effects with elevation lift and smooth transitions
  - Left-edge accent stripe on hover
  - Chevron icon indicating clickability
- **Sidebar drawer** — slide-out navigation with:
  - Section headers for grouped navigation links
  - Active route highlighting
  - Logout button
  - Theme mode toggle (light / dark / system)
  - Version display at the bottom

---

## Bookmarks

A full bookmark management system:

### List View
- Toggle between **card grid** and **table** layouts
- Card grid adapts columns by screen width (desktop: 5, tablet: 4, mobile: 1) with equal spacing between cards and rows
- **Search** bar to filter bookmarks by title, URL, description, or category name
- **Filter chips** to narrow by: All, Favorites, Recent, specific tags

### Per-Card Features
- **Thumbnail** with a subtle dim overlay to make text content stand out
- **Category badge** displayed inline next to the title
- **Clickable URL** styled as a link (underline, accent color)
- **Tag chips** displayed compactly below the URL
- **Three-dot action menu** with:
  - Add to / Remove from Favorites (star icon)
  - Open Link
  - Copy URL
  - Edit bookmark
- **Card hover effects** — smooth shadow elevation increase, subtle scale-up, no border color change
- **Table view** — rows with title, URL, thumbnail, category badge, and action menu

### Add Bookmark
- URL input that auto-derives a title from the domain
- Required category selector (modal with search)
- Title, description, and tags (comma-separated) fields
- Optional favorite toggle
- Centralized save progress overlay

### Edit Bookmark
- Pre-filled form with all existing fields
- Same category selector, tag, and field options as the add form
- Centralized update progress overlay

---

## Categories

Simple category management to organize bookmarks:

### List View
- List or table layout with search
- Each row shows category name and an edit button

### Add Category
- Single field form for the category name
- Duplicate name validation handled on submission
- Save with centralized progress overlay

### Edit Category
- Pre-filled name field
- Save to update with centralized overlay

---

## Shared UI Patterns

- **Top navigation bar** — consistent header across all screens with optional back button, menu toggle, title, and action icons
- **Authentication guard** — unauthenticated users are redirected to the login screen automatically when accessing any protected page
- **Toast notifications** — success, error, warning, and info messages for all user actions
- **Save progress overlay** — full-screen semi-transparent overlay with loading spinner during all create/update operations

---

## Security

- **Token-based authentication** — JWT bearer token stored on the device after OTP verification
- **Role enforcement** — all protected screens and API calls require a valid COMPANY role token
- **Rate limiting** — applied globally to prevent abuse of authentication and data endpoints
- **Session persistence** — "Remember Me" extends token validity; otherwise session expires on browser/device close

---

## Testing

- **Web E2E tests** — Playwright-based tests that run against the live web interface to create bookmarks and categories through the actual UI
- **Mobile E2E tests** — Maestro-based YAML tests for category creation flows on physical Android/iOS devices
- **Persistent session** — tests reuse an authenticated session to bypass login/OTP on every run

---

## Future Module Note

All new company screens (beyond bookmarks and categories) follow the same UI patterns established here: the super-admin module screens serve as the design reference for layout, styling, form validation, dialog positioning, and interaction patterns. Any new company feature screen should mirror the corresponding super-admin screen exactly.
