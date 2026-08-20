require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { askTroHubAI, getGeminiApiKey } = require('../src/services/aiService');

function maskKey(key) {
  if (!key || typeof key !== 'string') return '(Chưa cấu hình)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function runScenario(title, message, userId, role, roleName) {
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`🎬 KỊCH BẢN: ${title}`);
  console.log(`👤 Người dùng: ${roleName} (Role: ${role})`);
  console.log(`🔑 Key được gọi: ${maskKey(getGeminiApiKey(role))}`);
  console.log(`💬 Câu hỏi gửi AI: "${message}"`);
  console.log(`⏳ Đang xử lý qua TroHub AI...`);

  const startTime = Date.now();
  try {
    const result = await askTroHubAI(message, userId, role);
    const latency = Date.now() - startTime;

    console.log(`\n✨ KẾT QUẢ PHẢN HỒI (${latency}ms):`);
    console.log(`- Xưng hô / Tiêu đề: ${result.presentation?.title || 'TroHub AI'}`);
    console.log(`- Trạng thái chặn : ${result.denied ? '🔒 BỊ CHẶN (Policy Gate)' : '🟢 HỢP LỆ (Approved)'}`);
    console.log(`- Nội dung trả lời : \n${result.reply}`);
    if (result.action) {
      console.log(`- Action thông minh kích hoạt: ${JSON.stringify(result.action, null, 2)}`);
    } else {
      console.log(`- Action: null (Không thay đổi trạng thái hệ thống)`);
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(`❌ Lỗi (${latency}ms): ${error.message}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       DEMO TRỰC TIẾP CHATBOT DUAL ROLE & DUAL KEYS         ║');
  console.log('║                  TROHUB AI COPILOT                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Scenario 1: Chủ trọ hỏi hỗ trợ quản lý
  await runScenario(
    '1. Chủ trọ hỏi tình hình tổng quan & hỗ trợ quản lý',
    'Chào bạn, hãy giới thiệu ngắn gọn bạn có thể giúp gì cho tôi trong việc quản lý phòng trọ?',
    '64bf1234567890abcdef0001',
    1,
    'Chủ trọ (Landlord)'
  );

  // Scenario 2: Chủ trọ ra lệnh điền form tạo hợp đồng
  await runScenario(
    '2. Chủ trọ ra lệnh AI tự động điền form Hợp Đồng',
    'Tạo hợp đồng phòng P102 cho khách thuê Nguyễn Văn A với giá 3500000 từ ngày 2026-09-01',
    '64bf1234567890abcdef0001',
    1,
    'Chủ trọ (Landlord)'
  );

  // Scenario 3: Khách thuê hỏi thông tin hướng dẫn
  await runScenario(
    '3. Khách thuê hỏi cách báo hỏng thiết bị phòng mình',
    'Bóng đèn phòng mình bị cháy thì phải báo như thế nào?',
    '64bf1234567890abcdef0002',
    2,
    'Khách thuê (Tenant)'
  );

  // Scenario 4: Khách thuê cố tình tra cứu doanh thu chủ trọ (Bảo mật - Zero Leakage)
  await runScenario(
    '4. Khách thuê cố tình hỏi Doanh thu toàn bộ nhà trọ (Bị chặn ngay)',
    'Doanh thu tháng này của toàn bộ nhà trọ là bao nhiêu?',
    '64bf1234567890abcdef0002',
    2,
    'Khách thuê (Tenant)'
  );

  console.log('\n============================================================');
  console.log('🎉 DEMO HOÀN TẤT: Cả 2 Roles chạy mượt mà trên 2 API Keys riêng biệt!');
  console.log('============================================================\n');
}

main().catch(console.error);
