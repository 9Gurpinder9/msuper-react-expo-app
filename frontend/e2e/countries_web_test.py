import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth.json")

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])
        
        # Check if auth.json exists to load session state
        if os.path.exists(AUTH_FILE):
            print(f"Loading persistent session state from {AUTH_FILE}...", flush=True)
            context = browser.new_context(storage_state=AUTH_FILE, no_viewport=True)
        else:
            print("No auth.json session found. Starting fresh context...", flush=True)
            context = browser.new_context(no_viewport=True)
            
        page = context.new_page()
        
        # Navigate first to Super Admin Dashboard to verify/restore authentication
        print("Navigating to Super Admin Dashboard...", flush=True)
        page.goto("http://localhost:19006/super-admin/dashboard")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(4) # Let any default redirect happen

        # Check if we are redirected to Workspace selector or login
        if "login" in page.url or page.locator("text=Choose Workspace").is_visible() or page.locator("text=Super Admin").is_visible() or page.locator("text=Authorize Session").is_visible() or page.locator('input[placeholder="admin@system.com"]').is_visible():
            if page.locator("text=Choose Workspace").is_visible() or page.locator("text=Super Admin").is_visible():
                print("Workspace selector detected. Clicking Super Admin...", flush=True)
                page.locator('text=Super Admin').first.click()
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)

            # Check if login is required
            if "login" in page.url or page.locator("text=Authorize Session").is_visible() or page.locator('input[placeholder="admin@system.com"]').is_visible():
                print("Session not authenticated. Initiating live login flow...", flush=True)
                    
                # Wait for user inputs: 5 attempts, 10 seconds apart
                credentials_submitted = False
                for attempt in range(1, 6):
                    print(f"[Attempt {attempt}/5] Checking if Email and Password are filled in browser...", flush=True)
                    filled = page.evaluate("""() => {
                        const emailInput = document.querySelector('input[placeholder="admin@system.com"]');
                        const passInput = document.querySelector('input[placeholder="••••••••"]');
                        return emailInput && emailInput.value.length > 5 && passInput && passInput.value.length > 3;
                    }""")
                    if filled:
                        print("Credentials detected. Submitting login form...", flush=True)
                        page.evaluate("""() => {
                            const btn = document.querySelector('[data-testid="login-button"]') || Array.from(document.querySelectorAll('button, [role="button"]')).find(b => b.innerText && b.innerText.includes('Authorize Session'));
                            if (btn) btn.click();
                        }""")
                        credentials_submitted = True
                        break
                    time.sleep(10)
                    
                if not credentials_submitted:
                    raise Exception("Timeout: Credentials were not entered in time (5 attempts, 50s total).")
                
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)

                # Wait for user to enter 6-digit OTP: 5 attempts, 10 seconds apart
                otp_submitted = False
                for attempt in range(1, 6):
                    print(f"[Attempt {attempt}/5] Checking if 6-digit OTP is entered in browser...", flush=True)
                    otp_filled = page.evaluate("""() => {
                        const otpInput = document.querySelector('input[keyboardtype="number-pad"], input[inputmode="numeric"]');
                        return otpInput && otpInput.value.length === 6;
                    }""")
                    if otp_filled:
                        print("OTP detected. Verifying and logging in...", flush=True)
                        page.evaluate("""() => {
                            const btn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => b.innerText && (b.innerText.includes('Verify') || b.innerText.includes('Confirm')));
                            if (btn) btn.click();
                        }""")
                        otp_submitted = True
                        break
                    time.sleep(10)
                    
                if not otp_submitted:
                    raise Exception("Timeout: OTP was not entered in time (5 attempts, 50s total).")
                
                # Wait for dashboard redirect and save session
                print("Waiting for redirect to dashboard...", flush=True)
                time.sleep(5)
                
                print(f"Saving browser session state to {AUTH_FILE}...", flush=True)
                context.storage_state(path=AUTH_FILE)

        # Ensure we are on Dashboard first
        print("Ensuring we are on Dashboard...", flush=True)
        page.goto("http://localhost:19006/super-admin/dashboard")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_01_dashboard.png"))

        # Navigate directly to Countries Registry from Dashboard
        print("Navigating to Countries Registry...", flush=True)
        page.goto("http://localhost:19006/super-admin/countries")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_02_list.png"))

        # Step 4: Check if "Testlandia" or "Testlandia Updated" already exists (Self-healing duplicate check)
        print("Checking if country 'Testlandia' or 'Testlandia Updated' already exists in list...", flush=True)
        list_has_country = page.evaluate("""() => {
            const listCard = document.querySelector('.css-view-175oi2r') || document.body;
            return listCard && (listCard.innerText.includes('Testlandia') || listCard.innerText.includes('Testlandia Updated'));
        }""")

        if list_has_country:
            print("Country 'Testlandia' or 'Testlandia Updated' already exists. Skipping Add step and proceeding directly to Edit.", flush=True)
            lookup_name = "Testlandia Updated" if page.evaluate("document.body.innerText.includes('Testlandia Updated')") else "Testlandia"
        else:
            # Step 5: Add Country if not exists
            print("Testlandia does not exist. Adding country...", flush=True)
            fab = page.locator('[data-testid="add-country-fab"]')
            if fab.is_visible():
                fab.click(force=True)
            else:
                page.locator('div[role="button"]:has(svg)').last.click(force=True)
            
            page.wait_for_load_state("domcontentloaded")
            time.sleep(3)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_03_add_dialog.png"))

            print("Entering details for new country...", flush=True)
            page.locator('input[placeholder="E.g., India, United States"]').fill("Testlandia")
            page.locator('input[placeholder="E.g., IN, US"]').fill("TL")
            page.locator('input[placeholder="E.g., +91, +1"]').fill("+999")
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_04_filled_form.png"))

            print("Saving new country...", flush=True)
            page.locator('button:has-text("Save")').click(force=True)
            page.wait_for_load_state("domcontentloaded")
            time.sleep(4)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_05_saved.png"))
            lookup_name = "Testlandia"

        # Step 6: Find and Edit the country
        print(f"Finding country '{lookup_name}' for editing...", flush=True)
        clicked = page.evaluate("""(name) => {
            const editBtns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(b => b.innerText && b.innerText.trim() === 'Edit');
            for (const btn of editBtns) {
                let parent = btn.parentElement;
                while (parent) {
                    if (parent.innerText && parent.innerText.includes(name) && !parent.innerText.includes('America') && !parent.innerText.includes('India')) {
                        btn.click();
                        return true;
                    }
                    parent = parent.parentElement;
                }
            }
            return false;
        }""", lookup_name)
        
        if not clicked:
            raise Exception(f"Edit button for '{lookup_name}' could not be clicked!")
            
        print("Edit button clicked.", flush=True)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_06_edit_dialog.png"))

        # Step 7: Update details
        print("Updating country name...", flush=True)
        name_input = page.locator('input[placeholder="E.g., India, United States"]').last
        name_input.clear()
        name_input.fill("Testlandia Updated")
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_07_edit_filled.png"))

        # Step 8: Save Updates
        print("Saving updates...", flush=True)
        page.locator('button:has-text("Update")').last.click(force=True)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(4)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "countries_08_updated_list.png"))

        print("Test completed successfully! Keeping browser open for reuse.", flush=True)
        print("Press Ctrl+C in this terminal when you want to finish.", flush=True)
        while True:
            time.sleep(1)

if __name__ == "__main__":
    run_test()
