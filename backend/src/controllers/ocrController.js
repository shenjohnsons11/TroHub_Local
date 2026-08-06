const { recognize } = require('tesseract.js');

function extractMeterDigits(text) {
    const groups = String(text || '').match(/\d{3,7}/g) || [];
    return groups
        .filter((value) => value.length <= 6)
        .sort((left, right) => right.length - left.length)[0] || '';
}

exports.extractMeterDigits = extractMeterDigits;

exports.readMeter = async (req, res) => {
    const imageData = String(req.body?.imageData || '');
    const base64 = imageData.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');
    if (!base64 || base64.length > 8 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Ảnh đồng hồ không hợp lệ hoặc quá lớn.' });
    }

    try {
        const { data } = await recognize(Buffer.from(base64, 'base64'), 'eng');
        const digits = extractMeterDigits(data.text);
        if (!digits) return res.status(422).json({ success: false, message: 'Không đọc được chỉ số. Hãy chụp rõ hơn hoặc nhập tay.' });
        return res.json({ success: true, data: { digits, rawText: data.text, confidence: data.confidence || 0 } });
    } catch (error) {
        return res.status(422).json({ success: false, message: 'Không thể nhận diện chỉ số từ ảnh này.' });
    }
};
