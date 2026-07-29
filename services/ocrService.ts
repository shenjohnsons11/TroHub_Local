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
    try {
      // Simulate OCR delay for realistic ML processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock MLKit / Vision OCR extraction logic
      // In production, MLKit or Vision API returns raw text string
      let rawText = "NO_IMAGE_CAPTURED";
      let digits = "04521";

      if (imageUri) {
        // Generate pseudo-deterministic numbers derived from imageUri or random range for demo
        const seed = imageUri.length;
        const baseNum = meterType === "electricity" ? (40000 + (seed * 13) % 9000) : (120 + (seed * 7) % 300);
        digits = String(baseNum).padStart(5, "0");
        rawText = `METER_READING_OK kWh ${digits}`;
      }

      // Filter: Clean string, extract pure digits
      const cleanedDigits = this.cleanMeterDigits(digits);

      return {
        rawText,
        digits: cleanedDigits,
        confidence: 0.96,
        meterType,
      };
    } catch (error) {
      console.error("Lỗi nhận diện OCR:", error);
      return {
        rawText: "ERROR",
        digits: "04521",
        confidence: 0.8,
        meterType,
      };
    }
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
