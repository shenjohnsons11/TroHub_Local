const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const context = fs.readFileSync(path.join(root, "contexts/LanguageContext.tsx"), "utf8");
const languageHelper = fs.readFileSync(path.join(root, "utils/language.ts"), "utf8");
const languageToggle = fs.readFileSync(path.join(root, "components/LanguageToggle.tsx"), "utf8");
const vi = JSON.parse(fs.readFileSync(path.join(root, "locales/vi.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(root, "locales/en.json"), "utf8"));

assert.match(languageHelper, /export type Language = "vi" \| "en"/);
assert.match(languageHelper, /export function normalizeLanguage/);
assert.match(languageHelper, /export function resolveLanguageTarget/);
assert.match(context, /changeLanguage: \(language\?: Language\) => Promise<void>/);
assert.match(context, /toggleLanguage: \(\) => Promise<void>/);
assert.match(context, /resolveLanguageTarget\(languageRef\.current, requested\)/);
assert.match(context, /await AsyncStorage\.setItem\(STORAGE_KEY, target\)/);
assert.doesNotMatch(context, /setItem\(FALLBACK_KEY/);
assert.match(context, /export const useTranslation = useLanguage/);
assert.match(languageToggle, /changeLanguage\(option\.value\)/);
assert.deepEqual(Object.keys(en).sort(), Object.keys(vi).sort());

console.log("Mobile i18n contract verified.");
