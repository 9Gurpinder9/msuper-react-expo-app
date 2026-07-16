# Super Admin Dashboard & Administrative Registries

This document outlines the standard interface conventions, layout specifications, and administrative registries implemented for the Super Admin panel.

---

## 1. Dashboard Layout

The Super Admin Dashboard serves as the central control console. It features:
- **Welcome Header**: Formatted with high-contrast, premium typography styling (`fontSize: 18`, `fontWeight: 800`).
- **Data Section Headers**: Features uppercase titles with adjacent, semi-transparent pill badges displaying the live database record count.
- **Outlined Widget Cards**: Custom cards displaying feature statistics. They include interactive chevron indicators on the trailing edge, and hover states that highlight borders using primary theme colors.

---

## 2. Administrative Registries (The Canonical Pattern)

All registries (e.g. Countries, States, Cities) must align 100% with the standard layout defined in `countries.tsx`:

### Search & Layout Toggles
- Search triggers and grid/table list view toggles belong inside the global `TopAppBar` action slots.
- The search bar renders conditionally below the main header, styling matching the standard `styles.searchbar`.
- A subheader displays the count text: `"Total records: X"`.

### List & Table Views
- **List Mode**: Items render inside a singular outer card styling (`listCard`) featuring rounded corners (`borderRadius: 12`), borders, and subtle elevation. Each row is separated by a divider line (`borderBottomWidth: 1`), omitting the divider line on the last element in the list.
- **Table Mode Status Badge**: Displayed as a static text badge with theme-adaptive colors (Primary green for `ACTIVE`, Error red for `DISABLED`).

### Add & Edit Forms
- Dialog modals use absolute positioning anchoring them to the top of the viewport (`position: absolute`, `top: 40`, `left: 0`, `right: 0`).
- Form field labels display mandatory fields using a red asterisk: `<Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>`.
- Input fields use error-aware outlines to highlight validation errors.
- Save buttons disable their press trigger during saving actions (`disabled={saving}`) and a central progress modal overlay (`<AppLoader message="..." ... />`) renders at the root level of the screen within a React Native Paper Portal.
