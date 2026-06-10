import os
import sys
import time
import random
import html
from datetime import datetime
import xml.etree.ElementTree as ET
from io import StringIO

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

REPORT_FILE = os.path.join(os.path.dirname(__file__), "reports", "report.xml")
ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth_company.json")
BASE_URL = "http://localhost:8081"

NEW_CATEGORIES = [
    "Testing Tools",
    "Development",
    "Design Resources",
    "Marketing",
    "DevOps",
]

NEW_BOOKMARKS = [
    ("https://jestjs.io", "Jestjs"),
    ("https://figma.com", "Figma"),
    ("https://grafana.com", "Grafana"),
    ("https://kubernetes.io", "Kubernetes"),
    ("https://datadoghq.com", "Datadoghq"),
]

TAG_POOL = [
    "automation", "frontend", "backend", "testing", "design",
    "infrastructure", "monitoring", "ci-cd", "devops", "cloud",
]


class TestCaseResult:
    def __init__(self, name, classname="bookmarks_categories_test"):
        self.name = name
        self.classname = classname
        self.start_time = time.time()
        self.elapsed = 0.0
        self.status = "passed"
        self.message = ""
        self.stdout = ""

    def finish(self, status="passed", message=""):
        self.elapsed = time.time() - self.start_time
        self.status = status
        self.message = message


def generate_junit_xml(results):
    root = ET.Element("testsuites")
    ts = ET.SubElement(root, "testsuite", {
        "name": "Bookmarks & Categories Test Suite",
        "tests": str(len(results)),
        "failures": str(sum(1 for r in results if r.status == "failed")),
        "errors": "0",
        "time": f"{sum(r.elapsed for r in results):.2f}",
    })

    for r in results:
        tc = ET.SubElement(ts, "testcase", {
            "name": r.name,
            "classname": r.classname,
            "time": f"{r.elapsed:.2f}",
        })
        if r.status == "failed":
            f = ET.SubElement(tc, "failure", {"message": r.message})
            f.text = r.message
        if r.stdout:
            so = ET.SubElement(tc, "system-out")
            so.text = r.stdout

    tree = ET.ElementTree(root)
    os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)
    tree.write(REPORT_FILE, encoding="utf-8", xml_declaration=True)
    print(f"\nJUnit XML report written to: {REPORT_FILE}")


def run_test():
    results = []
    capture_buf = StringIO()

    def log(msg=""):
        print(msg, flush=True)
        capture_buf.write(msg + "\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])

        if os.path.exists(AUTH_FILE):
            log(f"Loading company session from {AUTH_FILE}...")
            context = browser.new_context(storage_state=AUTH_FILE, no_viewport=True)
        else:
            log("No company session found. Starting fresh context...")
            context = browser.new_context(no_viewport=True)

        page = context.new_page()

        # ===============================================================
        # PART 1: Create 5 new categories
        # ===============================================================
        log("\n" + "=" * 60)
        log("PART 1: Creating 5 new categories")
        log("=" * 60)

        page.goto(f"{BASE_URL}/company/categories")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        for cat_name in NEW_CATEGORIES:
            tc = TestCaseResult(f"Create category: {cat_name}")
            try:
                exists = page.evaluate(f"""() => document.body.innerText.includes('{cat_name}')""")
                if exists:
                    log(f"  '{cat_name}' already exists. Skipping.")
                    tc.finish("passed", "Already existed, skipped")
                    results.append(tc)
                    continue

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
                time.sleep(2)

                name_input = page.locator('[data-testid="category-name-input"]')
                if name_input.is_visible():
                    name_input.fill(cat_name)
                time.sleep(0.5)

                save_btn = page.locator('[data-testid="save-category-button"]')
                if save_btn.is_visible():
                    save_btn.click(force=True)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(2)

                page.goto(f"{BASE_URL}/company/categories")
                page.wait_for_load_state("domcontentloaded")
                time.sleep(2)
                found = page.evaluate(f"""() => document.body.innerText.includes('{cat_name}')""")
                if found:
                    log(f"  \u2713 Created: {cat_name}")
                    tc.finish("passed")
                else:
                    log(f"  \u2717 NOT found in list: {cat_name}")
                    page.screenshot(path=os.path.join(ARTIFACT_DIR, f"cat_missing_{cat_name.replace(' ', '_')}.png"))
                    tc.finish("failed", f"Category '{cat_name}' not found in list after creation")
            except Exception as e:
                tc.finish("failed", str(e))
            tc.stdout = capture_buf.getvalue()
            results.append(tc)

        # ===============================================================
        # PART 2: Create 5 bookmarks with random categories + tags
        # ===============================================================
        log("\n" + "=" * 60)
        log("PART 2: Creating 5 new bookmarks with random categories & tags")
        log("=" * 60)

        page.goto(f"{BASE_URL}/company/bookmarks")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        for idx, (bookmark_url, bookmark_title) in enumerate(NEW_BOOKMARKS, 1):
            tc = TestCaseResult(f"Create bookmark: {bookmark_title}")
            try:
                exists = page.evaluate(f"""() => document.body.innerText.includes('{bookmark_title}')""")
                if exists:
                    log(f"  '{bookmark_title}' already exists. Skipping.")
                    tc.finish("passed", "Already existed, skipped")
                    results.append(tc)
                    continue

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
                time.sleep(2)

                all_cats = NEW_CATEGORIES + ["AI tools", "Office work", "Others"]
                chosen_cat = random.choice(all_cats)
                log(f"  Selected category: {chosen_cat}")

                cat_sel = page.locator('[data-testid="bookmark-category-selector"]')
                if cat_sel.is_visible():
                    cat_sel.click(force=True)
                time.sleep(2)

                try:
                    modal = page.locator('[data-testid="surface"]').filter(has_text="Select Category")
                    modal.wait_for(state="visible", timeout=5000)
                    cat_opt = modal.locator('div[tabindex="0"]').filter(has_text=chosen_cat)
                    cat_opt.first.wait_for(state="visible", timeout=3000)
                    cat_opt.first.click()
                    time.sleep(1)
                except Exception:
                    log("  Category locator failed, trying JS fallback...")
                    page.evaluate(f"""() => {{
                        const modals = document.querySelectorAll('[data-testid="surface"]');
                        let modal = null;
                        for (const m of modals) {{
                            if (m.innerText && m.innerText.includes('Select Category')) {{ modal = m; break; }}
                        }}
                        if (!modal) return;
                        const options = modal.querySelectorAll('div[tabindex="0"]');
                        for (const opt of options) {{
                            const t = (opt.innerText || '').trim();
                            if (t === '{chosen_cat}') {{ opt.click(); return; }}
                        }}
                    }}""")
                    time.sleep(1)

                cat_selected = page.evaluate("""() => {
                    const inp = document.querySelector('input[placeholder="Tap to select Category..."]');
                    return inp && inp.value && inp.value.trim().length > 0;
                }""")
                if not cat_selected:
                    log(f"  ERROR: Category '{chosen_cat}' not selected. Skipping.")
                    page.goto(f"{BASE_URL}/company/bookmarks")
                    page.wait_for_load_state("domcontentloaded")
                    time.sleep(2)
                    tc.finish("failed", f"Category '{chosen_cat}' not selected")
                    tc.stdout = capture_buf.getvalue()
                    results.append(tc)
                    continue

                page.locator('[data-testid="bookmark-url-input"]').fill(bookmark_url)
                time.sleep(0.3)
                page.locator('[data-testid="bookmark-title-input"]').fill(bookmark_title)
                time.sleep(0.3)

                desc = page.locator('[data-testid="bookmark-description-input"]')
                if desc.is_visible():
                    desc.fill(f"A bookmark for {bookmark_title}")
                    time.sleep(0.3)

                num_tags = random.randint(2, 4)
                chosen_tags = random.sample(TAG_POOL, num_tags)
                tags_str = ", ".join(chosen_tags)
                log(f"  Random tags: {tags_str}")

                tags_inp = page.locator('[data-testid="bookmark-tags-input"]')
                if tags_inp.is_visible():
                    tags_inp.fill(tags_str)
                    time.sleep(0.3)

                with page.expect_response(
                    lambda resp: resp.url.endswith("/bookmarks") and resp.request.method == "POST",
                    timeout=10000
                ) as response_info:
                    save_btn = page.locator('[data-testid="save-bookmark-button"]')
                    if save_btn.is_visible():
                        save_btn.click(force=True)
                    else:
                        page.evaluate("""() => {
                            const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                            const sb = btns.find(b => b.innerText === 'Save');
                            if (sb) sb.click();
                        }""")

                resp = response_info.value
                if resp.ok:
                    log(f"  \u2713 API returned {resp.status}")
                else:
                    log(f"  \u2717 API returned {resp.status}")
                    page.screenshot(path=os.path.join(ARTIFACT_DIR, f"bm{idx}_api_err.png"))

                time.sleep(2)
                page.goto(f"{BASE_URL}/company/bookmarks")
                page.wait_for_load_state("domcontentloaded")
                time.sleep(2)

                found = page.evaluate(f"""() => document.body.innerText.includes('{bookmark_title}')""")
                if found:
                    log(f"  \u2713 Verified: {bookmark_title}")
                    tc.finish("passed")
                else:
                    log(f"  WARNING: '{bookmark_title}' not visible in list")
                    page.screenshot(path=os.path.join(ARTIFACT_DIR, f"bm{idx}_missing.png"))
                    tc.finish("failed", f"Bookmark '{bookmark_title}' not visible in list")
            except Exception as e:
                tc.finish("failed", str(e))
            tc.stdout = capture_buf.getvalue()
            results.append(tc)

        # ===============================================================
        # PART 3: Final verification
        # ===============================================================
        log("\n" + "=" * 60)
        log("PART 3: Final verification")
        log("=" * 60)

        # Categories verification
        log("\n  --- Checking categories ---")
        page.goto(f"{BASE_URL}/company/categories")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        missing_cats = []
        for cat_name in NEW_CATEGORIES:
            found = page.evaluate(f"""() => document.body.innerText.includes('{cat_name}')""")
            if found:
                log(f"  \u2713 Category: {cat_name}")
            else:
                missing_cats.append(cat_name)

        # Bookmarks verification
        log("\n  --- Checking bookmarks ---")
        page.goto(f"{BASE_URL}/company/bookmarks")
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        missing_bms = []
        for url, title in NEW_BOOKMARKS:
            found = page.evaluate(f"""() => document.body.innerText.includes('{title}')""")
            if found:
                log(f"  \u2713 Bookmark: {title}")
            else:
                missing_bms.append(title)

        # Summary
        log("\n" + "=" * 60)
        log("SUMMARY")
        log("=" * 60)
        all_ok = True
        if not missing_cats:
            log("  Categories: ALL 5 created \u2713")
        else:
            log(f"  Categories missing: {missing_cats}")
            all_ok = False
        if not missing_bms:
            log("  Bookmarks: ALL 5 created \u2713")
        else:
            log(f"  Bookmarks missing: {missing_bms}")
            all_ok = False
        if all_ok:
            log("\n  SUCCESS: All entries created and verified!")
        else:
            log("\n  WARNING: Some entries not found")

        # Generate JUnit XML
        generate_junit_xml(results)

        log("\nTest complete. Report generated. Closing browser in 5 seconds...")
        time.sleep(5)


if __name__ == "__main__":
    run_test()
