import { Platform } from "react-native";
import { WidgetDataSnapshot } from "../../types/WidgetData";

export const ANDROID_LANDLORD_WIDGET_NAME = "landlord";
let registered = false;

function renderWidget(snapshot: WidgetDataSnapshot) {
  const { FlexWidget, TextWidget } = require("react-native-android-widget") as typeof import("react-native-android-widget");
  const text = (value: string, color: `#${string}`, size = 12, weight: "normal" | "bold" = "normal") =>
    <TextWidget text={value} maxLines={1} style={{ color, fontSize: size, fontWeight: weight, adjustsFontSizeToFit: true }} />;

  return (
    <FlexWidget style={{ flexDirection: "column", padding: 12, backgroundColor: "#ffffff", borderRadius: 16 }} accessibilityLabel="TroHub Chủ trọ 4x2">
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {text("🏠 TroHub Chủ trọ", "#073e36", 13, "bold")}
        <TextWidget text="📷 Quét Camera" clickAction="OPEN_URI" clickActionData={{ uri: "trohub://scan-camera" }} accessibilityLabel="Quét Camera CCCD" style={{ color: "#073e36", fontSize: 11, fontWeight: "bold", padding: 6 }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "row", marginTop: 12 }}>
        <FlexWidget style={{ flex: 1, paddingRight: 6 }}>{text("Công nợ chưa thu", "#64748b", 10)}{text(formatCurrency(snapshot.outstandingDebt), "#e53e3e", 13, "bold")}</FlexWidget>
        <FlexWidget style={{ flex: 1, paddingHorizontal: 6, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e2e8f0" }}>{text("Chốt Điện Nước", "#64748b", 10)}{text(snapshot.utilityReadingProgress, "#d69e2e", 13, "bold")}</FlexWidget>
        <FlexWidget style={{ flex: 1, paddingLeft: 6 }}>{text("Sự cố đang mở", "#64748b", 10)}{text(`${snapshot.openRepairsCount} sự cố`, "#805ad5", 13, "bold")}</FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value || 0)}đ`;
}

export function registerAndroidLandlordWidgetTasks() {
  if (registered || Platform.OS !== "android") return;
  try {
    const { registerWidgetTaskHandler } = require("react-native-android-widget") as typeof import("react-native-android-widget");
    registerWidgetTaskHandler(async ({ renderWidget: render }) => {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const raw = await AsyncStorage.getItem("@trohub_widget_data");
      const snapshot = raw ? JSON.parse(raw) as WidgetDataSnapshot : null;
      if (snapshot) render(renderWidget(snapshot));
    });
    registered = true;
  } catch (error) {
    console.log("Android widget native module chưa khả dụng:", error);
  }
}

export async function updateAndroidLandlordWidget(snapshot: WidgetDataSnapshot) {
  if (Platform.OS !== "android") return;
  try {
    const { requestWidgetUpdate } = require("react-native-android-widget") as typeof import("react-native-android-widget");
    await requestWidgetUpdate({ widgetName: ANDROID_LANDLORD_WIDGET_NAME, renderWidget: async () => renderWidget(snapshot) });
  } catch (error) {
    console.log("Không thể cập nhật Android widget:", error);
  }
}
