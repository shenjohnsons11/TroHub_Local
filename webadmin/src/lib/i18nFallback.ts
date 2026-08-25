export function humanizeTranslationKey(key: string): string {
  const label = key.split(".").pop()?.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim() || key;
  return label ? label[0].toUpperCase() + label.slice(1) : label;
}
