export interface OCRRecognitionResult {
  rawText: string;
  digits: string;
  confidence: number;
  meterType: "electricity" | "water";
}

export const ocrService = {
  /**
   * Process image and extract numeric meter reading sequence
   */
  async recognizeMeterReading(imageUri?: string, meterType: "electricity" | "water" = "electricity"): Promise<OCRRecognitionResult> {
    if (!imageUri) throw new Error("Không có ảnh đồng hồ để nhận diện.");
    const token = await authService.getToken();
    const response = await apiClient.post<{ success: boolean; data?: { digits: string; rawText: string; confidence: number }; message?: string }>("/ocr/meter", { imageData: await toDataUrl(imageUri) }, token);
    if (!response.success || !response.data?.digits) throw new Error(response.message || "Không đọc được chỉ số đồng hồ.");
    return { ...response.data, digits: this.cleanMeterDigits(response.data.digits), meterType };
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
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đồng hồ."));
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}
import { apiClient } from "./apiClient";
import { authService } from "./authService";
