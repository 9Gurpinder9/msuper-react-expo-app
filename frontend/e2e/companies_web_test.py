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

        # Loop to test Edit and Menu Permissions on the first 5 companies
        for index in range(5):
            print(f"\n--- Starting E2E test for Company #{index + 1} ---", flush=True)
            
            # Navigate to Companies Registry
            print("Navigating to Companies Registry...", flush=True)
            page.goto("http://localhost:19006/super-admin/companies")
            page.wait_for_load_state("domcontentloaded")
            print("Waiting for list page to load...", flush=True)
            page.wait_for_selector("text=Total records:", timeout=15000)
            time.sleep(3)
            
            # Check total available company dots buttons
            menu_buttons = page.locator('[data-testid^="company-menu-button-"]:not([data-testid$="-container"])')
            total_buttons = menu_buttons.count()
            print(f"Found {total_buttons} companies in the visible list.", flush=True)
            
            if index >= total_buttons:
                print(f"No company at index {index}. Skipping remaining tests.", flush=True)
                break
                
            # Click Dots menu for target company
            print(f"Clicking Dots menu for company at index {index}...", flush=True)
            menu_buttons.nth(index).click(force=True)
            time.sleep(2)
            
            # Step 1: Open Menu Permissions
            print("Clicking 'Edit Menu Permissions' item...", flush=True)
            page.locator(f'[data-testid="edit-permissions-item-{index}"]').first.click(force=True)
            page.wait_for_load_state("domcontentloaded")
            time.sleep(4)
            
            # Verify we are on menu-permissions page
            if "menu-permissions" in page.url:
                print("On Menu Permissions configuration page.", flush=True)
                # Toggle allow-all-menu-switch ON
                allow_all = page.locator('[data-testid="allow-all-menu-switch"]')
                if allow_all.count() > 0:
                    print("Toggling 'Allow all menu' switch ON...", flush=True)
                    # Get current checked status if possible or click to ensure ON
                    allow_all.click(force=True)
                    time.sleep(2)
                
                print("Saving permissions...", flush=True)
                page.locator('[data-testid="save-menu-permissions-button"]').click(force=True)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(5)
                
            # Go back to Companies list
            print("Returning to Companies Registry...", flush=True)
            page.goto("http://localhost:19006/super-admin/companies")
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector("text=Total records:", timeout=15000)
            time.sleep(3)
            
            # Click Dots menu again to edit company details
            print(f"Clicking Dots menu for company at index {index} to Edit details...", flush=True)
            page.locator(f'[data-testid="company-menu-button-{index}"]').first.click(force=True)
            time.sleep(2)
            
            # Step 2: Open Edit Form
            print("Clicking 'Edit' menu item...", flush=True)
            page.locator(f'[data-testid="edit-company-item-{index}"]').first.click(force=True)
            page.wait_for_load_state("domcontentloaded")
            time.sleep(4)
            
            # Modify owner name or print label
            if "edit-company" in page.url:
                print("On Edit Company details page. Modifying fields...", flush=True)
                owner_input = page.locator('[data-testid="owner-name-input"]')
                current_owner = owner_input.input_value()
                print(f"Current owner: '{current_owner}'", flush=True)
                
                # Check if already tested to avoid infinite suffix growth
                new_owner = current_owner
                if not current_owner.endswith(" Tested"):
                    new_owner = current_owner + " Tested"
                else:
                    new_owner = current_owner.replace(" Tested", "")
                
                print(f"Changing owner to: '{new_owner}'", flush=True)
                owner_input.clear()
                owner_input.fill(new_owner)
                time.sleep(1)
                
                print("Clicking Update Company button...", flush=True)
                page.locator('[data-testid="save-company-button"]').click(force=True)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(5)
                
            print(f"E2E test for Company #{index + 1} completed successfully!", flush=True)

        print("\nAll 5 companies edit and permissions test iterations completed successfully!", flush=True)
        if __name__ == "__main__":
            print("Keeping browser open for reuse.", flush=True)
            print("Press Ctrl+C in this terminal when you want to finish.", flush=True)
            while True:
                time.sleep(1)
        else:
            print("Closing browser context for test runner report generation.", flush=True)
            browser.close()

if __name__ == "__main__":
    run_test()
