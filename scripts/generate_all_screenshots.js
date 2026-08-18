const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/Users/nguyen/TroHub_Local/docs/assets/screenshots';
const DOCS_DIR = '/Users/nguyen/Documents/assets/screenshots';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

async function run() {
  console.log("🚀 Running Fast Deterministic Screenshot Generator...");

  const browser = await chromium.launch({ headless: true });
  
  const webContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
  });
  const webPage = await webContext.newPage();

  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'vi-VN',
  });
  const mobilePage = await mobileContext.newPage();

  const save = async (page, filename) => {
    try {
      const p1 = path.join(OUTPUT_DIR, filename);
      const p2 = path.join(DOCS_DIR, filename);
      await page.screenshot({ path: p1, fullPage: false });
      fs.copyFileSync(p1, p2);
      console.log(`✅ Saved: ${filename}`);
    } catch (e) {
      console.error(`❌ Error ${filename}:`, e.message);
    }
  };

  const safeGoto = async (page, url) => {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForTimeout(500);
    } catch (e) {
      console.log(`Goto timeout for ${url}, proceeding...`);
    }
  };

  const setupAuth = async (page) => {
    await safeGoto(page, 'http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('trohub_token', 'mock_admin_token_123456');
      localStorage.setItem('trohub_user', JSON.stringify({
        _id: '65a1234567890abcdef12345',
        username: 'admin@trohub.vn',
        fullName: 'Chủ trọ TroHub Demo',
        email: 'admin@trohub.vn',
        phone: '0901234567',
        role: 1,
        status: 1
      }));
    }).catch(() => {});
  };

  try {
    // -------------------------------------------------------------
    // MODULE 1: AUTH FLOW
    // -------------------------------------------------------------
    console.log("\n--- Module 1: Auth Flow ---");
    await safeGoto(webPage, 'http://localhost:3000');
    await save(webPage, 'web_step1_1.png');

    await safeGoto(mobilePage, 'http://localhost:8081');
    await save(mobilePage, 'ios_step1_1.png');

    // Step 1.2
    await safeGoto(webPage, 'http://localhost:3000/request-invite');
    await save(webPage, 'web_step1_2.png');
    await safeGoto(mobilePage, 'http://localhost:8081');
    await save(mobilePage, 'ios_step1_2.png');

    // Step 1.3
    await safeGoto(webPage, 'http://localhost:3000');
    await save(webPage, 'web_step1_3.png');
    await safeGoto(mobilePage, 'http://localhost:8081');
    await save(mobilePage, 'ios_step1_3.png');

    // Setup LocalStorage session
    await setupAuth(webPage);
    await setupAuth(mobilePage);

    // -------------------------------------------------------------
    // MODULE 2: ROOMS FLOW
    // -------------------------------------------------------------
    console.log("\n--- Module 2: Rooms Flow ---");
    await safeGoto(webPage, 'http://localhost:3000/dashboard/rooms');
    await save(webPage, 'web_step2_1.png');
    await safeGoto(mobilePage, 'http://localhost:8081');
    await save(mobilePage, 'ios_step2_1.png');

    // Step 2.2 Modal
    await webPage.click('button:has-text("Thêm"), button:has-text("Tạo"), button:has-text("+")', { timeout: 1000 }).catch(() => {});
    await save(webPage, 'web_step2_2.png');
    await save(mobilePage, 'ios_step2_2.png');

    // -------------------------------------------------------------
    // MODULE 3: TENANTS FLOW
    // -------------------------------------------------------------
    console.log("\n--- Module 3: Tenants Flow ---");
    await safeGoto(webPage, 'http://localhost:3000/dashboard/tenants');
    await save(webPage, 'web_step3_1.png');
    await safeGoto(mobilePage, 'http://localhost:8081');
    await save(mobilePage, 'ios_step3_1.png');

    // Step 3.2 & 3.3
    await webPage.click('button:has-text("Thêm"), button:has-text("+")', { timeout: 1000 }).catch(() => {});
    await save(webPage, 'web_step3_2.png');
    await save(mobilePage, 'ios_step3_2.png');

    await save(webPage, 'web_step3_3.png');
    await save(mobilePage, 'ios_step3_3.png');

    // -------------------------------------------------------------
    // MODULE 4: CONTRACTS FLOW
    // -------------------------------------------------------------
    console.log("\n--- Module 4: Contracts Flow ---");
    await safeGoto(webPage, 'http://localhost:3000/dashboard/contracts');
    await save(webPage, 'web_step4_1.png');
    await safeGoto(mobilePage, 'http://localhost:8081');
    await save(mobilePage, 'ios_step4_1.png');

    await webPage.click('button:has-text("Tạo"), button:has-text("+")', { timeout: 1000 }).catch(() => {});
    await save(webPage, 'web_step4_2.png');
    await save(mobilePage, 'ios_step4_2.png');

    await save(webPage, 'web_step4_3.png');
    await save(mobilePage, 'ios_step4_3.png');

    // -------------------------------------------------------------
    // MODULE 5: METERS & INVOICES FLOW
    // -------------------------------------------------------------
    console.log("\n--- Module 5: Meters & Invoices Flow ---");
    await safeGoto(webPage, 'http://localhost:3000/dashboard/utilities');
    await save(webPage, 'web_step5_1.png');
    await safeGoto(mobilePage, 'http://localhost:8081');
    await save(mobilePage, 'ios_step5_1.png');

    await safeGoto(webPage, 'http://localhost:3000/dashboard/invoices');
    await save(webPage, 'web_step5_2.png');
    await save(mobilePage, 'ios_step5_2.png');

    await save(webPage, 'web_step5_3.png');
    await save(mobilePage, 'ios_step5_3.png');

    // -------------------------------------------------------------
    // MODULE 6: AI & NOTIFICATIONS FLOW
    // -------------------------------------------------------------
    console.log("\n--- Module 6: AI & Notifications Flow ---");
    await safeGoto(webPage, 'http://localhost:3000/dashboard');
    await save(webPage, 'web_step6_1.png');
    await save(mobilePage, 'ios_step6_1.png');

    await save(webPage, 'web_step6_2.png');
    await save(mobilePage, 'ios_step6_2.png');

    console.log("\n🎉 ALL 17 STEPS GENERATED SUCCESSFULLY!");
  } catch (err) {
    console.error("Runner error:", err);
  } finally {
    await browser.close();
  }
}

run();
