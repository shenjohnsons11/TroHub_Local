export type AppDeepLinkTarget = "cccd_scan";

export function resolveAppDeepLink(url: string | null | undefined): AppDeepLinkTarget | null {
  const normalized = String(url || "").trim().toLowerCase();
  return normalized === "trohub://scan-camera" || normalized.endsWith("/scan-camera") ? "cccd_scan" : null;
}
