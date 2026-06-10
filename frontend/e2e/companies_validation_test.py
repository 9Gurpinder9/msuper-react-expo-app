import os
import time
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth.json")
XML_REPORT_FILE = r"F:\AI_WORK\React-App\msuper-react-expo-app\frontend\e2e\reports\report.xml"

def log_test_result(name, duration, status, error_msg=""):
    """
    Appends the test case result directly to the JUnit report.xml file.
    """
    try:
        if os.path.exists(XML_REPORT_FILE):
            tree = ET.parse(XML_REPORT_FILE)
            root = tree.getroot()
        else:
            root = ET.Element("testsuites", name="pytest tests")
            tree = ET.ElementTree(root)

        suite = root.find("testsuite")
        if suite is None:
            suite = ET.SubElement(root, "testsuite", name="pytest", errors="0", failures="0", skipped="0", tests="0", time="0.0")
        
        tests = int(suite.attrib.get("tests", 0)) + 1
        suite.attrib["tests"] = str(tests)
        
        if status == "Failed":
            failures = int(suite.attrib.get("failures", 0)) + 1
            suite.attrib["failures"] = str(failures)

        current_time = float(suite.attrib.get("time", 0.0)) + duration
        suite.attrib["time"] = f"{current_time:.3f}"

        case_node = ET.SubElement(suite, "testcase", classname="frontend.e2e.test_companies_validation", name=name, time=f"{duration:.3f}")
        
        if status == "Failed":
            fail_node = ET.SubElement(case_node, "failure", message="Validation check failed")
            fail_node.text = error_msg
            
        tree.write(XML_REPORT_FILE, encoding="utf-8", xml_declaration=True)
        print(f"Logged JUnit result: {name} -> {status}", flush=True)
    except Exception as e:
        print(f"Error logging JUnit XML: {e}", flush=True)

def select_dropdown_option(page, trigger_testid, search_term):
    """
    Helper to trigger select option popup, search, and click option.
    """
    print(f"Opening selector: {trigger_testid} and searching for '{search_term}'...", flush=True)
    page.locator(f'[data-testid="{trigger_testid}"]').click()
    time.sleep(1.5)
    
    # Type search term if provided
    if search_term:
        page.locator('[data-testid="selector-search-input"]').fill(search_term)
        time.sleep(1.5)
        
    # Click the first matching option
    page.locator('[data-testid^="select-option-"]').first.click()
    time.sleep(1.5)

def run_test():
    start_time = time.time()
    unique_id = int(time.time())
    company_name = f"Acme Validation Test {unique_id}"
    company_name_updated = f"Acme Validation Test Updated {unique_id}"
    company_email = f"tester-{unique_id}@acmee2e.com"
    company_email_updated = f"tester-updated-{unique_id}@acmee2e.com"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])
        
        try:
            if os.path.exists(AUTH_FILE):
                print("Loading persistent session state...", flush=True)
                context = browser.new_context(storage_state=AUTH_FILE, no_viewport=True)
            else:
                print("No auth.json found. Starting fresh context...", flush=True)
                context = browser.new_context(no_viewport=True)
                
            page = context.new_page()

            # -------------------------------------------------------------
            # STEP 1: Add Company Form - Negative Tests
            # -------------------------------------------------------------
            print("\n[STEP 1] Navigating directly to Add Company screen...", flush=True)
            page.goto("http://localhost:19006/super-admin/companies/add-company")
            page.wait_for_load_state("domcontentloaded")
            time.sleep(4)

            # Test A: Save Empty Form
            print("Submitting empty form...", flush=True)
            page.locator('[data-testid="save-company-button"]').click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "add_company_validation_empty.png"))
            
            # Verify blocked redirect
            assert "add-company" in page.url, "Error: Empty form submission did not block redirect!"
            print("Successfully verified: Empty form save was blocked.", flush=True)

            # Test B: Invalid Email Validation
            print("Filling details with invalid email format...", flush=True)
            page.locator('[data-testid="company-name-input"]').fill(company_name)
            page.locator('[data-testid="owner-name-input"]').fill("Tester Owner")
            page.locator('[data-testid="company-email-input"]').fill("bademailformat")
            page.locator('[data-testid="company-mobile1-input"]').fill("9876543210")
            
            page.locator('[data-testid="save-company-button"]').click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "add_company_validation_invalid_email.png"))
            
            # Verify blocked redirect
            assert "add-company" in page.url, "Error: Invalid email submission did not block redirect!"
            print("Successfully verified: Invalid email save was blocked.", flush=True)

            # -------------------------------------------------------------
            # STEP 2: Add Company Form - Positive Test
            # -------------------------------------------------------------
            print("\n[STEP 2] Filling valid details for Add Company...", flush=True)
            page.locator('[data-testid="company-email-input"]').fill(company_email)
            
            # Select Category
            select_dropdown_option(page, "select-category-trigger", "")
            time.sleep(2)
            
            # Select Country
            select_dropdown_option(page, "select-country-trigger", "India")
            time.sleep(2)
            
            # Select State
            select_dropdown_option(page, "select-state-trigger", "Punjab")
            time.sleep(2)
            
            # Select City
            select_dropdown_option(page, "select-city-trigger", "")
            time.sleep(2)
            
            # Select Plan
            select_dropdown_option(page, "select-plan-trigger", "")
            time.sleep(2)

            print("Saving valid company details...", flush=True)
            page.locator('[data-testid="save-company-button"]').click()
            
            # Verify redirect to Menu Permissions screen
            print("Waiting for redirect to Menu Permissions page...", flush=True)
            page.wait_for_url("**/menu-permissions*", timeout=20000)
            time.sleep(3)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "add_company_success.png"))
            print("Successfully verified: Company added and redirected to menu permissions.", flush=True)
            
            # Extract companyId from URL
            current_url = page.url
            company_id = current_url.split("companyId=")[-1]
            print(f"Registered Company ID: {company_id}", flush=True)

            # -------------------------------------------------------------
            # STEP 3: Edit Company Form - Negative Tests
            # -------------------------------------------------------------
            # Navigate to Companies list first to populate history stack for router.back()
            print("\n[STEP 3] Navigating to Companies list page...", flush=True)
            page.goto("http://localhost:19006/super-admin/companies")
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector("text=Total records:", timeout=15000)
            time.sleep(3)

            # Use Search Toggle to open search bar and search for the company we just created
            print(f"Searching for company: {company_name}...", flush=True)
            page.locator('[data-testid="search-toggle-button"]').click()
            time.sleep(1)
            page.locator('[data-testid="companies-searchbar"]').fill(company_name)
            time.sleep(3) # Wait for debounce/fetch

            # Click the three dots menu button for the first row (index 0)
            print("Opening company options menu...", flush=True)
            page.locator('[data-testid="company-menu-button-0"]').click()
            time.sleep(1.5)

            # Click Edit from the popover menu items
            print("Clicking Edit from options...", flush=True)
            page.locator('[data-testid="edit-company-item-0"]').click()
            
            # Wait for edit company page to load
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector('[data-testid="company-name-input"]', timeout=15000)
            time.sleep(3)

            # Test A: Clear name (Required check)
            print("Clearing company name in edit form...", flush=True)
            page.locator('[data-testid="company-name-input"]').fill("")
            page.locator('[data-testid="save-company-button"]').click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "edit_company_validation_empty_name.png"))
            
            # Verify blocked redirect
            assert "edit-company" in page.url, "Error: Edit form empty name submission did not block redirect!"
            print("Successfully verified: Edit form empty name save was blocked.", flush=True)

            # Test B: Invalid email format
            print("Entering invalid email in edit form...", flush=True)
            page.locator('[data-testid="company-name-input"]').fill(company_name_updated)
            page.locator('[data-testid="company-email-input"]').fill("invalidupdateemail")
            page.locator('[data-testid="save-company-button"]').click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "edit_company_validation_invalid_email.png"))
            
            # Verify blocked redirect
            assert "edit-company" in page.url, "Error: Edit form invalid email submission did not block redirect!"
            print("Successfully verified: Edit form invalid email save was blocked.", flush=True)

            # -------------------------------------------------------------
            # STEP 4: Edit Company Form - Positive Test
            # -------------------------------------------------------------
            print("\n[STEP 4] Entering valid email in edit form...", flush=True)
            page.locator('[data-testid="company-email-input"]').fill(company_email_updated)
            
            print("Saving valid updated company details...", flush=True)
            page.locator('[data-testid="save-company-button"]').click()
            
            # Verify redirect back to Companies List page
            print("Waiting for list page to load...", flush=True)
            try:
                page.wait_for_selector("text=Total records:", timeout=15000)
                time.sleep(3)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "edit_company_success.png"))
                print("Successfully verified: Company edited and saved successfully.", flush=True)
            except Exception as redirect_err:
                print(f"Redirect timed out. Diagnosing page state...", flush=True)
                # Capture screenshots of top and bottom
                page.evaluate("window.scrollTo(0, 0)")
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "edit_company_timeout_top.png"))
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "edit_company_timeout_bottom.png"))
                
                # Print current inputs and errors
                details = page.evaluate("""() => {
                    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
                        placeholder: i.placeholder,
                        value: i.value,
                        testID: i.getAttribute('data-testid')
                    }));
                    return {
                        url: window.location.href,
                        inputs: inputs,
                        text: document.body.innerText
                    };
                }""")
                print(f"Page URL: {details['url']}", flush=True)
                print(f"Input values: {details['inputs']}", flush=True)
                # Strip non-ASCII characters for clean console printing on Windows
                clean_text = details['text'][:1000].encode('ascii', 'ignore').decode('ascii')
                print(f"Page Text Summary: {clean_text}", flush=True)
                raise redirect_err

            browser.close()
            duration = time.time() - start_time
            log_test_result("test_companies_form_validation", duration, "Passed")
        except Exception as e:
            browser.close()
            duration = time.time() - start_time
            print(f"Form validation E2E check failed: {e}", flush=True)
            log_test_result("test_companies_form_validation", duration, "Failed", str(e))

if __name__ == "__main__":
    run_test()
