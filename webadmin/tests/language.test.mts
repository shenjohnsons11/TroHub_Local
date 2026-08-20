import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLanguage, resolveLanguageTarget } from "../src/lib/language.ts";

test("normalizes persisted language values to canonical lower-case codes", () => {
  assert.equal(normalizeLanguage("VI"), "vi");
  assert.equal(normalizeLanguage(" en "), "en");
  assert.equal(normalizeLanguage("fr"), null);
});

test("resolves both directions without depending on a stale UI label", () => {
  assert.equal(resolveLanguageTarget("vi"), "en");
  assert.equal(resolveLanguageTarget("en"), "vi");
  assert.equal(resolveLanguageTarget("en", "vi"), "vi");
  assert.equal(resolveLanguageTarget("vi", "vi"), "vi");
});
