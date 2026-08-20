require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { askTroHubAI } = require('../src/services/aiService');

async function testRevenuePrompt() {
  console.log('Testing "Tổng doanh thu đã thu" prompt for Landlord (Role 1)...');
  try {
    const result = await askTroHubAI('Tổng doanh thu đã thu', '64bf1234567890abcdef0001', 1);
    console.log('✅ Result Status:', result ? 'SUCCESS' : 'EMPTY');
    console.log('✅ Role:', result.role);
    console.log('✅ Reply:', result.reply);
    console.log('✅ Action:', result.action);
  } catch (error) {
    console.error('❌ Error testing prompt:', error);
    process.exit(1);
  }
}

testRevenuePrompt();
