# Workspace Bookmarks & Categories

This document outlines the bookmarks storage, categorization features, and background URL scraping capabilities.

---

## 1. Categorization Layout

- **Unified Collections**: Bookmarks are organized into user-defined categories.
- **Form Validation & Display**: Follows the registry layout pattern: lists are grouped inside clean outlined containers with thin row dividers, status values are displayed with active/disabled badges, and add/edit modals use top-aligned positioning with a portal-based load overlay.

---

## 2. URL Metadata Web Scraper

- **Automatic Extraction**: When a user adds a new bookmark URL, the system invokes a backend metadata scraper.
- **Scraped Properties**: The scraper fetches and returns key properties of the target website:
  - Page Title (HTML `<title>` or OpenGraph title tags)
  - Page Description (meta descriptions or OpenGraph description tags)
  - Cover Image Preview (OpenGraph image tags or favicons)
- **Metadata Refresh**: Users can manually refresh website metadata for existing bookmark entries. The backend fetches the URL again and updates the Supabase record.
