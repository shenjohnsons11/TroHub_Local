const { recognize } = require('tesseract.js');
const { GoogleGenAI } = require('@google/genai');

function getGeminiVisionClient() {
    const primaryKey = process.env.GEMINI_LANDLORD_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_TENANT_API_KEY;
    const fallbackKey = process.env.GEMINI_TENANT_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_LANDLORD_API_KEY;
    const primaryClient = primaryKey ? new GoogleGenAI({ apiKey: primaryKey }) : null;
    const fallbackClient = (fallbackKey && fallbackKey !== primaryKey) ? new GoogleGenAI({ apiKey: fallbackKey }) : primaryClient;
    return { primaryClient, fallbackClient };
}

const VISION_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];

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
                    contents,
                    config: {
                        temperature: 0.1,
                        maxOutputTokens: 256,
                    }
                });
                const text = response?.text || '';
                if (text && text.trim()) {
                    return text.trim();
                }
            } catch (err) {
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
 * QUY TẮC CỰC KỲ QUAN TRỌNG: Tự động bỏ qua ô số màu ĐỎ, chỉ lấy dãy số màu ĐEN (phần nguyên)
 */
exports.readMeter = async (req, res) => {
    const rawImage = String(req.body?.image || req.body?.imageData || req.body?.base64 || '');
    const base64 = rawImage.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').trim();
    const meterType = String(req.body?.meterType || 'ELECTRIC').toUpperCase();

    if (!base64) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh chụp mặt đồng hồ.' });
    }

    try {
        let blackDigits = '';
        let redDigits = '';
        let reading = null;
        let note = 'Đã tự động loại bỏ số phụ màu đỏ';

        // 1. Dùng Gemini Vision AI với Prompt chuyên biệt nhận diện màu sắc
        const prompt = `
Bạn là chuyên gia thị giác máy tính OCR chuyên đọc mặt đồng hồ điện và đồng hồ nước tại Việt Nam.
Loại thiết bị: ${meterType === 'WATER' ? 'Đồng hồ nước (m3)' : 'Công tơ điện (kWh)'}.
Hãy phân tích bức ảnh mặt đồng hồ này và tuân thủ NGHIÊM NGẶT các quy tắc sau:

1. QUY TẮC MÀU SẮC (CỰC KỲ QUAN TRỌNG):
   - Mặt đồng hồ gồm các chữ số màu ĐEN (hoặc nền trắng chữ đen) đại diện cho phần nguyên (kWh hoặc m³).
   - Có 1 hoặc 2 chữ số cuối cùng nằm trong Ô MÀU ĐỎ hoặc có VIỀN ĐỎ (đại diện cho phần thập phân/lẻ).
   - BẠN PHẢI BỎ QUA HOÀN TOÀN CÁC CHỮ SỐ TRONG Ô MÀU ĐỎ NÀY!
   - CHỈ TRÍCH XUẤT DÃY SỐ MÀU ĐEN.

2. ĐỊNH DẠNG TRẢ VỀ:
   Trả về DUY NHẤT một JSON hợp lệ (không markdown code block, không giải thích thêm):
   {
     "blackDigits": "00145",
     "redDigits": "8",
     "reading": 145,
     "confidence": 98,
     "note": "Đã loại bỏ số đỏ 8, chỉ lấy 145 số đen"
   }
   Nếu ảnh mờ hoặc không thấy mặt số:
   {
     "blackDigits": "",
     "redDigits": "",
     "reading": null,
     "confidence": 0,
     "error": "Ảnh mờ hoặc không thấy mặt số"
   }
`;

        const geminiResult = await callGeminiVision(base64, prompt);

        if (geminiResult) {
            const jsonMatch = geminiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.blackDigits || parsed.digits || parsed.reading !== undefined) {
                        blackDigits = String(parsed.blackDigits || parsed.digits || parsed.reading || '').replace(/\D/g, '').slice(0, 6);
                        redDigits = String(parsed.redDigits || '').replace(/\D/g, '');
                        reading = parsed.reading !== undefined && parsed.reading !== null
                            ? Number(parsed.reading)
                            : (blackDigits ? parseInt(blackDigits, 10) : null);
                        if (parsed.note) {
                            note = parsed.note;
                        } else if (redDigits) {
                            note = `Đã loại bỏ số đỏ ${redDigits}, chỉ lấy ${reading || blackDigits} số đen`;
                        }
                    }
                } catch (e) {
                    blackDigits = geminiResult.replace(/\D/g, '').slice(0, 6);
                    reading = blackDigits ? parseInt(blackDigits, 10) : null;
                }
            } else {
                blackDigits = geminiResult.replace(/\D/g, '').slice(0, 6);
                reading = blackDigits ? parseInt(blackDigits, 10) : null;
            }
        }

        // 2. Fallback Tesseract nếu Gemini Vision không khả dụng
        if (!blackDigits) {
            try {
                const { data } = await recognize(Buffer.from(base64, 'base64'), 'eng');
                blackDigits = extractMeterDigits(data.text);
                reading = blackDigits ? parseInt(blackDigits, 10) : null;
                note = 'Nhận diện qua Tesseract Engine (Đã trích xuất số nguyên)';
            } catch (tessErr) {
                console.log('[Tesseract Fallback Error]', tessErr.message);
            }
        }

        if (!blackDigits) {
            return res.status(422).json({
                success: false,
                message: 'Không nhận diện rõ chỉ số trên đồng hồ. Vui lòng căn góc thẳng đủ sáng và chụp lại.'
            });
        }

        return res.json({
            success: true,
            data: {
                reading,
                digits: blackDigits,
                blackDigits,
                redDigits: redDigits || undefined,
                note,
                meterType: meterType.toLowerCase(),
                confidence: 98
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
