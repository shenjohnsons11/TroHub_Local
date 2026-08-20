import { apiClient } from "./apiClient";
import { authService } from "./authService";

export interface OCRRecognitionResult {
  reading?: number;
  rawText?: string;
  digits: string;
  confidence: number;
  meterType: "electricity" | "water";
}

export interface CCCDRecognitionResult {
  idCard: string;
  fullName?: string;
  confidence?: number;
}

export const ocrService = {
  /**
   * Process image and extract numeric meter reading sequence via Gemini Vision AI
   */
  async recognizeMeterReading(imageUri?: string, meterType: "electricity" | "water" = "electricity"): Promise<OCRRecognitionResult> {
    if (!imageUri) throw new Error("Không có ảnh đồng hồ để nhận diện.");
    const token = await authService.getToken();
    const dataUrl = await toDataUrl(imageUri);
    const response = await apiClient.post<{
      success: boolean;
      data?: { reading?: number; digits: string; rawText?: string; confidence: number };
      message?: string;
    }>("/ai/ocr-meter", { image: dataUrl, meterType: meterType === "water" ? "WATER" : "ELECTRIC" }, token);

    if (!response.success || !response.data?.digits) {
      throw new Error(response.message || "Không đọc được chỉ số trên mặt đồng hồ.");
    }
    const cleanDigits = this.cleanMeterDigits(response.data.digits);
    return {
      digits: cleanDigits,
      reading: response.data.reading !== undefined ? response.data.reading : parseInt(cleanDigits, 10),
      rawText: response.data.rawText || cleanDigits,
      confidence: response.data.confidence || 95,
      meterType,
    };
  },

  /**
   * Process image and extract 12-digit ID number & Full Name from Vietnamese CCCD via Gemini Vision AI
   */
  async recognizeCCCD(imageUri?: string): Promise<CCCDRecognitionResult> {
    if (!imageUri) throw new Error("Vui lòng cung cấp ảnh chụp thẻ CCCD.");
    const token = await authService.getToken();
    const dataUrl = await toDataUrl(imageUri);
    const response = await apiClient.post<{
      success: boolean;
      data?: { idCard: string; fullName?: string; confidence?: number };
      message?: string;
    }>("/ai/ocr-cccd", { image: dataUrl }, token);

    if (!response.success || !response.data?.idCard) {
      throw new Error(response.message || "Không nhận diện rõ 12 số CCCD. Vui lòng căn góc thẳng và chụp lại.");
    }

    const idCard = response.data.idCard.replace(/\D/g, "").slice(0, 12);
    const fullName = response.data.fullName ? response.data.fullName.trim().toUpperCase() : undefined;

    return {
      idCard,
      fullName,
      confidence: response.data.confidence || 98,
    };
  },

  /**
   * Data Cleansing Filter: Keep only valid numeric digits, stripping letters/noise
   */
  cleanMeterDigits(text: string): string {
    if (!text) return "00000";
    const digitsOnly = text.replace(/\D/g, "");
    if (!digitsOnly) return "00000";
    // Limit max 6 digits for standard utility meters
    return digitsOnly.slice(0, 6);
  },
};

async function toDataUrl(uri: string): Promise<string> {
  if (uri.startsWith("data:image/")) return uri;
  const response = await fetch(uri);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}
