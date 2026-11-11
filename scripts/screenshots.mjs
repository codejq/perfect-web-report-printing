// Generates the README/docs screenshots (docs/images/*.jpg) and example PDFs (output/).
//
//   npm run screenshots        build the React example, then screenshots + PDFs
//   npm run pdf                PDFs only
//
// Uses the locally installed Google Chrome (channel "chrome"), so no browser
// download is needed. Set PW_CHANNEL="" to use Playwright's bundled Chromium
// instead (after `npx playwright install chromium`).
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (rel) => pathToFileURL(path.join(root, rel)).href;
const img = (name) => path.join(root, "docs", "images", name);
const pdfOnly = process.argv.includes("--pdf-only");
const channel = process.env.PW_CHANNEL ?? "chrome";

await mkdir(path.join(root, "docs", "images"), { recursive: true });
await mkdir(path.join(root, "output"), { recursive: true });

const browser = await chromium.launch(channel ? { channel } : {});

async function open(rel, { width = 1100, height = 1250, scale = 1 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  await page.goto(url(rel), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelectorAll(".lh-sheet").length > 0);
  await page.waitForTimeout(300); // let a debounced re-pagination settle
  return { page, context };
}

// lay all sheets out side by side for an overview picture
async function overview(page) {
  await page.addStyleTag({
    content: `
      .lh-root.lh-paged > .lh-pages { display: flex !important; flex-wrap: wrap; gap: 10mm;
        justify-content: center; padding: 10mm !important; }
      .lh-sheet { margin: 0 !important; }
      .lh-settings { display: none !important; }`,
  });
  await page.waitForTimeout(100);
}

async function pdf(rel, out) {
  const { page, context } = await open(rel);
  await page.pdf({ path: path.join(root, "output", out), preferCSSPageSize: true, printBackground: true });
  console.log("pdf  ", "output/" + out);
  await context.close();
}

if (!pdfOnly) {
  // 2. All pages of the offer, side by side
  {
    const { page, context } = await open("examples/offer-ar.html", { width: 2900, height: 1400, scale: 0.5 });
    await overview(page);
    await page.locator(".lh-pages").screenshot({ path: img("pages-overview.jpg"), type: "jpeg", quality: 82 });
    console.log("image", "docs/images/pages-overview.jpg");
    await context.close();
  }

  // 3. Settings panel open, "show margins" on
  {
    const { page, context } = await open("examples/offer-ar.html");
    await page.click(".lh-settings-toggle");
    await page.check(".lh-settings input[type=checkbox]");
    await page.waitForTimeout(200);
    await page.screenshot({ path: img("settings-panel.jpg"), type: "jpeg", quality: 82 });
    console.log("image", "docs/images/settings-panel.jpg");
    await context.close();
  }

  // 4. Long table across pages, header row repeated (basic example)
  {
    const { page, context } = await open("examples/basic.html", { width: 2900, height: 1400, scale: 0.5 });
    await overview(page);
    await page.locator(".lh-pages").screenshot({ path: img("table-pages.jpg"), type: "jpeg", quality: 82 });
    console.log("image", "docs/images/table-pages.jpg");
    await context.close();
  }

  // 5. React example
  {
    const { page, context } = await open("examples/react/index.html");
    await page.screenshot({ path: img("react-example.jpg"), type: "jpeg", quality: 82 });
    console.log("image", "docs/images/react-example.jpg");
    await context.close();
  }
}

await pdf("examples/offer-ar.html", "offer-ar.pdf");
await pdf("examples/basic.html", "basic.pdf");
await pdf("examples/react/index.html", "react-example.pdf");

await browser.close();
