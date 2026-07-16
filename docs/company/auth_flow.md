# Company Authentication & Workspace Layout

This document describes the authentication interface rules and workspace drawer navigation implemented for the Company module.

---

## 1. Authentication Screens

The Company Authentication workspace mirrors the Super Admin login structure:
- **Gradient Backgrounds**: Rich slate gradient tones.
- **Form Cards**: Surface-colored cards with large rounded corners (`borderRadius: 24`), borders, and soft shadows.
- **Validation Outline Indicators**: Text inputs highlight missing or incorrect credentials using red border outlines, and errors display using standard red text labels rather than Paper's native HelperText.
- **Remember Me Switch**: Integrates a togglable Switch in the login layout that saves preferences locally to AsyncStorage.

---

## 2. Workspace Navigation Drawer

Once authenticated, users access the workspace dashboard and administrative tools using a slide-out drawer:
- **Drawer Header**: Contains the close action icon button and the workspace title (`fontWeight: 700`) paired with a `shield-account` icon.
- **Section Dividers**: Scrollable list with bold uppercase section categories (e.g., `NAVIGATION`) using `fontSize: 14`, `fontWeight: 700`, and `letterSpacing: 0.5`.
- **Active State Highlighting**: The active route highlights using a dedicated background tint (`backgroundColor: theme.colors.primaryContainer`).
- **Footer Section**: Place a logout button (red color theme text) on the left side of the row, and a theme switcher pill (three distinct light/dark/system mode selection icons) on the right side of the row.
