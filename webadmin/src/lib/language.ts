export type Language = "vi" | "en";

export function normalizeLanguage(value: unknown): Language | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "vi" || normalized === "en" ? normalized : null;
}

export function resolveLanguageTarget(current: Language, requested?: Language): Language {
  return requested ?? (current === "vi" ? "en" : "vi");
}
