import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

URL = "https://net.cdsdservice.com/connect/PortalMain"
AFTER_LOGIN_WAIT_MS = 5_000


def now():
    return datetime.now(timezone.utc).isoformat()


def load_env(path):
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"\x27"))


def login(user, password):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(URL, wait_until="domcontentloaded", timeout=60_000)
            form = page.locator("#LoginUserPassword_auth_username")
            try:
                form.wait_for(state="visible", timeout=15_000)
            except PlaywrightTimeout:
                print(now(), "no login form, already connected?")
                return
            form.fill(user)
            page.fill("#LoginUserPassword_auth_password", password)
            page.click("#UserCheck_Login_Button", timeout=5_000)
            page.wait_for_timeout(AFTER_LOGIN_WAIT_MS)
            try:
                error = page.locator("#LoginUserPassword_error_message").inner_text(timeout=1_000).strip()
            except PlaywrightTimeout:
                error = ""
            if error:
                raise RuntimeError(f"portal error: {error}")
            print(now(), "login OK")
        finally:
            browser.close()


def main():
    load_env(Path(__file__).with_name(".env"))
    user, password = os.environ.get("CDSD_USER"), os.environ.get("CDSD_PASS")
    if not user or not password:
        raise RuntimeError("CDSD_USER / CDSD_PASS missing (set in .env)")
    login(user, password)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(now(), "login FAILED:", e, file=sys.stderr)
        sys.exit(1)
