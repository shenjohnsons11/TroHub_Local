const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../src/configs/db');
const InviteCode = require('../src/models/InviteCode');

const color = process.stdout.isTTY
    ? { reset: '\x1b[0m', success: '\x1b[1;32m', code: '\x1b[1;33m', error: '\x1b[1;31m' }
    : { reset: '', success: '', code: '', error: '' };

async function createInviteCode() {
    await InviteCode.init();

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = String(crypto.randomInt(100000, 1000000));
        try {
            return await InviteCode.create({ code });
        } catch (error) {
            if (error?.code !== 11000) throw error;
        }
    }

    throw new Error('Không thể tạo mã mời duy nhất sau 10 lần thử.');
}

async function main() {
    await connectDB();
    try {
        const invite = await createInviteCode();
        const separator = '====================================================';
        console.log(`\n${color.success}${separator}`);
        console.log('🎉 ĐÃ TẠO THÀNH CÔNG MÃ MỜI ĐĂNG KÝ CHỦ TRỌ MỚI!');
        console.log(`${color.code}👉 MÃ MỜI: ${invite.code}${color.success} (Hạn dùng: 1 lần)`);
        console.log(`${separator}${color.reset}\n`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(`${color.error}❌ Không thể tạo mã mời: ${error.message}${color.reset}`);
    process.exitCode = 1;
});
