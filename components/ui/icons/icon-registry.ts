import { ImageSourcePropType } from "react-native";

export type TroHubIconName =
  | "contract"
  | "cccd"
  | "meter"
  | "billing"
  | "house"
  | "key"
  | "repair"
  | "wallet";

export interface IconDefinition {
  source: ImageSourcePropType;
  label: string;
  fallbackIonicons: string;
  accentColor: string;
}

export const TROHUB_ICONS: Record<TroHubIconName, IconDefinition> = {
  contract: {
    source: require("../../../assets/images/icons/icon_contract_seal.jpg"),
    label: "Hợp đồng & Chữ ký số",
    fallbackIonicons: "document-text",
    accentColor: "#d0604c",
  },
  cccd: {
    source: require("../../../assets/images/icons/icon_cccd_scanner.jpg"),
    label: "Quét CCCD & Khách thuê",
    fallbackIonicons: "card",
    accentColor: "#0f6b57",
  },
  meter: {
    source: require("../../../assets/images/icons/icon_smart_meter_ocr.jpg"),
    label: "Camera Chỉ số Điện Nước",
    fallbackIonicons: "speedometer",
    accentColor: "#b8f5da",
  },
  billing: {
    source: require("../../../assets/images/icons/icon_financial_billing.jpg"),
    label: "Tài chính & Hóa đơn",
    fallbackIonicons: "receipt",
    accentColor: "#b95643",
  },
  house: {
    source: require("../../../assets/images/loading_cozy_house.jpg"),
    label: "Căn hộ TroHub",
    fallbackIonicons: "home",
    accentColor: "#0f5247",
  },
  key: {
    source: require("../../../assets/images/icons/icon_contract_seal.jpg"),
    label: "Chìa khóa số",
    fallbackIonicons: "key",
    accentColor: "#d0604c",
  },
  repair: {
    source: require("../../../assets/images/icons/icon_smart_meter_ocr.jpg"),
    label: "Báo cáo sự cố",
    fallbackIonicons: "construct",
    accentColor: "#b95643",
  },
  wallet: {
    source: require("../../../assets/images/icons/icon_financial_billing.jpg"),
    label: "Dòng tiền",
    fallbackIonicons: "wallet",
    accentColor: "#0f6b57",
  },
};
