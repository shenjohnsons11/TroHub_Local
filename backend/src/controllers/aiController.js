const { askTroHubAI } = require('../services/aiService');

async function chatWithAI(req, res, next) {
    try {
        const { message } = req.body;
        const { id: userId, role } = req.auth || req.user || {};

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
        return res.status(200).json({
            success: false,
            reply: error.message || 'Không thể kết nối với AI. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.',
            action: null,
            code: 'AI_ERROR',
            timestamp: new Date().toISOString()
        });
    }

}

module.exports = { chatWithAI };
