const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/Users/nguyen/TroHub_Local/docs/assets/screenshots';
const DOCS_DIR = '/Users/nguyen/Documents/assets/screenshots';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

async function run() {
  console.log("🚀 Capturing Mobile App Add Room Flow Screenshots...");

  const browser = await chromium.launch({ headless: true });
  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'vi-VN',
  });
  const page = await mobileContext.newPage();

  const save = async (filename) => {
    try {
      const p1 = path.join(OUTPUT_DIR, filename);
      const p2 = path.join(DOCS_DIR, filename);
      await page.screenshot({ path: p1, fullPage: false });
      fs.copyFileSync(p1, p2);
      console.log(`✅ Saved screenshot: ${filename}`);
    } catch (e) {
      console.error(`❌ Error saving ${filename}:`, e.message);
    }
  };

  try {
    // 1. Navigate to Expo Mobile Web
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Capture Photo 1: Room List screen with Add Room button
    await save('app_ios_step2_1_room_list.png');

    // 2. Click [+ Thêm phòng] button to open modal
    await page.click('button:has-text("Thêm phòng"), text=Thêm phòng, [aria-label*="Thêm"]', { timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(600);

    // Capture Photo 2: Form Modal open
    await save('app_ios_step2_2_add_room_modal_open.png');

    // 3. Fill sample data into form fields
    await page.fill('input[placeholder*="Mã"], input[placeholder*="Phòng"], input[name*="code"]', 'Phòng 301').catch(() => {});
    await page.fill('input[placeholder*="Tầng"]', '3').catch(() => {});
    await page.fill('input[placeholder*="Diện tích"]', '25').catch(() => {});
    await page.fill('input[placeholder*="Giá"], input[placeholder*="thuê"]', '4.500.000').catch(() => {});
    await page.fill('input[placeholder*="cọc"], input[placeholder*="Cọc"]', '4.500.000').catch(() => {});
    await page.waitForTimeout(500);

    // Capture Photo 3: Form Modal filled with sample data
    await save('app_ios_step2_3_add_room_filled.png');

    console.log("🎉 All 3 Mobile Add Room screenshots captured successfully!");
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    await browser.close();
  }
}

run();
