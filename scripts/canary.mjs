// Production canary: loads the live site in headless Chromium and checks it's actually
// serving a working app, not a blank shell, a stale cached build, or a broken deploy.
// Run: node scripts/canary.mjs
// On failure, writes canary-failure.png + canary-failure.txt for the workflow to pick up.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { CLUBS } from "../data.js";

const SITE = "https://gibsonstats.com";
const TIMEOUT = 20000;
const SCREENSHOT_PATH = "canary-failure.png";
const DETAIL_PATH = "canary-failure.txt";

// Any current top-flight club name is enough — proves real table data rendered, without
// pinning to one club that could get relegated or renamed later.
const CLUB_NAMES = Object.entries(CLUBS).filter(([code]) => code !== "GLV").map(([, c]) => c.name);

async function fail(step, detail, page) {
  console.error(`CANARY FAILED at "${step}": ${detail}`);
  try {
    if (page) await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  } catch (e) {
    console.error("(also failed to capture screenshot: " + e.message + ")");
  }
  writeFileSync(
    DETAIL_PATH,
    [
      `Production canary failed`,
      `Time: ${new Date().toISOString()}`,
      `Site: ${SITE}`,
      `Step: ${step}`,
      `Detail: ${detail}`,
    ].join("\n") + "\n"
  );
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(err.message || String(err)));

try {
  // 1. Home page loads and the build stamp is present in the DOM — proves the current
  //    bundle actually mounted (not a blank shell, not a stuck old cache).
  await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
  const stamp = page.locator('[data-testid="gibson-build-stamp"]');
  await stamp.waitFor({ state: "attached", timeout: TIMEOUT });
  const stampText = await stamp.textContent();
  if (!stampText || !stampText.startsWith("GIBSON-BUILD:")) {
    await fail("build stamp", `expected text starting "GIBSON-BUILD:", got ${JSON.stringify(stampText)}`, page);
  }

  // 2. A real club name renders in the table — proves real content, not just chrome.
  await page.goto(`${SITE}/table`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
  await page.waitForSelector('[data-testid="gibson-build-stamp"]', { state: "attached", timeout: TIMEOUT });
  const bodyText = await page.locator("body").innerText();
  if (!CLUB_NAMES.some((name) => bodyText.includes(name))) {
    await fail("table content", `no known club name (${CLUB_NAMES.join(", ")}) found on /table`, page);
  }

  // 3. No uncaught page errors across either navigation.
  if (pageErrors.length > 0) {
    await fail("page errors", `${pageErrors.length} uncaught page error(s): ${pageErrors.join(" | ")}`, page);
  }

  console.log(`CANARY OK — ${SITE} is live, build stamp present, table content renders, no page errors.`);
} catch (err) {
  await fail("unexpected exception", err.message || String(err), page);
} finally {
  await browser.close();
}
