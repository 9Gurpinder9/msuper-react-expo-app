# Attendance Tracking & Camera Biometrics

This document details the geolocation and biometric face-verification systems used to mark workspace attendance.

---

## 1. Geolocation Verification

- **GPS Permission Checks**: The app verifies and requests location permissions.
- **Location Resolution**: Resolves the coordinates (latitude/longitude) and reverse-geocodes them into a human-readable street address.
- **Refresh Capability**: Users can trigger a manual GPS refresh using a dedicated location button.
- **Time Lock Enforcement**: A strict 60-second cooldown lock is enforced on the server after punch-in to prevent accidental duplicate entries.

---

## 2. Face Viewfinder & Biometrics

When marking attendance, the app launches a custom biometric viewfinder camera overlay:
- **Noiseless Scanning Loop**: A background loop takes low-quality frames to feed to the ML Kit on-device face detector. By passing `shutterSound: false` to these scanning passes, the app prevents audio clicking or sensor stutter during scanning.
- **Target Lock Viewfinder**: Four absolute corner brackets frame the oval face-guide frame and change colors depending on status (White for scanning, Emerald Green for locked, Red for warning).
- **Neon Scanline Laser**: A glowing horizontal bar moves up and down inside the viewfinder frame. It matches the color theme of the scanner state.
- **SVG Oval Progress Ring**: An `<AnimatedRect>` progress outline drawn using `react-native-svg` wraps the viewfinder oval.
- **Verification Progress (0-100%)**:
  - When exactly one face is detected, a 2-second animation plays, moving the verification progress from `0%` to `100%`.
  - The SVG outline fills up in emerald green as the percentage rises, and a digital percentage readout (`VERIFYING`) renders in the center of the frame.
  - If the face is lost or leaves the frame, the progress resets to `0%` instantly.
  - Upon reaching `100%`, the camera automatically takes the final high-quality attendance photo.
- **Conditional Shutter Button**: The manual capture shutter button is hidden by default and only shows if a face is detected (`faceCount === 1`) as a manual fallback.
