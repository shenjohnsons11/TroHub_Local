const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUrl = new URL(process.env.MONGODB_LOCAL_URI || process.env.MONGODB_URI);
        if (process.env.MONGODB_DATABASE) mongoUrl.pathname = `/${process.env.MONGODB_DATABASE}`;
        await mongoose.connect(mongoUrl.toString());
        console.log('✅ Kết nối MongoDB thành công!');
    } catch (error) {
        console.log('❌ Lỗi kết nối MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
