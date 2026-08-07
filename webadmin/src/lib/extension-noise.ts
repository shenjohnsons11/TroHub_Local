const extensionMarkers = ["chrome-extension://", "gads-scrapper", "onboarding.js"];

export function isExtensionNoise(reason: unknown): boolean {
  const stack = typeof reason === "object" && reason !== null && "stack" in reason
    ? String(reason.stack || "")
    : "";
  const message = reason instanceof Error ? reason.message : String(reason || "");
  const source = `${message}\n${stack}`.toLowerCase();
  return extensionMarkers.some((marker) => source.includes(marker));
}
