const { recognize } = require('tesseract.js');
const { GoogleGenAI } = require('@google/genai');

function extractMeterDigits(text) {
    const groups = String(text || '').match(/\d{3,7}/g) || [];
    return groups
        .filter((value) => value.length <= 6)
        .sort((left, right) => right.length - left.length)[0] || '';
}

async function scanWithGeminiVision(base64Data, prompt) {
    const apiKey = process.env.GEMINI_LANDLORD_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_TENANT_API_KEY;
    if (!apiKey) return null;
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/jpeg'
                    }
                }
            ]
        });
        return response?.text || '';
    } catch (err) {
        console.log('[Gemini Vision Error]', err.message);
        return null;
    }
}


exports.extractMeterDigits = extractMeterDigits;

exports.readMeter = async (req, res) => {
    const imageData = String(req.body?.imageData || '');
    const base64 = imageData.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');
    if (!base64 || base64.length > 8 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Ảnh đồng hồ không hợp lệ hoặc quá lớn.' });
    }

    try {
        // 1. Thử Tesseract OCR trước
        let digits = '';
        let rawText = '';
        let confidence = 0;

        try {
            const { data } = await recognize(Buffer.from(base64, 'base64'), 'eng');
            rawText = data.text;
            confidence = data.confidence || 0;
            digits = extractMeterDigits(data.text);
        } catch (tessErr) {
            console.log('[Tesseract Warning]', tessErr.message);
        }

        // 2. Nếu Tesseract không đọc được hoặc không tìm thấy dãy số, thử Gemini Vision
        if (!digits) {
            const geminiResult = await scanWithGeminiVision(
                base64,
                "Look at this image of an electricity or water meter. Return ONLY the numeric digits shown on the meter counter (numbers only, no words, no explanations). Example output: 01452"
            );
            if (geminiResult) {
                digits = geminiResult.replace(/\D/g, '').slice(0, 6);
                rawText = geminiResult;
                confidence = 95;
            }
        }

        if (!digits) {
            return res.status(422).json({ success: false, message: 'Không đọc được chỉ số. Hãy chụp rõ hơn hoặc nhập tay.' });
        }

        return res.json({ success: true, data: { digits, rawText, confidence } });
    } catch (error) {
        return res.status(422).json({ success: false, message: 'Không thể nhận diện chỉ số từ ảnh này.' });
    }
};

exports.scanCCCD = async (req, res) => {
    const imageData = String(req.body?.imageData || req.body?.image || '');
    const base64 = imageData.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');
    if (!base64) {
        return res.status(400).json({ success: false, message: 'Ảnh CCCD không hợp lệ.' });
    }

    try {
        const geminiResult = await scanWithGeminiVision(
            base64,
            "Analyze this Vietnamese Citizen Identity Card (CCCD). Extract: 1. idCard (12-digit number), 2. fullName (in Vietnamese uppercase). Return JSON only in format: {\"idCard\": \"...\", \"fullName\": \"...\"}"
        );

        if (geminiResult) {
            const jsonMatch = geminiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const idCard = (parsed.idCard || '').replace(/\D/g, '').slice(0, 12);
                const fullName = (parsed.fullName || '').trim().toUpperCase();
                if (idCard.length === 12) {
                    return res.json({
                        success: true,
                        data: { idCard, fullName }
                    });
                }
            }
        }

        return res.status(422).json({ success: false, message: 'Không thể đọc thông tin từ ảnh CCCD. Vui lòng quét mã QR hoặc chụp rõ hơn.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi xử lý ảnh CCCD: ' + error.message });
    }
};

