const { GoogleGenAI } = require('@google/genai');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const Account = require('../models/Account');

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const isNonNegativeNumber = (value) => Number.isFinite(value) && value >= 0;
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

function parseAIResponse(rawText) {
    const fallback = typeof rawText === 'string' ? rawText.trim() : '';
    const jsonText = fallback.replace(/^```(?:json)?\s*|\s*```$/gi, '');

    try {
        const parsed = JSON.parse(jsonText);
        const action = parsed?.action;
        const reply = isNonEmptyString(parsed?.reply) ? parsed.reply.trim() : fallback;

        if (action?.type === 'FILL_CONTRACT_FORM'
            && isNonEmptyString(action.roomCode)
            && isNonEmptyString(action.tenantName)
            && isNonNegativeNumber(action.rentPrice)
            && /^\d{4}-\d{2}-\d{2}$/.test(action.startDate)) {
            return {
                reply,
                action: {
                    type: 'FILL_CONTRACT_FORM',
                    roomCode: action.roomCode.trim(),
                    tenantName: action.tenantName.trim(),
                    rentPrice: action.rentPrice,
                    startDate: action.startDate,
                },
            };
        }

        if (action?.type === 'FILL_UTILITY_READING'
            && isNonEmptyString(action.roomCode)
            && isNonNegativeNumber(action.newElec)
            && isNonNegativeNumber(action.newWater)) {
            return {
                reply,
                action: {
                    type: 'FILL_UTILITY_READING',
                    roomCode: action.roomCode.trim(),
                    newElec: action.newElec,
                    newWater: action.newWater,
                },
            };
        }

        return { reply, action: null };
    } catch {
        return { reply: fallback, action: null };
    }
}

async function getUserContext(userId, role) {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            return { role: role === 1 ? 'Chủ trọ' : 'Người thuê', status: 'DB disconnected' };
        }
        if (role === 1) { // Landlord / Admin
            const rooms = await Room.find({ landlordId: userId }).lean();
            const roomIds = rooms.map(r => r._id);
            
            const totalRooms = rooms.length;
            const vacantRooms = rooms.filter(r => r.status === 0).length;
            const occupiedRooms = rooms.filter(r => r.status === 1).length;
            const maintenanceRooms = rooms.filter(r => r.status === 2).length;

            const contracts = await Contract.find({ roomId: { $in: roomIds } }).populate('roomId tenantId').lean();
            const activeContracts = contracts.filter(c => c.status === 1).length;
            const pendingContracts = contracts.filter(c => c.status === 0).length;

            const contractIds = contracts.map(c => c._id);
            const invoices = await Invoice.find({ contractId: { $in: contractIds } }).lean();

            const unpaidInvoices = invoices.filter(i => i.status === 1 || i.status === 3);
            const totalDebt = unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
            
            const paidInvoices = invoices.filter(i => i.status === 2);
            const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

            // Chi tiết hóa đơn chưa thanh toán cho tin nhắn nhắc nợ
            const debtDetails = unpaidInvoices.slice(0, 10).map(i => ({
                room: i.room || 'N/A',
                tenant: i.tenant || 'N/A',
                period: i.period,
                totalAmount: i.totalAmount,
                dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('vi-VN') : 'N/A',
                status: i.status === 3 ? 'Quá hạn' : 'Chưa thanh toán'
            }));

            const landlord = await Account.findById(userId).lean();

            return {
                role: 'Chủ trọ',
                landlordName: landlord?.fullName || 'Chủ trọ',
                bankInfo: {
                    bankId: landlord?.bankId || process.env.VIETQR_BANK_ID || 'MB',
                    bankAccountNo: landlord?.bankAccountNo || process.env.VIETQR_ACCOUNT_NO || '',
                    bankAccountName: landlord?.bankAccountName || process.env.VIETQR_ACCOUNT_NAME || ''
                },
                stats: {
                    totalRooms,
                    vacantRooms,
                    occupiedRooms,
                    maintenanceRooms,
                    activeContracts,
                    pendingContracts,
                    totalDebt,
                    unpaidInvoiceCount: unpaidInvoices.length,
                    totalRevenueCollected: totalPaidAmount
                },
                debtDetails
            };
        } else { // Tenant (role = 2)
            const tenant = await Account.findById(userId).lean();
            const contracts = await Contract.find({ tenantId: userId, status: 1 }).populate('roomId').lean();
            const contractIds = contracts.map(c => c._id);

            const invoices = await Invoice.find({ contractId: { $in: contractIds } }).lean();
            const unpaidInvoices = invoices.filter(i => i.status === 1 || i.status === 3);

            return {
                role: 'Người thuê',
                tenantName: tenant?.fullName || 'Người thuê',
                rooms: contracts.map(c => ({
                    roomCode: c.roomId?.roomCode || 'N/A',
                    rentPrice: c.fixedRentPrice,
                    startDate: c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '',
                    endDate: c.endDate ? new Date(c.endDate).toLocaleDateString('vi-VN') : ''
                })),
                unpaidInvoices: unpaidInvoices.map(i => ({
                    period: i.period,
                    totalAmount: i.totalAmount,
                    dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('vi-VN') : '',
                    status: i.status === 3 ? 'Quá hạn' : 'Chưa thanh toán'
                }))
            };
        }
    } catch (err) {
        console.error('[AI_SERVICE_CONTEXT_ERROR]', err);
        return { role: role === 1 ? 'Chủ trọ' : 'Người thuê' };
    }
}

async function askTroHubAI(message, userId, role) {
    if (!message || typeof message !== 'string' || !message.trim()) {
        throw new Error('Câu hỏi không được để trống.');
    }

    const context = await getUserContext(userId, role);
    
    const systemInstruction = `
Bạn là TroHub AI - Trợ lý AI thông minh tích hợp trên ứng dụng quản lý nhà trọ TroHub.
Hãy trả lời bằng tiếng Việt một cách chuyên nghiệp, ngắn gọn, lịch sự, thân thiện và hữu ích.

Dữ liệu bối cảnh thời gian thực của người dùng hiện tại:
${JSON.stringify(context, null, 2)}

HƯỚNG DẪN TRẢ LỜI:
1. Nếu người dùng hỏi về thống kê phòng, doanh thu, nợ nần, hợp đồng: Hãy sử dụng số liệu bối cảnh thực tế ở trên để trả lời chính xác.
2. Nếu người dùng hỏi "Soạn tin nhắn nhắc nợ": Kiểm tra danh sách nợ (debtDetails), soạn mẫu tin nhắn nhắc nợ hoàn chỉnh, lịch sự, thân thiện sẵn sàng copy gửi Zalo/SMS cho người thuê, bao gồm thông tin STK ngân hàng nhận tiền nếu có.
3. Nếu người dùng hỏi "Hướng dẫn tạo hợp đồng mới" hoặc cách sử dụng ứng dụng TroHub: Hãy đưa ra danh sách các bước ngắn gọn, rõ ràng.
4. Trả về duy nhất JSON hợp lệ theo cấu trúc {"reply":"...", "action":null}. reply có thể dùng Markdown.
5. Khi Chủ trọ yêu cầu tạo hợp đồng với phòng, tên người thuê, giá thuê và ngày bắt đầu, action là {"type":"FILL_CONTRACT_FORM","roomCode":"...","tenantName":"...","rentPrice":0,"startDate":"YYYY-MM-DD"}.
6. Khi Chủ trọ yêu cầu chốt điện nước với mã phòng và chỉ số mới, action là {"type":"FILL_UTILITY_READING","roomCode":"...","newElec":0,"newWater":0}.
7. Không đủ dữ liệu, không phải lệnh hành động, hoặc người dùng là Người thuê thì action phải là null.
`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
    let lastError = null;

    if (!ai) {
        throw new Error('Dịch vụ AI hiện chưa được cấu hình.');
    }

    for (const modelName of candidateModels) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: message.trim(),
                config: {
                    systemInstruction: systemInstruction,
                }
            });
            if (response && response.text) {
                const result = parseAIResponse(response.text);
                return role === 1 ? result : { ...result, action: null };
            }
        } catch (err) {
            console.warn(`[AI_SERVICE_WARN] Model ${modelName} encountered issue:`, err.message);
            lastError = err;
        }
    }

    throw new Error(lastError ? lastError.message : 'Dịch vụ AI hiện chưa sẵn sàng, vui lòng thử lại sau.');
}

module.exports = { askTroHubAI, getUserContext, parseAIResponse };
