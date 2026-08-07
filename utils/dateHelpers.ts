export function getRealtimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Chào buổi sáng.";
  } else if (hour >= 12 && hour < 18) {
    return "Chào buổi chiều.";
  } else {
    return "Chào buổi tối.";
  }
}

export function getFormattedDateWidget(locale = "vi-VN"): string {
  const now = new Date();
  const dayName = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(now);
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}
