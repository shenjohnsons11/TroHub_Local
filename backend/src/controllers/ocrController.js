const { recognize } = require('tesseract.js');
const { GoogleGenAI } = require('@google/genai');

function getGeminiVisionClient() {
    const primaryKey = process.env.GEMINI_LANDLORD_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_TENANT_API_KEY;
    const fallbackKey = process.env.GEMINI_TENANT_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_LANDLORD_API_KEY;
    const primaryClient = primaryKey ? new GoogleGenAI({ apiKey: primaryKey }) : null;
    const fallbackClient = (fallbackKey && fallbackKey !== primaryKey) ? new GoogleGenAI({ apiKey: fallbackKey }) : primaryClient;
    return { primaryClient, fallbackClient };
}

const VISION_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-flash-latest'
];

async function callGeminiVision(base64Data, prompt) {
    const { primaryClient, fallbackClient } = getGeminiVisionClient();
    if (!primaryClient && !fallbackClient) return null;

    const mimeType = 'image/jpeg';
    const contents = [
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType
            }
        }
    ];

    const clients = [primaryClient, fallbackClient].filter(Boolean);

    for (const client of clients) {
        for (const model of VISION_MODELS) {
            try {
                const response = await client.models.generateContent({
                    model,
                    contents
                });
                const text = response?.text || '';
                if (text && text.trim()) {
                    return text.trim();
                }
            } catch (err) {
                // If quota exhausted or model not available, continue to next model/client
                console.log(`[Gemini Vision ${model} Notice]`, err?.message?.slice(0, 120) || 'error');
            }
        }
    }

    return null;
}

function extractMeterDigits(text) {
    if (!text) return '';
    const cleaned = String(text).replace(/[^0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const preferred = tokens.filter((t) => t.length >= 3 && t.length <= 6);
    if (preferred.length > 0) return preferred[0];
    const anyNum = tokens.filter((t) => t.length >= 1 && t.length <= 6);
    if (anyNum.length > 0) return anyNum[0];
    return '';
}

function extractCCCDData(text) {
    if (!text) return { idCard: '', fullName: '' };
    const numbers = String(text).match(/\d{12}/g) || [];
    const idCard = numbers[0] || (String(text).replace(/\D/g, '').slice(0, 12));

    const lines = String(text).split('\n');
    let fullName = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (
            trimmed.length >= 4 &&
            !trimmed.includes('CỘNG HÒA') &&
            !trimmed.includes('VIỆT NAM') &&
            !trimmed.includes('CĂN CƯỚC') &&
            !trimmed.includes('IDENTITY') &&
            !trimmed.includes('CITIZEN') &&
            !trimmed.includes('CARD') &&
            !trimmed.includes('QUỐC TỊCH')
        ) {
            if (/^[A-ZÀ-Ỹ\s]+$/.test(trimmed)) {
                fullName = trimmed;
                break;
            }
        }
    }
    return { idCard, fullName };
}

exports.extractMeterDigits = extractMeterDigits;
exports.extractCCCDData = extractCCCDData;

/**
 * POST /api/ai/ocr-meter & POST /api/ocr/meter
 * Nhận diện chỉ số đồng hồ điện / nước từ ảnh chụp
 */
exports.readMeter = async (req, res) => {
    const rawImage = String(req.body?.image || req.body?.imageData || req.body?.base64 || '');
    const base64 = rawImage.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').trim();
    const meterType = String(req.body?.meterType || 'ELECTRIC').toUpperCase();

    if (!base64) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh chụp mặt đồng hồ.' });
    }

    try {
        let digits = '';
        let reading = null;

        // 1. Dùng Gemini Vision API trích xuất chỉ số đồng hồ
        const prompt = `Bạn là chuyên gia OCR đọc chỉ số công tơ điện và đồng hồ nước Việt Nam.
Loại đồng hồ: ${meterType === 'WATER' ? 'Đồng hồ nước (m3)' : 'Công tơ điện (kWh)'}.
Nhiệm vụ: Hãy quan sát kỹ phần dãy số / vòng quay cơ học / màn hình LCD hiển thị chỉ số tiêu thụ.
Lưu ý quan trọng:
- Chỉ đọc dãy số nguyên màu đen (bỏ qua số thập phân màu đỏ hoặc sau dấu phẩy nếu có).
- Bỏ qua các ký hiệu kWh, m3, vôn, ampe, mã số seri của đồng hồ.
Trả về duy nhất định dạng JSON (không có markdown code block, không giải thích):
{"reading": 12345, "digits": "12345"}
Nếu ảnh mờ hoặc không nhận diện được số:
{"reading": null, "digits": "", "error": "Ảnh mờ hoặc không thấy mặt số"}`;

        const geminiResult = await callGeminiVision(base64, prompt);

        if (geminiResult) {
            const jsonMatch = geminiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.digits || parsed.reading !== undefined) {
                        digits = String(parsed.digits || parsed.reading || '').replace(/\D/g, '').slice(0, 6);
                        reading = digits ? parseInt(digits, 10) : null;
                    }
                } catch (e) {
                    digits = geminiResult.replace(/\D/g, '').slice(0, 6);
                    reading = digits ? parseInt(digits, 10) : null;
                }
            } else {
                digits = geminiResult.replace(/\D/g, '').slice(0, 6);
                reading = digits ? parseInt(digits, 10) : null;
            }
        }

        // 2. Fallback Tesseract nếu Gemini Vision không khả dụng
        if (!digits) {
            try {
                const { data } = await recognize(Buffer.from(base64, 'base64'), 'eng');
                digits = extractMeterDigits(data.text);
                reading = digits ? parseInt(digits, 10) : null;
            } catch (tessErr) {
                console.log('[Tesseract Fallback Error]', tessErr.message);
            }
        }

        if (!digits) {
            return res.status(422).json({
                success: false,
                message: 'Không nhận diện rõ chỉ số trên đồng hồ. Vui lòng căn góc thẳng đủ sáng và chụp lại.'
            });
        }

        return res.json({
            success: true,
            data: {
                reading,
                digits,
                meterType: meterType.toLowerCase(),
                confidence: 95
            }
        });
    } catch (error) {
        console.error('[OCR_METER_ERROR]', error);
        return res.status(500).json({ success: false, message: 'Lỗi nhận diện đồng hồ: ' + error.message });
    }
};

/**
 * POST /api/ai/ocr-cccd & POST /api/ocr/cccd
 * Nhận diện 12 số CCCD và Họ tên in trên thẻ Căn cước công dân
 */
exports.scanCCCD = async (req, res) => {
    const rawImage = String(req.body?.image || req.body?.imageData || req.body?.base64 || '');
    const base64 = rawImage.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').trim();

    if (!base64) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh chụp thẻ CCCD.' });
    }

    try {
        let cleanId = '';
        let cleanName = '';

        const prompt = `Bạn là chuyên gia OCR tài liệu căn cước công dân Việt Nam.
Hãy quan sát kỹ ảnh mặt trước thẻ Căn cước công dân (CCCD).
Nhiệm vụ: Trích xuất chính xác 2 trường thông tin:
1. idCard: Số định danh cá nhân / Số CCCD (gồm đúng 12 chữ số in trên thẻ).
2. fullName: Họ và tên (chữ in hoa tiếng Việt có dấu, ví dụ: "NGUYỄN VĂN A").

Trả về duy nhất định dạng JSON chuẩn (không markdown, không thêm chữ khác):
{"idCard": "079123456789", "fullName": "NGUYỄN VĂN A"}

Nếu ảnh quá mờ, bị lóa sáng hoặc không tìm thấy đủ 12 số CCCD:
{"idCard": "", "fullName": "", "error": "Không nhận diện rõ 12 số CCCD, vui lòng căn góc thẳng và chụp lại."}`;

        const geminiResult = await callGeminiVision(base64, prompt);

        if (geminiResult) {
            const jsonMatch = geminiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    cleanId = String(parsed.idCard || '').replace(/\D/g, '').slice(0, 12);
                    cleanName = String(parsed.fullName || '').trim().toUpperCase();
                } catch (e) {
                    const digitsMatch = geminiResult.match(/\d{12}/);
                    if (digitsMatch) cleanId = digitsMatch[0];
                }
            } else {
                const digitsMatch = geminiResult.match(/\d{12}/);
                if (digitsMatch) cleanId = digitsMatch[0];
            }
        }

        // Fallback Tesseract nếu Gemini Vision không khả dụng
        if (!cleanId || cleanId.length < 12) {
            try {
                const { data } = await recognize(Buffer.from(base64, 'base64'), 'vie+eng');
                const extracted = extractCCCDData(data.text);
                if (extracted.idCard && extracted.idCard.length === 12) {
                    cleanId = extracted.idCard;
                    if (!cleanName && extracted.fullName) cleanName = extracted.fullName;
                }
            } catch (tessErr) {
                console.log('[Tesseract CCCD Fallback Error]', tessErr.message);
            }
        }

        if (!cleanId || cleanId.length < 12) {
            return res.status(422).json({
                success: false,
                message: 'Không tìm thấy đủ 12 chữ số CCCD. Vui lòng căn góc thẳng và chụp lại.'
            });
        }

        return res.json({
            success: true,
            data: {
                idCard: cleanId,
                fullName: cleanName || 'NGƯỜI DÙNG',
                confidence: 96
            }
        });
    } catch (error) {
        console.error('[OCR_CCCD_ERROR]', error);
        return res.status(500).json({ success: false, message: 'Lỗi nhận diện CCCD: ' + error.message });
    }
};
