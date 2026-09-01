const { GoogleGenAI } = require('@google/genai');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const Account = require('../models/Account');
const {
    normalizeRole,
    classifyAIIntent,
    authorizeAIAction,
    getRolePresentation,
} = require('./aiPolicy');

function getGeminiApiKey(role) {
    const normalized = normalizeRole(role);
    if (role === 1 || role === '1' || normalized === 'landlord') {
        return process.env.GEMINI_LANDLORD_API_KEY || process.env.GEMINI_API_KEY || null;
    }
    return process.env.GEMINI_TENANT_API_KEY || process.env.GEMINI_API_KEY || null;
}

function getGenAIClient(role) {
    const landlordKey = process.env.GEMINI_LANDLORD_API_KEY || process.env.GEMINI_API_KEY || null;
    const tenantKey = process.env.GEMINI_TENANT_API_KEY || process.env.GEMINI_API_KEY || null;

    const normalized = normalizeRole(role);
    const isLandlord = role === 1 || role === '1' || normalized === 'landlord';

    // Role 1 = Chủ trọ -> Primary: Landlord Key, Fallback: Tenant Key
    // Role 2 = Khách thuê -> Primary: Tenant Key, Fallback: Landlord Key
    const primaryKey = isLandlord ? landlordKey : tenantKey;
    const fallbackKey = isLandlord ? tenantKey : landlordKey;

    const primaryClient = primaryKey ? new GoogleGenAI({ apiKey: primaryKey }) : null;
    const fallbackClient = fallbackKey ? new GoogleGenAI({ apiKey: fallbackKey }) : null;

    return {
        primaryClient,
        fallbackClient,
        primaryKey,
        fallbackKey,
    };
}

function isRateLimitOrQuotaError(err) {
    if (!err) return false;
    if (err.status === 429 || err.statusCode === 429 || err.status === 503 || err.statusCode === 503) return true;
    const msg = String(err.message || '').toLowerCase();
    return msg.includes('429')
        || msg.includes('503')
        || msg.includes('resource_exhausted')
        || msg.includes('resourceexhausted')
        || msg.includes('quota')
        || msg.includes('rate limit')
        || msg.includes('too many requests')
        || msg.includes('high demand')
        || msg.includes('unavailable')
        || msg.includes('overloaded');
}



const isNonNegativeNumber = (value) => Number.isFinite(value) && value >= 0;
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidISODate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return date.toISOString().slice(0, 10) === value;
};

function parseAIResponse(rawText) {
    const fallback = typeof rawText === 'string' ? rawText.trim() : '';
    const jsonText = fallback.replace(/^```(?:json)?\s*|\s*```$/gi, '');

    try {
        const parsed = JSON.parse(jsonText);
        const action = parsed?.action;
        const reply = isNonEmptyString(parsed?.reply) ? parsed.reply.trim() : fallback;

        if (action && typeof action === 'object') {
            if (action.type === 'NAVIGATE_TAB' && (action.target || action.tab)) {
                const target = String(action.target || action.tab).trim();
                return {
                    reply,
                    action: {
                        type: 'NAVIGATE_TAB',
                        target,
                        tab: target,
                        params: typeof action.params === 'object' && action.params ? action.params : {},
                        label: isNonEmptyString(action.label) ? action.label.trim() : `Chuyển đến ${target}`,
                        autoNavigate: action.autoNavigate !== false,
                    }
                };
            }

            if (action.type === 'FILL_CONTRACT_FORM' && isNonEmptyString(action.roomCode)) {
                return {
                    reply,
                    action: {
                        type: 'FILL_CONTRACT_FORM',
                        target: 'contract',
                        tab: 'contract',
                        roomCode: action.roomCode.trim(),
                        tenantName: isNonEmptyString(action.tenantName) ? action.tenantName.trim() : '',
                        rentPrice: isNonNegativeNumber(action.rentPrice) ? action.rentPrice : 0,
                        startDate: isValidISODate(action.startDate) ? action.startDate : new Date().toISOString().slice(0, 10),
                        label: `Tạo HĐ phòng ${action.roomCode.trim()}`,
                        autoNavigate: action.autoNavigate !== false,
                    },
                };
            }

            if (action.type === 'FILL_UTILITY_READING' && isNonEmptyString(action.roomCode)) {
                return {
                    reply,
                    action: {
                        type: 'FILL_UTILITY_READING',
                        target: 'utility',
                        tab: 'utility',
                        roomCode: action.roomCode.trim(),
                        newElec: isNonNegativeNumber(action.newElec) ? action.newElec : 0,
                        newWater: isNonNegativeNumber(action.newWater) ? action.newWater : 0,
                        label: `Chốt điện nước phòng ${action.roomCode.trim()}`,
                        autoNavigate: action.autoNavigate !== false,
                    },
                };
            }

            if (action.type === 'CREATE_INVOICE' && isNonEmptyString(action.roomCode)) {
                return {
                    reply,
                    action: {
                        type: 'CREATE_INVOICE',
                        target: 'invoice',
                        tab: 'invoice',
                        roomCode: action.roomCode.trim(),
                        month: isNonEmptyString(action.month) ? action.month.trim() : '',
                        label: `Lập hóa đơn phòng ${action.roomCode.trim()}`,
                        autoNavigate: action.autoNavigate !== false,
                    }
                };
            }

            if (action.type === 'CREATE_REPAIR_REQUEST') {
                return {
                    reply,
                    action: {
                        type: 'CREATE_REPAIR_REQUEST',
                        target: 'repair',
                        tab: 'repair',
                        title: isNonEmptyString(action.title) ? action.title.trim() : 'Báo sửa chữa',
                        label: 'Gửi yêu cầu sửa chữa',
                        autoNavigate: action.autoNavigate !== false,
                    }
                };
            }
        }

        return { reply, action: null };
    } catch {
        return { reply: fallback, action: null };
    }
}

async function getUserContext(userId, role) {
    const normalizedRole = normalizeRole(role);
    const defaultStats = {
        totalRooms: 0,
        vacantRooms: 0,
        occupiedRooms: 0,
        maintenanceRooms: 0,
        activeContracts: 0,
        pendingContracts: 0,
        totalDebt: 0,
        unpaidInvoiceCount: 0,
        totalRevenueCollected: 0,
    };

    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1 || !userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
            return {
                role: normalizedRole === 'landlord' ? 'Chủ trọ' : 'Người thuê',
                stats: normalizedRole === 'landlord' ? defaultStats : undefined,
                status: 'DB disconnected or demo context'
            };
        }
        if (normalizedRole === 'landlord') { // Landlord / Admin
            const [rooms, landlord] = await Promise.all([
                Room.find({ landlordId: userId }).select('_id status').lean().catch(() => []),
                Account.findById(userId).select('fullName bankId bankAccountNo bankAccountName').lean().catch(() => null)
            ]);
            const safeRooms = Array.isArray(rooms) ? rooms : [];
            const roomIds = safeRooms.map(r => r._id);
            
            const totalRooms = safeRooms.length;
            const vacantRooms = safeRooms.filter(r => r.status === 0).length;
            const occupiedRooms = safeRooms.filter(r => r.status === 1).length;
            const maintenanceRooms = safeRooms.filter(r => r.status === 2).length;

            let safeContracts = [];
            let safeInvoices = [];

            if (roomIds.length > 0) {
                safeContracts = await Contract.find({ roomId: { $in: roomIds } })
                    .select('_id status roomId tenantId')
                    .populate('roomId', 'roomCode')
                    .populate('tenantId', 'fullName')
                    .lean()
                    .catch(() => []);

                const contractIds = (Array.isArray(safeContracts) ? safeContracts : []).map(c => c._id);
                if (contractIds.length > 0) {
                    safeInvoices = await Invoice.find({ contractId: { $in: contractIds } })
                        .select('status totalAmount room tenant period dueDate')
                        .lean()
                        .catch(() => []);
                }
            }

            const safeInvoicesList = Array.isArray(safeInvoices) ? safeInvoices : [];
            const activeContracts = (Array.isArray(safeContracts) ? safeContracts : []).filter(c => c.status === 1).length;
            const pendingContracts = (Array.isArray(safeContracts) ? safeContracts : []).filter(c => c.status === 0).length;

            const unpaidInvoices = safeInvoicesList.filter(i => i.status === 1 || i.status === 3);
            const totalDebt = unpaidInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
            
            const paidInvoices = safeInvoicesList.filter(i => i.status === 2);
            const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

            // Chi tiết hóa đơn chưa thanh toán cho tin nhắn nhắc nợ
            const debtDetails = unpaidInvoices.slice(0, 10).map(i => ({
                room: i.room || 'N/A',
                tenant: i.tenant || 'N/A',
                period: i.period || '',
                totalAmount: Number(i.totalAmount) || 0,
                dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('vi-VN') : 'N/A',
                status: i.status === 3 ? 'Quá hạn' : 'Chưa thanh toán'
            }));

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
            const [tenant, contracts] = await Promise.all([
                Account.findById(userId).select('fullName').lean().catch(() => null),
                Contract.find({ tenantId: userId, status: 1 })
                    .select('_id fixedRentPrice startDate endDate roomId')
                    .populate('roomId', 'roomCode')
                    .lean()
                    .catch(() => [])
            ]);
            const safeContracts = Array.isArray(contracts) ? contracts : [];
            const contractIds = safeContracts.map(c => c._id);

            let safeInvoices = [];
            if (contractIds.length > 0) {
                safeInvoices = await Invoice.find({ contractId: { $in: contractIds } })
                    .select('status totalAmount period dueDate')
                    .lean()
                    .catch(() => []);
            }
            const safeInvoicesList = Array.isArray(safeInvoices) ? safeInvoices : [];
            const unpaidInvoices = safeInvoicesList.filter(i => i.status === 1 || i.status === 3);

            return {
                role: 'Người thuê',
                tenantName: tenant?.fullName || 'Người thuê',
                rooms: safeContracts.map(c => ({
                    roomCode: c.roomId?.roomCode || 'N/A',
                    rentPrice: c.fixedRentPrice || 0,
                    startDate: c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '',
                    endDate: c.endDate ? new Date(c.endDate).toLocaleDateString('vi-VN') : ''
                })),
                unpaidInvoices: unpaidInvoices.map(i => ({
                    period: i.period || '',
                    totalAmount: Number(i.totalAmount) || 0,
                    dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('vi-VN') : '',
                    status: i.status === 3 ? 'Quá hạn' : 'Chưa thanh toán'
                }))
            };
        }
    } catch (err) {
        console.error('[AI_SERVICE_CONTEXT_ERROR]', err);
        return {
            role: normalizedRole === 'landlord' ? 'Chủ trọ' : 'Người thuê',
            stats: normalizedRole === 'landlord' ? defaultStats : undefined
        };
    }
}


async function askTroHubAI(message, userId, role) {
    if (!message || typeof message !== 'string' || !message.trim()) {
        throw new Error('Câu hỏi không được để trống.');
    }

    const normalizedRole = normalizeRole(role);
    const presentation = getRolePresentation(normalizedRole);
    const intent = classifyAIIntent(message);
    if (normalizedRole === 'tenant'
        && (intent === 'landlord_financials' || intent === 'landlord_contract_action')) {
        return {
            reply: intent === 'landlord_financials' ? presentation.deniedMessage : presentation.adminDeniedMessage,
            action: null,
            role: normalizedRole,
            presentation,
            denied: true,
        };
    }

    const context = await getUserContext(userId, normalizedRole);
    const roleInstructions = normalizedRole === 'landlord' ? `
Bạn đang hỗ trợ Chủ trọ. Có thể sử dụng số liệu toàn bộ bất động sản, doanh thu, công nợ và hợp đồng trong bối cảnh.
Khi Chủ trọ yêu cầu tạo hợp đồng hoặc chốt điện nước với đủ dữ liệu, có thể trả về action điền biểu mẫu tương ứng.
` : `
Bạn đang hỗ trợ Cư dân. Chỉ được sử dụng dữ liệu phòng đang thuê, hóa đơn của chính người dùng và hướng dẫn báo sửa chữa.
Không tiết lộ hoặc hướng dẫn các thao tác quản trị của Chủ trọ; luôn trả về action là null.
`;
    const roleGuidance = normalizedRole === 'landlord' ? `
1. Trả về duy nhất JSON hợp lệ theo cấu trúc {"reply":"...", "action": null hoặc action_object}.
2. Nếu người dùng hỏi thống kê, doanh thu, nợ nần, hợp đồng, hãy dùng số liệu bối cảnh thực tế.
3. Nếu người dùng hỏi "Soạn tin nhắn nhắc nợ", hãy dùng debtDetails và thông tin ngân hàng để soạn tin nhắn lịch sự.
4. QUY TẮC ĐIỀU HƯỚNG TỰ ĐỘNG (ACTION DISPATCH):
   - Khi người dùng muốn xem/mở/quản lý Phòng: action là {"type":"NAVIGATE_TAB","target":"rooms","label":"Mở Quản lý phòng"}
   - Khi muốn tạo hợp đồng (có thể kèm phòng/khách/giá): action là {"type":"FILL_CONTRACT_FORM","roomCode":"...","tenantName":"...","rentPrice":0,"startDate":"YYYY-MM-DD","label":"Tạo hợp đồng"}
   - Khi muốn xem hợp đồng: action là {"type":"NAVIGATE_TAB","target":"contract","label":"Mở Hợp đồng"}
   - Khi muốn lập hóa đơn phòng cụ thể: action là {"type":"CREATE_INVOICE","roomCode":"...","label":"Lập hóa đơn"}
   - Khi muốn lập hóa đơn hàng loạt cả dãy: action là {"type":"NAVIGATE_TAB","target":"invoice_bulk","label":"Lập hóa đơn cả dãy"}
   - Khi muốn xem danh sách hóa đơn: action là {"type":"NAVIGATE_TAB","target":"invoice","label":"Mở Hóa đơn"}
   - Khi muốn chốt số điện nước: action là {"type":"FILL_UTILITY_READING","roomCode":"...","newElec":0,"newWater":0,"label":"Chốt điện nước"}
   - Khi muốn quét camera đồng hồ điện nước (OCR): action là {"type":"NAVIGATE_TAB","target":"scan_meter","label":"Quét đồng hồ OCR"}
   - Khi muốn xem/thêm Người thuê: action là {"type":"NAVIGATE_TAB","target":"tenants","label":"Danh bạ khách thuê"}
   - Khi muốn quét CCCD: action là {"type":"NAVIGATE_TAB","target":"cccd_scan","label":"Quét CCCD"}
   - Khi muốn xem báo sửa chữa: action là {"type":"NAVIGATE_TAB","target":"repair","label":"Quản lý sửa chữa"}
   - Khi muốn cài đặt VietQR, ngân hàng, chữ ký: action là {"type":"NAVIGATE_TAB","target":"settings","label":"Cài đặt VietQR & Chữ ký"}
   - Khi muốn cài đặt bảng giá dịch vụ: action là {"type":"NAVIGATE_TAB","target":"services","label":"Bảng giá dịch vụ"}
` : `
1. Trả về duy nhất JSON hợp lệ theo cấu trúc {"reply":"...", "action": null hoặc action_object}.
2. Chỉ dùng dữ liệu phòng và hóa đơn của chính người dùng để trả lời.
3. QUY TẮC ĐIỀU HƯỚNG TỰ ĐỘNG (ACTION DISPATCH):
   - Khi muốn xem tiền phòng / hóa đơn / thanh toán: action là {"type":"NAVIGATE_TAB","target":"invoice","label":"Xem hóa đơn của tôi"}
   - Khi muốn xem hợp đồng / ký hợp đồng: action là {"type":"NAVIGATE_TAB","target":"contract","label":"Xem hợp đồng"}
   - Khi muốn báo sửa chữa / báo hỏng thiết bị: action là {"type":"CREATE_REPAIR_REQUEST","title":"...","label":"Gửi báo sửa chữa"}
   - Khi muốn xem chỉ số điện nước: action là {"type":"NAVIGATE_TAB","target":"utility","label":"Chỉ số điện nước"}
`;
    const systemInstruction = `
Bạn là TroHub AI - Trợ lý AI thông minh tích hợp trên ứng dụng quản lý nhà trọ TroHub.
Hãy trả lời bằng tiếng Việt một cách chuyên nghiệp, ngắn gọn, lịch sự, thân thiện và hữu ích.

${roleInstructions}

Dữ liệu bối cảnh thời gian thực của người dùng hiện tại:
${JSON.stringify(context, null, 2)}

HƯỚNG DẪN TRẢ LỜI:
${roleGuidance}
`;

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];
    const { primaryClient, fallbackClient, primaryKey, fallbackKey } = getGenAIClient(role);

    if (!primaryClient && !fallbackClient) {
        return {
            reply: '⚠️ Chưa cấu hình Gemini API Key trong tệp .env. Vui lòng bổ sung GEMINI_LANDLORD_API_KEY hoặc GEMINI_API_KEY để sử dụng Chatbot.',
            action: null,
            role: normalizedRole,
            presentation,
            denied: false,
        };
    }


    const attempts = [];
    if (primaryClient) {
        attempts.push({ client: primaryClient, isFallback: false, key: primaryKey });
    }
    if (fallbackClient && fallbackKey !== primaryKey) {
        attempts.push({ client: fallbackClient, isFallback: true, key: fallbackKey });
    }

    let lastError = null;

    for (const { client, isFallback } of attempts) {
        if (isFallback) {
            console.warn('[AI_SERVICE_WARN] Primary Key hit rate limit/exhausted. Auto-switched to Fallback Gemini API Key!');
        }

        for (const modelName of candidateModels) {
            try {
                const response = await client.models.generateContent({
                    model: modelName,
                    contents: message.trim(),
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.2,
                        maxOutputTokens: 1024,
                    }
                });
                if (response && response.text) {
                    const result = parseAIResponse(response.text);
                    return {
                        ...result,
                        action: authorizeAIAction(normalizedRole, result.action),
                        role: normalizedRole,
                        presentation,
                        denied: false,
                        usingFallbackKey: isFallback,
                    };
                }
            } catch (err) {
                console.warn(`[AI_SERVICE_WARN] Model ${modelName} (${isFallback ? 'fallback' : 'primary'} key) encountered issue:`, err.message);
                lastError = err;
            }
        }
    }

    if (lastError && isRateLimitOrQuotaError(lastError)) {
        return {
            reply: '⚠️ Hệ thống Gemini API hiện đang tạm thời vượt giới hạn lượt gọi hoặc đang quá tải (Rate Limit 429/503). Vui lòng đợi khoảng 1 phút rồi thử lại nhé!',
            action: null,
            role: normalizedRole,
            presentation,
            denied: false,
            rateLimited: true,
        };
    }

    throw new Error(lastError?.message || 'Dịch vụ AI hiện chưa sẵn sàng, vui lòng thử lại sau.');
}


module.exports = {
    askTroHubAI,
    getUserContext,
    parseAIResponse,
    getGenAIClient,
    getGeminiApiKey,
    isRateLimitOrQuotaError,
};

