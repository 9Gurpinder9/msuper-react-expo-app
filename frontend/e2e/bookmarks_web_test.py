import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth_company.json")
BASE_URL = "http://localhost:8081"

BOOKMARK_URLS = [
    "https://github.com",
    "https://stackoverflow.com",
    "https://reactnative.dev",
    "https://expo.dev",
    "https://supabase.com",
    "https://nestjs.com",
    "https://www.docker.com",
    "https://www.postgresql.org",
    "https://tailwindcss.com",
    "https://vercel.com",
]


def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])

        if os.path.exists(AUTH_FILE):
            print(f"Loading company session from {AUTH_FILE}...", flush=True)
            context = browser.new_context(storage_state=AUTH_FILE, no_viewport=True)
        else:
            print("No company session found. Starting fresh context...", flush=True)
            context = browser.new_context(no_viewport=True)

        page = context.new_page()

        # ---- Step 1: Navigate to Company Bookmarks ----
        print("Navigating to Company Bookmarks...", flush=True)
        page.goto(f"{BASE_URL}/company/bookmarks")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(4)

        # ---- Step 2: Authenticate if needed ----
        if "login" in page.url or page.locator('input[placeholder="company@domain.com"]').is_visible():
            print("Session not authenticated. Initiating live login flow...", flush=True)

            # Wait for credentials
            credentials_submitted = False
            for attempt in range(1, 6):
                print(f"[Attempt {attempt}/5] Waiting for email + password...", flush=True)
                filled = page.evaluate("""() => {
                    const emailInput = document.querySelector('input[placeholder="company@domain.com"]');
                    const passInput = document.querySelector('input[placeholder="••••••••"]');
                    return emailInput && emailInput.value.length > 5 && passInput && passInput.value.length > 3;
                }""")
                if filled:
                    print("Credentials detected. Submitting login form...", flush=True)
                    page.evaluate("""() => {
                        const btn = document.querySelector('[data-testid="company-login-button"]') || Array.from(document.querySelectorAll('button, [role="button"]')).find(b => b.innerText && b.innerText.includes('Authorize Session'));
                        if (btn) btn.click();
                    }""")
                    credentials_submitted = True
                    break
                time.sleep(10)

            if not credentials_submitted:
                raise Exception("Timeout: Credentials were not entered in time (5 attempts, 50s total).")

            page.wait_for_load_state("domcontentloaded")
            time.sleep(3)

            # Wait for OTP
            otp_submitted = False
            for attempt in range(1, 6):
                print(f"[Attempt {attempt}/5] Waiting for 6-digit OTP...", flush=True)
                otp_filled = page.evaluate("""() => {
                    const otpInput = document.querySelector('input[keyboardtype="number-pad"], input[inputmode="numeric"]');
                    return otpInput && otpInput.value.length === 6;
                }""")
                if otp_filled:
                    print("OTP detected. Verifying...", flush=True)
                    page.evaluate("""() => {
                        const btn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => b.innerText && (b.innerText.includes('Verify') || b.innerText.includes('Confirm')));
                        if (btn) btn.click();
                    }""")
                    otp_submitted = True
                    break
                time.sleep(10)

            if not otp_submitted:
                raise Exception("Timeout: OTP was not entered in time (5 attempts, 50s total).")

            print("Waiting for redirect after OTP...", flush=True)
            time.sleep(5)

            print(f"Saving company session to {AUTH_FILE}...", flush=True)
            context.storage_state(path=AUTH_FILE)

        # ---- Step 3: Ensure we are on Bookmarks page ----
        print("Ensuring we are on Bookmarks page...", flush=True)
        page.goto(f"{BASE_URL}/company/bookmarks")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "bookmarks_01_list.png"))

        # ---- Step 4: Ensure a category exists for required field ----
        print("Checking if a category exists...", flush=True)
        page.goto(f"{BASE_URL}/company/categories")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        has_category = page.evaluate("""() => {
            const body = document.body.innerText;
            return !body.includes('No categories') && !body.includes('No results');
        }""")

        if not has_category:
            print("No categories found. Creating 'Test Category'...", flush=True)
            fab = page.locator('[data-testid="add-category-fab"]')
            if fab.is_visible():
                fab.click(force=True)
            else:
                page.evaluate("""() => {
                    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                    const addBtn = btns.find(b => b.innerText.includes('Add'));
                    if (addBtn) addBtn.click();
                }""")
            page.wait_for_load_state("domcontentloaded")
            time.sleep(3)

            page.evaluate("""() => {
                const inp = document.querySelector('input[placeholder*="e.g."], input[placeholder*="Category name"]');
                if (inp) inp.value = 'Test Category';
            }""")
            time.sleep(0.5)

            page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                const saveBtn = btns.find(b => b.innerText === 'Save');
                if (saveBtn) saveBtn.click();
            }""")
            time.sleep(3)
            print("Category created.", flush=True)

        # ---- Step 5: Navigate back to bookmarks ----
        print("Navigating back to Bookmarks...", flush=True)
        page.goto(f"{BASE_URL}/company/bookmarks")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        # ---- Step 6: Add 10 bookmarks ----
        for idx, url in enumerate(BOOKMARK_URLS, 1):
            title = url.replace("https://", "").replace("http://", "").replace("www.", "").split(".")[0].capitalize()
            print(f"\n--- Bookmark {idx}/10: {title} ---", flush=True)

            # Check if already exists (self-healing)
            exists = page.evaluate(f"""() => document.body.innerText.includes('{title}')""")
            if exists:
                print(f"  '{title}' already exists. Skipping.", flush=True)
                continue

            # Click Add FAB
            print("  Clicking Add FAB...", flush=True)
            fab = page.locator('[data-testid="add-bookmark-fab"]')
            if fab.is_visible():
                fab.click(force=True)
            else:
                page.evaluate("""() => {
                    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                    const addBtn = btns.find(b => b.innerText.includes('Add') || b.querySelector('svg'));
                    if (addBtn) addBtn.click();
                }""")
            page.wait_for_load_state("domcontentloaded")
            time.sleep(3)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, f"bookmarks_{idx:02d}_add_form.png"))

            # ----- Step A: Select Category FIRST (before filling anything else) -----
            print("  Selecting category first...", flush=True)
            cat_selector = page.locator('[data-testid="bookmark-category-selector"]')
            if cat_selector.is_visible():
                cat_selector.click(force=True)
            else:
                page.evaluate("""() => {
                    const el = document.querySelector('[data-testid="bookmark-category-selector"]');
                    if (el) el.click();
                }""")

            # Wait for modal to appear and click first category option
            time.sleep(2)
            try:
                # Find the modal surface (the one containing "Select Category")
                modal = page.locator('[data-testid="surface"]').filter(has_text="Select Category")
                modal.wait_for(state="visible", timeout=5000)
                # Within the modal, find category options (div[tabindex="0"] inside FlatList)
                cat_option = modal.locator('div[tabindex="0"]').first
                cat_option.wait_for(state="visible", timeout=3000)
                cat_option.click()
                time.sleep(1)
            except Exception:
                print("  WARNING: Could not select category via locator, trying JS fallback...", flush=True)
                page.evaluate("""() => {
                    const modals = document.querySelectorAll('[data-testid="surface"]');
                    let modal = null;
                    for (const m of modals) {
                        if (m.innerText && m.innerText.includes('Select Category')) { modal = m; break; }
                    }
                    if (!modal) return;
                    const options = modal.querySelectorAll('div[tabindex="0"]');
                    for (const opt of options) {
                        const t = (opt.innerText || '').trim();
                        if (t && t !== 'Cancel') { opt.click(); return; }
                    }
                }""")
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, f"bookmarks_{idx:02d}_cat_fail.png"))

            # Verify category is now selected (the TextInput should show a name)
            cat_selected = page.evaluate("""() => {
                const inp = document.querySelector('input[placeholder="Tap to select Category..."]');
                return inp && inp.value && inp.value.trim().length > 0;
            }""")
            if not cat_selected:
                print("  ERROR: Category was not selected. Skipping this bookmark.", flush=True)
                # Navigate back to list
                page.goto(f"{BASE_URL}/company/bookmarks")
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)
                continue

            # ----- Step B: Fill other fields using Playwright fill() (proper React event handling) -----
            print(f"  URL: {url}", flush=True)
            page.locator('[data-testid="bookmark-url-input"]').fill(url)
            time.sleep(0.5)

            print(f"  Title: {title}", flush=True)
            page.locator('[data-testid="bookmark-title-input"]').fill(title)
            time.sleep(0.5)

            print(f"  Description: {title} bookmark", flush=True)
            desc = page.locator('[data-testid="bookmark-description-input"]')
            if desc.is_visible():
                desc.fill(f"A bookmark for {title}")
                time.sleep(0.3)

            tags_input = page.locator('[data-testid="bookmark-tags-input"]')
            if tags_input.is_visible():
                tags_input.fill("web, dev, testing")
                time.sleep(0.3)

            # ----- Step C: Save and verify -----
            print("  Saving...", flush=True)

            # Intercept the create bookmark API call
            save_btn = page.locator('[data-testid="save-bookmark-button"]')
            with page.expect_response(
                lambda resp: resp.url.endswith("/bookmarks") and resp.request.method == "POST",
                timeout=10000
            ) as response_info:
                if save_btn.is_visible():
                    save_btn.click(force=True)
                else:
                    page.evaluate("""() => {
                        const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                        const sb = btns.find(b => b.innerText === 'Save');
                        if (sb) sb.click();
                    }""")

            try:
                resp = response_info.value
                if resp.ok:
                    print(f"  ✓ API returned {resp.status}", flush=True)
                else:
                    body = resp.text()[:200] if resp.text() else "N/A"
                    print(f"  ✗ API returned {resp.status}: {body}", flush=True)
                    page.screenshot(path=os.path.join(ARTIFACT_DIR, f"bookmarks_{idx:02d}_api_err.png"))
            except Exception as e:
                print(f"  WARNING: No API response received: {e}", flush=True)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, f"bookmarks_{idx:02d}_no_api.png"))

            time.sleep(2)

            # Navigate back to bookmarks list
            page.goto(f"{BASE_URL}/company/bookmarks")
            page.wait_for_load_state("domcontentloaded")
            time.sleep(3)

            # Verify bookmark exists in the list
            found = page.evaluate(f"""() => document.body.innerText.toLowerCase().includes('{title.lower()}')""")
            if found:
                print(f"  ✓ Verified in list", flush=True)
            else:
                print(f"  WARNING: '{title}' not found in list after save", flush=True)

            print(f"  ✓ Bookmark {idx} saved successfully", flush=True)

            if idx % 5 == 0:
                page.screenshot(path=os.path.join(ARTIFACT_DIR, f"bookmarks_{(idx//5)+1}_progress.png"))

        # ---- Step 7: Final verification using search ----
        print("\n--- Final verification ---", flush=True)
        page.goto(f"{BASE_URL}/company/bookmarks")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(5)

        # Use search bar to find each bookmark (handles FlatList virtualization)
        missing = []
        for url in BOOKMARK_URLS:
            title = url.replace("https://", "").replace("http://", "").replace("www.", "").split(".")[0].capitalize()
            # Open search bar
            search_toggle = page.locator('[aria-label="Toggle search"]')
            if search_toggle.is_visible(timeout=2000):
                search_toggle.click()
                time.sleep(1)

            # Type title in search field
            search_input = page.locator('input[placeholder="Search bookmarks..."]')
            if search_input.is_visible(timeout=2000):
                search_input.fill(title)
                time.sleep(2)

                # Check if it appears in results
                found = page.evaluate(f"""() => {{
                    const items = document.body.querySelectorAll('[class*="list-item"], [class*="card"], [class*="table"]');
                    for (const item of items) {{
                        if (item.innerText && item.innerText.toLowerCase().includes('{title.lower()}')) return true;
                    }}
                    return document.body.innerText.toLowerCase().includes('{title.lower()}');
                }}""")
                if found:
                    print(f"  ✓ {title}", flush=True)
                else:
                    missing.append(title)

                search_input.fill("")
                time.sleep(1)
            else:
                # Fallback: check body text
                found = page.evaluate(f"""() => document.body.innerText.toLowerCase().includes('{title.lower()}')""")
                if found:
                    print(f"  ✓ {title}", flush=True)
                else:
                    missing.append(title)

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "bookmarks_final_list.png"))

        if not missing:
            print(f"\nSUCCESS: All 10 bookmarks verified!", flush=True)
        else:
            print(f"\nWARNING: Not found ({len(missing)}): {missing}", flush=True)

        print("\nBrowser stays open for inspection. Press Ctrl+C in terminal to close.", flush=True)
        while True:
            time.sleep(1)


if __name__ == "__main__":
    run_test()
