const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const context = fs.readFileSync(path.join(root, "contexts/LanguageContext.tsx"), "utf8");
const vi = JSON.parse(fs.readFileSync(path.join(root, "locales/vi.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(root, "locales/en.json"), "utf8"));

assert.match(context, /export type Language = "vi" \| "en"/);
assert.match(context, /toggleLanguage: \(\) => Promise<void>/);
assert.match(context, /const nextLang = languageRef\.current === "vi" \? "en" : "vi"/);
assert.match(context, /await AsyncStorage\.setItem\(STORAGE_KEY, next\)/);
assert.doesNotMatch(context, /setItem\(FALLBACK_KEY/);
assert.match(context, /export const useTranslation = useLanguage/);
assert.deepEqual(Object.keys(en).sort(), Object.keys(vi).sort());

console.log("Mobile i18n contract verified.");
