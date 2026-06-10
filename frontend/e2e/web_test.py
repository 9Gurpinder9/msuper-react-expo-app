import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTIxZjdhLTk2ZTgtNGUwZC1hYWM1LTk0MjNlNWFmYjFmNCIsImVtYWlsIjoiZ3VycGluZGVyYnJhcjQ5NUBnbWFpbC5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3ODA2MjQxNDksImV4cCI6MTc4MDcxMDU0OX0.iy57LXzdP3feEYeZJWqAzZrBBTvm0n9Ag5UKGa8B0Ao"

def run_test():
    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        
        print("Navigating to http://localhost:19006...")
        page.goto("http://localhost:19006")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)
        
        # Inject token into localStorage (AsyncStorage uses this on web)
        print("Injecting authentication token...")
        page.evaluate(f'localStorage.setItem("authToken", "{JWT_TOKEN}")')
        page.evaluate(f'localStorage.setItem("loginEmail", "gurpinderbrar495@gmail.com")')
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_01_injected.png"))

        # Navigate directly to Countries Registry
        print("Navigating directly to Countries Registry...")
        page.goto("http://localhost:19006/super-admin/countries")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_02_countries_list.png"))

        # Step 3: Tap on Add FAB
        print("Opening add country dialog...")
        # Check if the FAB exists by testID
        fab = page.locator('[data-testid="add-country-fab"]')
        if fab.is_visible():
            fab.click(force=True)
        else:
            page.locator('div[role="button"]:has(svg)').last.click(force=True)
        
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_03_add_dialog.png"))

        # Step 4: Fill form
        print("Entering details for new country...")
        page.locator('input[placeholder="E.g., India, United States"]').fill("Testlandia")
        page.locator('input[placeholder="E.g., IN, US"]').fill("TL")
        page.locator('input[placeholder="E.g., +91, +1"]').fill("+999")
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_04_filled_form.png"))

        # Step 5: Save
        print("Saving new country...")
        page.locator('button:has-text("Save")').click(force=True)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(4)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_05_saved.png"))

        # Step 6: Find and Edit the created country dynamically
        print("Finding the newly added country for editing...")
        # Click the Edit button via JS evaluation in the page context
        clicked = page.evaluate("""() => {
            const editBtns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(b => b.innerText && b.innerText.trim() === 'Edit');
            for (const btn of editBtns) {
                let parent = btn.parentElement;
                while (parent) {
                    if (parent.innerText && parent.innerText.includes('Testlandia') && !parent.innerText.includes('America') && !parent.innerText.includes('India')) {
                        btn.click();
                        return true;
                    }
                    parent = parent.parentElement;
                }
            }
            // Fallback: Click the last button with "Edit" text
            if (editBtns.length > 0) {
                editBtns[editBtns.length - 1].click();
                return true;
            }
            return false;
        }""")
        
        if not clicked:
            raise Exception("Edit button could not be clicked in page context!")
            
        print("Edit button clicked successfully in browser context.")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(5) # Give page ample time to load edit details
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_06_edit_dialog.png"))

        # Step 7: Update details
        print("Updating country name...")
        name_input = page.locator('input[placeholder="E.g., India, United States"]')
        name_input.clear()
        name_input.fill("Testlandia Updated")
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_07_edit_filled.png"))

        # Step 8: Update
        print("Saving updates...")
        page.locator('button:has-text("Update")').click(force=True)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(4)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_08_updated_list.png"))

        # Verify updated item is visible in the list
        print("Verifying the updated country is visible in list...")
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "web_09_final_verification.png"))
        
        print("Test completed successfully!")
        browser.close()

if __name__ == "__main__":
    run_test()
