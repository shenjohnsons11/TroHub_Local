const { askTroHubAI } = require('../services/aiService');

async function chatWithAI(req, res, next) {
    try {
        const { message } = req.body;
        const { id: userId, role } = req.auth;

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_INPUT',
                message: 'Vui lòng cung cấp nội dung tin nhắn.'
            });
        }

        const result = await askTroHubAI(message, userId, role);

        return res.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[AI_CONTROLLER_ERROR]', error);
        return res.status(500).json({
            success: false,
            code: 'AI_ERROR',
            message: error.message || 'Lỗi khi xử lý câu hỏi với Trợ lý TroHub AI.'
        });
    }
}

module.exports = { chatWithAI };
