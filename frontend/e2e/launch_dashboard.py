import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth.json")

def launch():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        if os.path.exists(AUTH_FILE):
            print(f"Loading persistent session state from {AUTH_FILE}...", flush=True)
            context = browser.new_context(storage_state=AUTH_FILE, viewport={"width": 1280, "height": 800})
        else:
            print("No auth.json session found. Starting fresh context...", flush=True)
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            
        page = context.new_page()
        
        # Navigate first to Super Admin Dashboard
        print("Navigating to Super Admin Dashboard...", flush=True)
        page.goto("http://localhost:19006/super-admin/dashboard")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)
        
        # Check if login is needed
        if "login" in page.url or page.locator("text=Authorize Session").is_visible() or page.locator('input[placeholder="admin@system.com"]').is_visible():
            print("Session expired or not authenticated. Please log in manually in the browser window...", flush=True)
            
            # Simple wait loop for user to complete manual login
            for _ in range(60): # 10 minutes max
                if "dashboard" in page.url:
                    print("Dashboard detected! Saving session state...", flush=True)
                    time.sleep(3)
                    context.storage_state(path=AUTH_FILE)
                    break
                time.sleep(10)
        
        # Once authenticated, open companies page
        print("Navigating to Companies Registry...", flush=True)
        page.goto("http://localhost:19006/super-admin/companies")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        print("Navigating to Add Company Form...", flush=True)
        page.goto("http://localhost:19006/super-admin/companies/add-company")
        page.wait_for_load_state("domcontentloaded")
        
        print("Browser is open on the Add Company form. You can now inspect it manually!", flush=True)
        print("Press Ctrl+C in this terminal when you want to close the browser.", flush=True)
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Closing browser...", flush=True)
            browser.close()

if __name__ == "__main__":
    launch()
