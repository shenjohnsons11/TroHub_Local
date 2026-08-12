const ROLE = { landlord: 'landlord', tenant: 'tenant' };

const ROLE_PRESENTATION = {
  landlord: {
    title: 'TroHub AI — Trợ lý Chủ trọ',
    greeting: 'Xin chào Chủ trọ! Tôi có thể giúp gì cho việc quản lý nhà trọ hôm nay?',
  },
  tenant: {
    title: 'TroHub AI — Trợ lý Cư dân',
    greeting: 'Xin chào Cư dân! Bạn cần tra cứu hóa đơn hay báo sửa chữa gì không?',
    deniedMessage: '🔒 Bạn thuộc vai trò Cư dân nên không có quyền truy cập doanh thu quản trị.',
    adminDeniedMessage: '🔒 Bạn thuộc vai trò Cư dân nên không có quyền truy cập hoặc hướng dẫn các thao tác quản trị của Chủ trọ.',
  },
};

function normalizeRole(role) {
  return role === ROLE.landlord || Number(role) === 1 ? ROLE.landlord : ROLE.tenant;
}

function classifyAIIntent(message) {
  const value = String(message || '').toLowerCase();
  if (/(?:đèn|vòi nước|quạt|thiết bị)[^.!?]{0,24}(?:không|chưa)[^.!?]{0,12}(?:hỏng|rò|cần sửa|cần báo)/.test(value)
    || /(?:không|chưa)[^.!?]{0,24}(?:hỏng|rò|cần sửa|cần báo)[^.!?]{0,12}(?:đèn|vòi nước|quạt|thiết bị)/.test(value)
    || /(?:không cần|không muốn|chưa cần|đừng|không|chưa)[^.!?]{0,30}(?:sửa|chốt|xóa|xoá|chốt điện nước|chốt số điện|tạo hợp đồng|duyệt hợp đồng|nhắc nợ|quản trị phòng|quản lý phòng)/.test(value)
    || /(?:doanh thu|công nợ|hóa đơn)[^.!?]{0,24}(?:không cần|không muốn|không xem)/.test(value)
    || /(?:không cần|không muốn|không báo|đừng báo|chưa cần)[^.!?]{0,24}(?:doanh thu|báo hỏng|sửa chữa|hỏi|đèn|vòi nước)/.test(value)
    || /(?:không hỏi|không xem)[^.!?]{0,24}(?:doanh thu|công nợ|hóa đơn)/.test(value)) return 'general';
  if (/hóa đơn|tiền phòng|thanh toán|công nợ/.test(value)
    && /(của tôi|của mình|phòng tôi|phòng mình)/.test(value)) return 'tenant_personal_financials';
  if (/doanh thu|tổng công nợ|tỷ lệ lấp đầy|doanh số/.test(value)) return 'landlord_financials';
  if (/(?:xem|tra cứu|thống kê|báo cáo).*(?:công nợ|doanh thu|nợ)|(?:công nợ|thống kê nợ|danh sách nợ|số phòng trống|phòng còn trống)(?!.*(?:của tôi|của mình|phòng tôi|phòng mình))/.test(value)) return 'landlord_financials';
  if (/báo hỏng|sửa chữa|hỏng|rò nước|vòi nước|đèn|quạt/.test(value)) return 'tenant_repair';
  if (/tạo|sửa|duyệt|kích hoạt|trả phòng|chốt|soạn tin nhắn nhắc nợ|soạn tin nhắc nợ|nhắc nợ|gửi nhắc thanh toán|gửi tin nhắc thanh toán|quản lý|quản trị|xóa|xoá|thêm/.test(value)
    && /hợp đồng|phòng|hóa đơn|điện|nước|người thuê/.test(value)) return 'landlord_contract_action';
  if (/soạn tin nhắn nhắc nợ|soạn tin nhắc nợ|nhắc nợ|gửi nhắc thanh toán|gửi tin nhắc thanh toán|quản lý (?:phòng|người thuê|cư dân)|quản trị phòng|xóa|xoá|thêm người thuê|danh sách người thuê/.test(value)) return 'landlord_contract_action';
  return 'general';
}

function authorizeAIAction(role, action) {
  if (!action || typeof action !== 'object') return null;
  if (normalizeRole(role) !== ROLE.landlord) return null;
  if (action.type === 'FILL_CONTRACT_FORM' || action.type === 'FILL_UTILITY_READING') {
    return { ...action, requiresConfirmation: false };
  }
  return null;
}

function getRolePresentation(role) {
  return ROLE_PRESENTATION[normalizeRole(role)];
}

module.exports = {
  ROLE,
  ROLE_PRESENTATION,
  normalizeRole,
  classifyAIIntent,
  authorizeAIAction,
  getRolePresentation,
};
