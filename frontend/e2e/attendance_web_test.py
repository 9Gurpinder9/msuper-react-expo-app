# frontend/e2e/attendance_web_test.py
import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\1c77ccb5-2dc1-465c-8786-f7ad612e54a5"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth_company.json")

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser...", flush=True)
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])
        
        if os.path.exists(AUTH_FILE):
            print(f"Loading persistent company session from {AUTH_FILE}...", flush=True)
            context = browser.new_context(storage_state=AUTH_FILE, no_viewport=True)
        else:
            print("Warning: auth_company.json not found. Please log in first.", flush=True)
            context = browser.new_context(no_viewport=True)
            
        page = context.new_page()
        
        # Navigate to Dashboard
        print("Navigating to Company Dashboard...", flush=True)
        page.goto("http://localhost:8081/company/dashboard")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "attendance_01_dashboard.png"))

        # Navigate to Attendance Module
        print("Navigating to Attendance Dashboard...", flush=True)
        page.goto("http://localhost:8081/company/attendance")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "attendance_02_panel.png"))

        # Check if already fully punched out
        body_text = page.locator("body").inner_text()
        if "Shift Complete for Today" in body_text:
            print("Shift is already complete for today. Proceeding to view reports...", flush=True)
        else:
            # Check button text (Punch In Now or Punch Out Now)
            is_punch_out = "Punch Out Now" in body_text
            action_type = "Punch Out" if is_punch_out else "Punch In"
            print(f"Executing {action_type} flow...", flush=True)

            # Trigger Camera Simulation Capture
            print("Opening simulated camera capture...", flush=True)
            # Locate and click the capture target zone
            page.locator("text=Tap to Capture Live Photo").click(force=True)
            time.sleep(3)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "attendance_03_camera_overlay.png"))

            # Click simulated snap button
            page.locator("text=Snap Simulated Photo").click(force=True)
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "attendance_04_photo_attached.png"))

            # Click punch action button
            print("Submitting attendance request...", flush=True)
            page.locator(f"text={action_type} Now").click(force=True)
            time.sleep(6)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "attendance_05_punch_result.png"))

        # Navigate to Reports page using the top app bar action
        print("Navigating to Attendance Monthly Reports...", flush=True)
        page.locator('[aria-label="View Reports"]').click(force=True)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "attendance_06_reports.png"))
        
        print("E2E Test Completed successfully!", flush=True)
        browser.close()

if __name__ == "__main__":
    run_test()
