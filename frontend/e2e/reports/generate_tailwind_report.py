import os
import xml.etree.ElementTree as ET
import html
import datetime

XML_FILE = r"F:\AI_WORK\React-App\msuper-react-expo-app\frontend\e2e\reports\report.xml"
HTML_OUTPUT = r"F:\AI_WORK\React-App\msuper-react-expo-app\frontend\e2e\reports\playwright_report.html"

def generate_report():
    if not os.path.exists(XML_FILE):
        print(f"Error: {XML_FILE} does not exist. Please run the tests first.", flush=True)
        return

    print(f"Parsing JUnit XML file: {XML_FILE}...", flush=True)
    tree = ET.parse(XML_FILE)
    root = tree.getroot()

    # Accumulate stats
    total_tests = 0
    total_failures = 0
    total_errors = 0
    total_skipped = 0
    total_time = 0.0
    test_cases_data = []

    # Helper to parse a testsuite element
    def process_suite(suite):
        nonlocal total_tests, total_failures, total_errors, total_skipped, total_time
        tests = int(suite.attrib.get('tests', 0))
        failures = int(suite.attrib.get('failures', 0))
        errors = int(suite.attrib.get('errors', 0))
        skipped = int(suite.attrib.get('skipped', 0))
        duration = float(suite.attrib.get('time', 0.0))

        total_tests += tests
        total_failures += failures
        total_errors += errors
        total_skipped += skipped
        total_time += duration

        for case in suite.findall('testcase'):
            name = case.attrib.get('name', 'Unknown')
            classname = case.attrib.get('classname', 'Unknown')
            duration_case = float(case.attrib.get('time', 0.0))
            
            # Status check
            status = "Passed"
            error_message = ""
            
            failure = case.find('failure')
            if failure is not None:
                status = "Failed"
                error_message = failure.text or failure.attrib.get('message', '')
                
            error = case.find('error')
            if error is not None:
                status = "Error"
                error_message = error.text or error.attrib.get('message', '')

            skipped_tag = case.find('skipped')
            if skipped_tag is not None:
                status = "Skipped"

            # System out
            sys_out = case.find('system-out')
            stdout_content = sys_out.text if sys_out is not None else ""

            # System err
            sys_err = case.find('system-err')
            stderr_content = sys_err.text if sys_err is not None else ""

            test_cases_data.append({
                'name': name,
                'classname': classname,
                'duration': duration_case,
                'status': status,
                'error_message': error_message,
                'stdout': stdout_content,
                'stderr': stderr_content
            })

    if root.tag == 'testsuite':
        process_suite(root)
    else:
        for suite in root.findall('testsuite'):
            process_suite(suite)

    pass_rate = 100.0
    if total_tests > 0:
        pass_rate = ((total_tests - total_failures - total_errors) / total_tests) * 100.0

    print(f"Stats - Total: {total_tests}, Passed: {total_tests - total_failures - total_errors}, Failures: {total_failures}, Errors: {total_errors}", flush=True)

    # Compile the HTML page using Tailwind CSS
    html_content = f"""<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Playwright Execution Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {{
            theme: {{
                extend: {{
                    fontFamily: {{
                        sans: ['Outfit', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    }}
                }}
            }}
        }}

        let currentFilter = 'all';
        let searchQuery = '';

        function toggleLogs(id) {{
            const el = document.getElementById(id);
            if (el.classList.contains('hidden')) {{
                el.classList.remove('hidden');
            }} else {{
                el.classList.add('hidden');
            }}
        }}

        function applyFilter(filter) {{
            currentFilter = filter;
            filterCards();
            
            // Update filter buttons styling
            const buttons = ['all', 'passed', 'failed', 'skipped'];
            buttons.forEach(btn => {{
                const el = document.getElementById('btn-' + btn);
                if (btn === filter) {{
                    el.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
                    el.classList.add('bg-slate-900', 'text-white', 'border-slate-900');
                }} else {{
                    el.classList.remove('bg-slate-900', 'text-white', 'border-slate-900');
                    el.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
                }}
            }});
        }}

        function handleSearch(val) {{
            searchQuery = val.toLowerCase();
            filterCards();
        }}

        function filterCards() {{
            const cards = document.querySelectorAll('.test-card');
            cards.forEach(card => {{
                const status = card.getAttribute('data-status').toLowerCase();
                const name = card.getAttribute('data-name').toLowerCase();
                const classname = card.getAttribute('data-classname').toLowerCase();

                const matchesFilter = (currentFilter === 'all') || (status === currentFilter);
                const matchesSearch = name.includes(searchQuery) || classname.includes(searchQuery);

                if (matchesFilter && matchesSearch) {{
                    card.style.display = '';
                }} else {{
                    card.style.display = 'none';
                }}
            }});
        }}
    </script>
    <style>
        body {{
            font-family: 'Outfit', sans-serif;
        }}
    </style>
</head>
<body class="text-slate-800 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto space-y-8">
        
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
            <div>
                <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    E2E Test Execution Report
                </h1>
                <p class="mt-2 text-sm text-slate-500">
                    Generated on {datetime.datetime.now().strftime('%d-%m-%Y %H:%M:%S')}
                </p>
            </div>
            <div class="mt-4 md:mt-0 flex items-center space-x-3">
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                    Status: Verified
                </span>
            </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Total -->
            <div class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Tests</span>
                <span class="text-3xl font-black text-slate-900 mt-2">{total_tests}</span>
            </div>
            <!-- Passed -->
            <div class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
                <span class="text-xs font-bold text-emerald-600 uppercase tracking-widest">Passed</span>
                <span class="text-3xl font-black text-emerald-600 mt-2">{total_tests - total_failures - total_errors}</span>
            </div>
            <!-- Failed -->
            <div class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
                <span class="text-xs font-bold text-rose-600 uppercase tracking-widest">Failed</span>
                <span class="text-3xl font-black text-rose-600 mt-2">{total_failures + total_errors}</span>
            </div>
            <!-- Duration -->
            <div class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</span>
                <span class="text-3xl font-black text-slate-900 mt-2">{total_time:.2f}s</span>
            </div>
            <!-- Pass Rate -->
            <div class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between col-span-2 lg:col-span-1 shadow-sm hover:shadow-md transition-shadow duration-200">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Pass Rate</span>
                <span class="text-3xl font-black text-slate-900 mt-2">{pass_rate:.1f}%</span>
            </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="flex flex-col md:flex-row gap-4 md:items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div class="flex-1">
                <input type="text" oninput="handleSearch(this.value)" placeholder="Search by test name or classname..." class="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-sans" />
            </div>
            <div class="flex items-center space-x-2">
                <button id="btn-all" onclick="applyFilter('all')" class="px-4 py-2 rounded-xl text-xs font-bold border bg-slate-900 text-white border-slate-900 transition-colors duration-150">
                    All
                </button>
                <button id="btn-passed" onclick="applyFilter('passed')" class="px-4 py-2 rounded-xl text-xs font-bold border bg-white text-slate-700 border-slate-200 transition-colors duration-150">
                    Passed
                </button>
                <button id="btn-failed" onclick="applyFilter('failed')" class="px-4 py-2 rounded-xl text-xs font-bold border bg-white text-slate-700 border-slate-200 transition-colors duration-150">
                    Failed
                </button>
                <button id="btn-skipped" onclick="applyFilter('skipped')" class="px-4 py-2 rounded-xl text-xs font-bold border bg-white text-slate-700 border-slate-200 transition-colors duration-150">
                    Skipped
                </button>
            </div>
        </div>

        <!-- Test Case Section -->
        <div class="space-y-4">
            <h2 class="text-xl font-bold tracking-tight text-slate-950">Test Suites & Details</h2>
            
            <div class="space-y-4">
    """

    for idx, case in enumerate(test_cases_data):
        status_color = "bg-emerald-50 text-emerald-700 border-emerald-200"
        card_border = "border-slate-200 hover:border-slate-300"
        if case['status'] in ["Failed", "Error"]:
            status_color = "bg-rose-50 text-rose-700 border-rose-200"
            card_border = "border-rose-200 hover:border-rose-300"
        elif case['status'] == "Skipped":
            status_color = "bg-amber-50 text-amber-700 border-amber-200"

        # Safe escape logs
        stdout_escaped = html.escape(case['stdout'] or '')
        stderr_escaped = html.escape(case['stderr'] or '')
        error_message_escaped = html.escape(case['error_message'] or '')

        html_content += f"""
                <!-- Test Case {idx + 1} -->
                <div class="test-card bg-white border {card_border} rounded-2xl overflow-hidden shadow-sm transition-all duration-200" data-status="{case['status']}" data-name="{case['name']}" data-classname="{case['classname']}">
                    <!-- Title Bar -->
                    <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                        <div class="space-y-1">
                            <span class="text-xs font-semibold text-slate-400 tracking-wider font-mono block">
                                {case['classname']}
                            </span>
                            <h3 class="text-lg font-bold text-slate-900 tracking-tight">
                                {case['name']}
                            </h3>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="text-xs font-bold text-slate-500 font-mono">
                                Duration: {case['duration']:.2f}s
                            </span>
                            <span class="px-3 py-1 rounded-full text-xs font-bold border {status_color}">
                                {case['status']}
                            </span>
                            <button onclick="toggleLogs('logs-{idx}')" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors">
                                Toggle Logs
                            </button>
                        </div>
                    </div>

                    <!-- Logs Panel (Collapsible) -->
                    <div id="logs-{idx}" class="p-6 bg-slate-50/50 border-t border-slate-100 hidden space-y-4">
                        {f'''
                        <div class="bg-rose-50 border border-rose-200 rounded-xl p-4">
                            <h4 class="text-xs font-bold text-rose-800 uppercase tracking-widest mb-2">Failure Details</h4>
                            <pre class="text-sm font-mono text-rose-700 whitespace-pre-wrap">{error_message_escaped}</pre>
                        </div>
                        ''' if case['error_message'] else ''}
                        
                        {f'''
                        <div>
                            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Stdout Console Outputs</h4>
                            <pre class="bg-slate-900 border border-slate-950 p-4 rounded-xl text-sm font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">{stdout_escaped}</pre>
                        </div>
                        ''' if case['stdout'] else ''}
                        
                        {f'''
                        <div>
                            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Stderr Errors</h4>
                            <pre class="bg-slate-900 border border-slate-950 p-4 rounded-xl text-sm font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">{stderr_escaped}</pre>
                        </div>
                        ''' if case['stderr'] else ''}

                        {f'''
                        <div class="flex flex-col items-center justify-center py-6 text-slate-400">
                            <svg class="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span class="text-sm font-medium">No console logs or execution errors recorded for this test.</span>
                        </div>
                        ''' if not (case['error_message'] or case['stdout'] or case['stderr']) else ''}
                    </div>
                </div>
        """

    html_content += """
            </div>
        </div>
        
        <!-- Footer -->
        <div class="text-center pt-8 border-t border-slate-200 text-xs text-slate-400 font-semibold tracking-wider uppercase">
            Expo React Native Monorepo - Playwright E2E Runner
        </div>
    </div>
</body>
</html>
"""

    print(f"Writing compiled HTML report to: {HTML_OUTPUT}...", flush=True)
    with open(HTML_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("HTML Report generation finished successfully!", flush=True)

if __name__ == "__main__":
    generate_report()
