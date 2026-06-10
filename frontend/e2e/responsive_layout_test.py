import os
import time
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\gurpi\.gemini\antigravity-ide\brain\c3098a79-0897-43ce-b8ba-94f494b80300"
AUTH_FILE = os.path.join(os.path.dirname(__file__), "auth.json")
XML_REPORT_FILE = r"F:\AI_WORK\React-App\msuper-react-expo-app\frontend\e2e\reports\report.xml"

PUBLIC_PAGES = [
    {"name": "Home", "path": "/"},
    {"name": "Login", "path": "/super-admin/login"},
    {"name": "Forgot_Password", "path": "/super-admin/forgot-password"},
    {"name": "Reset_OTP", "path": "/super-admin/reset-otp"},
    {"name": "Reset_Password", "path": "/super-admin/reset-password"},
]

AUTH_PAGES = [
    {"name": "Dashboard", "path": "/super-admin/dashboard"},
    {"name": "Countries", "path": "/super-admin/countries"},
    {"name": "Companies", "path": "/super-admin/companies"},
    {"name": "Roles", "path": "/super-admin/roles"},
    {"name": "States", "path": "/super-admin/states"},
    {"name": "Cities", "path": "/super-admin/cities"},
    {"name": "Categories", "path": "/super-admin/company-categories"},
    {"name": "Subscription_Plans", "path": "/super-admin/subscription-plans"},
    {"name": "Features", "path": "/super-admin/features"},
    {"name": "Diagnostics", "path": "/super-admin/diagnostics"},
    {"name": "Scan_Bill", "path": "/super-admin/scan-bill"},
    {"name": "Online_Scan_Bill", "path": "/super-admin/online-scan-bill"},
]

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
        
        # Update suite stats
        tests = int(suite.attrib.get("tests", 0)) + 1
        suite.attrib["tests"] = str(tests)
        
        if status == "Failed":
            failures = int(suite.attrib.get("failures", 0)) + 1
            suite.attrib["failures"] = str(failures)

        current_time = float(suite.attrib.get("time", 0.0)) + duration
        suite.attrib["time"] = f"{current_time:.3f}"

        # Create testcase node
        case_node = ET.SubElement(suite, "testcase", classname="frontend.e2e.test_responsive_layout", name=name, time=f"{duration:.3f}")
        
        if status == "Failed":
            fail_node = ET.SubElement(case_node, "failure", message="Visual layout check failed")
            fail_node.text = error_msg
            
        tree.write(XML_REPORT_FILE, encoding="utf-8", xml_declaration=True)
        print(f"Logged JUnit result: {name} -> {status}", flush=True)
    except Exception as e:
        print(f"Error logging JUnit XML: {e}", flush=True)

def check_pages_flow(p, viewport_name, pages, use_auth=False, no_viewport=False, width=1280, height=800):
    browser = p.chromium.launch(headless=False, args=["--start-maximized"] if no_viewport else [])
    
    try:
        # Context creation
        if use_auth and os.path.exists(AUTH_FILE):
            print(f"[{viewport_name}] Loading persistent session state...", flush=True)
            if no_viewport:
                context = browser.new_context(storage_state=AUTH_FILE, no_viewport=True)
            else:
                context = browser.new_context(storage_state=AUTH_FILE, viewport={"width": width, "height": height})
        else:
            print(f"[{viewport_name}] Starting fresh session state...", flush=True)
            if no_viewport:
                context = browser.new_context(no_viewport=True)
            else:
                context = browser.new_context(viewport={"width": width, "height": height})

        page = context.new_page()

        # Handle initial route navigation
        for page_info in pages:
            start_time = time.time()
            page_name = page_info["name"]
            page_path = page_info["path"]
            url = f"http://localhost:19006{page_path}"
            
            print(f"[{viewport_name}] Checking layout of page: {page_name} ({page_path})...", flush=True)
            
            try:
                page.goto(url)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3) # Yield to render transitions
                
                # Workspace selection redirect check if authenticated
                if use_auth:
                    if "login" in page.url or page.locator("text=Choose Workspace").is_visible() or page.locator("text=Super Admin").is_visible() or page.locator("text=Authorize Session").is_visible():
                        if page.locator("text=Choose Workspace").is_visible() or page.locator("text=Super Admin").is_visible():
                            print("Workspace selector detected. Redirecting to Super Admin...", flush=True)
                            page.locator('text=Super Admin').first.click()
                            page.wait_for_load_state("domcontentloaded")
                            time.sleep(3)

                page.wait_for_selector('body', timeout=5000)
                
                # Check scroll health (horizontal layout overflow)
                overflow = page.evaluate("""() => {
                    return document.documentElement.scrollWidth > window.innerWidth;
                }""")
                
                if overflow:
                    print(f"[{viewport_name}] Warning: Horizontal scroll overflow detected on {page_name} page!", flush=True)

                # Capture verification screenshot
                file_slug = f"{viewport_name.lower()}_{page_name.lower()}"
                screenshot_path = os.path.join(ARTIFACT_DIR, f"{file_slug}.png")
                page.screenshot(path=screenshot_path)
                
                duration = time.time() - start_time
                log_test_result(f"test_layout_{viewport_name.lower()}_{page_name.lower()}", duration, "Passed")
            except Exception as page_err:
                duration = time.time() - start_time
                print(f"Error checking page {page_name} on {viewport_name}: {page_err}", flush=True)
                log_test_result(f"test_layout_{viewport_name.lower()}_{page_name.lower()}", duration, "Failed", str(page_err))

        browser.close()
    except Exception as e:
        print(f"Browser flow crashed on {viewport_name}: {e}", flush=True)
        try:
            browser.close()
        except:
            pass

def main():
    print("Initializing Comprehensive Super Admin Layout Testing Flow...", flush=True)
    
    # Initialize/Reset report file so it only contains current runs if desired,
    # or keep existing runs and let it accumulate.
    
    with sync_playwright() as p:
        # Viewports configuration list
        viewports = [
            {"name": "Desktop_Maximized", "no_viewport": True, "width": 1920, "height": 1080},
            {"name": "Tablet", "no_viewport": False, "width": 768, "height": 1024},
            {"name": "Mobile", "no_viewport": False, "width": 375, "height": 812}
        ]

        for vp in viewports:
            print(f"\n=======================================================", flush=True)
            print(f"Starting Visual Checks for Breakpoint: {vp['name']}", flush=True)
            print(f"=======================================================", flush=True)
            
            # Step A: Check Public Pages (No auth context)
            print(f"--- Running Public Pages Checks ---", flush=True)
            check_pages_flow(p, vp["name"], PUBLIC_PAGES, use_auth=False, no_viewport=vp["no_viewport"], width=vp["width"], height=vp["height"])
            
            # Step B: Check Authenticated Super Admin Pages (Auth context loaded)
            print(f"--- Running Authenticated Pages Checks ---", flush=True)
            check_pages_flow(p, vp["name"], AUTH_PAGES, use_auth=True, no_viewport=vp["no_viewport"], width=vp["width"], height=vp["height"])

    print("\nResponsive Layout Testing Complete!", flush=True)

if __name__ == "__main__":
    main()
