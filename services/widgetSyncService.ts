import AsyncStorage from "@react-native-async-storage/async-storage";
import { WidgetDataSnapshot } from "../types/WidgetData";
import { toWidgetSnapshot, type LandlordStatsInput } from "../utils/widgetData";
import { updateAndroidLandlordWidget } from "../components/widgets/androidLandlordWidget";
import { ExtensionStorage } from "@bacons/apple-targets";

const WIDGET_STORAGE_KEY = "@trohub_widget_data";

export const widgetSyncService = {
  async saveSnapshot(snapshot: WidgetDataSnapshot): Promise<void> {
    try {
      const jsonString = JSON.stringify(snapshot);
      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, jsonString);
      const sharedStorage = new ExtensionStorage("group.com.trohub.app");
      sharedStorage.set("trohub_widget_json", jsonString);
      ExtensionStorage.reloadWidget("TroHubWidget");
      void updateAndroidLandlordWidget(snapshot);

      // Log App Group sync status for iOS WidgetKit / Android AppWidget
      console.log("[WidgetSync] Shared App Group 'group.com.trohub.app' synced:", jsonString);
    } catch (error) {
      console.error("Lỗi đồng bộ dữ liệu Widget:", error);
    }
  },

  async getSnapshot(): Promise<WidgetDataSnapshot> {
    try {
      const stored = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as WidgetDataSnapshot;
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu Widget:", error);
    }

    // Default fallback snapshot
    return {
      totalRevenue: 186883000,
      occupancyRate: 80,
      occupiedRooms: 8,
      totalRooms: 10,
      outstandingDebt: 12500000,
      utilityReadingProgress: "6/10 phòng",
      openRepairsCount: 2,
      lastSyncedAt: new Date().toISOString(),
    };
  },

  async syncWidgetData(statsData: LandlordStatsInput): Promise<WidgetDataSnapshot> {
    const snapshot = toWidgetSnapshot(statsData);

    await this.saveSnapshot(snapshot);
    return snapshot;
  },
};
