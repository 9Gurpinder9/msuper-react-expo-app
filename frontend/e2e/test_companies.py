import os
from companies_web_test import run_test

def test_companies_edit_and_permissions():
    """
    E2E test suite running the 5-company edit and menu permissions configuration flow.
    """
    print("Launching automated E2E Company list, edit and permissions verification loop...", flush=True)
    run_test()
