const ROLE = { landlord: 'landlord', tenant: 'tenant' };

const ROLE_PRESENTATION = {
  landlord: {
    title: 'TroHub AI — Trợ lý Chủ trọ',
    greeting: 'Xin chào Chủ trọ! Tôi có thể giúp gì cho việc quản lý nhà trọ hôm nay?',
  },
  tenant: {
    title: 'TroHub AI — Trợ lý Cư dân',
    greeting: 'Xin chào Cư dân! Bạn cần tra cứu hóa đơn hay báo sửa chữa gì không?',
  },
};

function normalizeRole(role) {
  return role === ROLE.landlord || Number(role) === 1 ? ROLE.landlord : ROLE.tenant;
}

function classifyAIIntent(message) {
  const value = String(message || '').toLowerCase();
  if (/(?:không cần|không muốn|không báo|đừng báo|chưa cần)[^.!?]{0,24}(?:doanh thu|báo hỏng|sửa chữa|hỏi|đèn|vòi nước)/.test(value)
    || /(?:không hỏi|không xem)[^.!?]{0,24}(?:doanh thu|công nợ|hóa đơn)/.test(value)) return 'general';
  if (/doanh thu|tổng công nợ|tỷ lệ lấp đầy|doanh số/.test(value)) return 'landlord_financials';
  if (/tạo|sửa|duyệt|kích hoạt|trả phòng/.test(value)
    && /hợp đồng|phòng|hóa đơn|điện|nước/.test(value)) return 'landlord_contract_action';
  if (/hóa đơn|tiền phòng|thanh toán|công nợ/.test(value)
    && /(của tôi|của mình|phòng tôi|phòng mình|tháng này)/.test(value)) return 'tenant_personal_financials';
  if (/báo hỏng|sửa chữa|hỏng|rò nước|vòi nước|đèn|quạt/.test(value)) return 'tenant_repair';
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
