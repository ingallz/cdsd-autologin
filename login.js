import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';

const URL = 'https://net.cdsdservice.com/connect/PortalMain';
const KEYCHAIN_SERVICE = 'cdsd-autologin';
const AFTER_LOGIN_WAIT_MS = 5_000;

function readKeychain() {
  const out = execFileSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const user = out.match(/"acct"<blob>="(.*)"/)?.[1];
  const pass = execFileSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'], { encoding: 'utf8' }).trim();
  if (!user || !pass) throw new Error(`Keychain item "${KEYCHAIN_SERVICE}" missing account or password`);
  return { user, pass };
}

async function main() {
  const { user, pass } = readKeychain();
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const form = page.locator('#LoginUserPassword_auth_username');
    if (!(await form.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false))) {
      console.log(new Date().toISOString(), 'no login form, already connected?');
      return;
    }
    await form.fill(user);
    await page.fill('#LoginUserPassword_auth_password', pass);
    await page.click('#UserCheck_Login_Button', { timeout: 5_000 });
    await page.waitForTimeout(AFTER_LOGIN_WAIT_MS);
    const error = (await page.locator('#LoginUserPassword_error_message').innerText({ timeout: 1_000 }).catch(() => '')).trim();
    if (error) throw new Error(`portal error: ${error}`);
    console.log(new Date().toISOString(), 'login OK');
  } finally {
    // ponytail: close() has been seen hanging on this portal; cap it, process.exit makes Playwright kill Chrome anyway
    await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 3_000))]);
  }
}

main().then(
  () => process.exit(0),
  (e) => { console.error(new Date().toISOString(), 'login FAILED:', e.message); process.exit(1); },
);
