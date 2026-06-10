import os
import time
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth.json")
XML_REPORT_FILE = r"F:\AI_WORK\React-App\msuper-react-expo-app\frontend\e2e\reports\report.xml"

def log_test_result(name, duration, status, error_msg=""):
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

        case_node = ET.SubElement(suite, "testcase", classname="frontend.e2e.test_companies_verification", name=name, time=f"{duration:.3f}")
        
        if status == "Failed":
            fail_node = ET.SubElement(case_node, "failure", message="Verification check failed")
            fail_node.text = error_msg
            
        tree.write(XML_REPORT_FILE, encoding="utf-8", xml_declaration=True)
        print(f"Logged JUnit result: {name} -> {status}", flush=True)
    except Exception as e:
        print(f"Error logging JUnit XML: {e}", flush=True)

def select_dropdown_option(page, trigger_testid, search_term):
    page.locator(f'[data-testid="{trigger_testid}"]').click()
    time.sleep(1.5)
    if search_term:
        page.locator('[data-testid="selector-search-input"]').fill(search_term)
        time.sleep(1.5)
    page.locator('[data-testid^="select-option-"]').first.click()
    time.sleep(1.5)

def run_test():
    start_time = time.time()
    unique_id = int(time.time())
    company_name = f"Verify Test Company {unique_id}"
    company_email = f"verify-{unique_id}@companye2e.com"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])
        
        try:
            if os.path.exists(AUTH_FILE):
                context = browser.new_context(storage_state=AUTH_FILE, no_viewport=True)
            else:
                context = browser.new_context(no_viewport=True)
                
            page = context.new_page()

            # -------------------------------------------------------------
            # STEP 1: Add Company Form
            # -------------------------------------------------------------
            print("\n[STEP 1] Navigating to Add Company...", flush=True)
            page.goto("http://localhost:19006/super-admin/companies/add-company")
            page.wait_for_load_state("domcontentloaded")
            time.sleep(4)

            page.locator('[data-testid="company-name-input"]').fill(company_name)
            page.locator('[data-testid="owner-name-input"]').fill("Verify Tester")
            page.locator('[data-testid="company-email-input"]').fill(company_email)
            page.locator('[data-testid="company-mobile1-input"]').fill("9876543210")
            
            select_dropdown_option(page, "select-category-trigger", "")
            select_dropdown_option(page, "select-country-trigger", "India")
            select_dropdown_option(page, "select-state-trigger", "Punjab")
            select_dropdown_option(page, "select-city-trigger", "")
            select_dropdown_option(page, "select-plan-trigger", "")

            page.locator('[data-testid="save-company-button"]').click()
            page.wait_for_url("**/menu-permissions*", timeout=20000)
            time.sleep(3)
            
            # -------------------------------------------------------------
            # STEP 2: Navigate back to list, search and trigger verification
            # -------------------------------------------------------------
            print("\n[STEP 2] Navigating to Companies registry...", flush=True)
            page.goto("http://localhost:19006/super-admin/companies")
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector("text=Total records:", timeout=15000)
            time.sleep(3)

            print(f"Searching for company: {company_name}...", flush=True)
            page.locator('[data-testid="search-toggle-button"]').click()
            time.sleep(1)
            page.locator('[data-testid="companies-searchbar"]').fill(company_name)
            time.sleep(3)

            # Trigger Verification Email
            print("Opening option menu...", flush=True)
            page.locator('[data-testid="company-menu-button-0"]').click()
            time.sleep(1.5)

            print("Clicking 'Verify Email'...", flush=True)
            page.locator('[data-testid="verify-email-item-0"]').click()
            
            # Wait for verification dialog
            page.wait_for_selector('[data-testid="verification-dialog"]', timeout=15000)
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "verification_dialog_opened.png"))

            # Test A: Negative Check (Invalid OTP)
            print("Entering invalid 6-digit OTP...", flush=True)
            page.locator('[data-testid="verification-otp-input"]').fill("000000")
            page.locator('[data-testid="confirm-verification-button"]').click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "verification_invalid_otp_error.png"))
            assert page.locator('[data-testid="verification-dialog"]').is_visible(), "Error: Invalid OTP verification closed the modal!"
            print("Successfully verified: Invalid OTP does not verify email.", flush=True)

            # Get generated OTP from backend console logs (in dev mode, default placeholder, or we can look it up in Redis)
            # Since Redis Client is accessible on localhost in our workspace, we can fetch it directly!
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            
            # We need to find the company ID
            # Let's inspect the page or query redis keys matching `company:verify:*`
            keys = r.keys("company:verify:*")
            otp_val = None
            for key in keys:
                if not key.endswith(":cooldown"):
                    otp_val = r.get(key)
                    break
            
            if not otp_val:
                # Fallback to dev mode default OTP if redis client isn't fully configured
                print("Could not retrieve OTP from Redis. Check configuration.", flush=True)
                otp_val = "123456" # fallback default placeholder mock
            
            print(f"Found OTP value: {otp_val}", flush=True)

            # Test B: Positive Check (Valid OTP)
            print("Entering correct OTP...", flush=True)
            page.locator('[data-testid="verification-otp-input"]').fill(otp_val)
            page.locator('[data-testid="confirm-verification-button"]').click()
            
            time.sleep(4)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "verification_success.png"))
            assert not page.locator('[data-testid="verification-dialog"]').is_visible(), "Error: Verification dialog is still visible!"
            print("Successfully verified: Valid OTP verified company email successfully.", flush=True)

            browser.close()
            duration = time.time() - start_time
            log_test_result("test_company_email_verification_flow", duration, "Passed")
        except Exception as e:
            browser.close()
            duration = time.time() - start_time
            print(f"Verification E2E flow failed: {e}", flush=True)
            log_test_result("test_company_email_verification_flow", duration, "Failed", str(e))

if __name__ == "__main__":
    run_test()
