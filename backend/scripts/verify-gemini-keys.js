require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getGenAIClient } = require('../src/services/aiService');

function maskKey(key) {
  if (!key || typeof key !== 'string') return '(Chưa cấu hình)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

const candidateModels = ['gemini-3.6-flash', 'gemini-3.5-flash'];

async function testRoleKey(role, roleName) {
  const { primaryClient, fallbackClient, primaryKey, fallbackKey } = getGenAIClient(role);
  
  console.log(`\n======================================================`);
  console.log(`Kiểm tra Role: ${roleName} (Role ${role})`);
  console.log(`- Primary Key : ${maskKey(primaryKey)}`);
  console.log(`- Fallback Key: ${maskKey(fallbackKey)}`);
  
  if (!primaryClient && !fallbackClient) {
    console.log(`❌ THẤT BẠI: Chưa có bất kỳ API Key nào được cấu hình cho role này.`);
    return false;
  }

  const client = primaryClient || fallbackClient;
  const isFallback = !primaryClient && !!fallbackClient;
  const startTime = Date.now();
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: 'Ping! Trả lời đúng một chữ "PONG".',
      });
      
      const latency = Date.now() - startTime;
      const text = response?.text ? response.text.trim() : '';

      console.log(`✅ KẾT NỐI THÀNH CÔNG (${latency}ms, Model: ${model})`);
      console.log(`- Trạng thái key  : ${isFallback ? 'Đang dùng Fallback Key' : 'Đang dùng Primary Key chuẩn'}`);
      console.log(`- Phản hồi từ model: "${text}"`);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  const latency = Date.now() - startTime;
  console.log(`❌ GẶP LỖI (${latency}ms): ${lastError ? lastError.message : 'Unknown error'}`);
  return false;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     TROHUB AI — KIỂM TRA DUAL GEMINI API KEYS        ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const landlordSuccess = await testRoleKey(1, 'Chủ trọ (Landlord)');
  const tenantSuccess = await testRoleKey(2, 'Khách thuê (Tenant)');

  console.log('\n======================================================');
  console.log('TỔNG KẾT NGHIỆM THU:');
  console.log(`- Role Chủ trọ  : ${landlordSuccess ? '🟢 SẴN SÀNG' : '🔴 CHƯA SẴN SÀNG'}`);
  console.log(`- Role Khách thuê: ${tenantSuccess ? '🟢 SẴN SÀNG' : '🔴 CHƯA SẴN SÀNG'}`);
  
  const landlordKey = process.env.GEMINI_LANDLORD_API_KEY;
  const tenantKey = process.env.GEMINI_TENANT_API_KEY;

  if (landlordKey && tenantKey && landlordKey !== tenantKey) {
    console.log(`- Chế độ Quota  : 🟢 DUAL KEY ĐỘC LẬP (Nhân đôi hạn ngạch miễn phí 100%)`);
  } else if (landlordKey || tenantKey || process.env.GEMINI_API_KEY) {
    console.log(`- Chế độ Quota  : 🟡 Đang dùng chung Fallback Key (Hãy bổ sung đủ 2 key để tối ưu)`);
  }
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
