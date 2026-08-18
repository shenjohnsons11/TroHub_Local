const mongoose = require('mongoose');

const connectDB = async () => {
    const tryConnect = async (uri) => {
        try {
            let connectUrl = uri;
            if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
                try {
                    const mongoUrl = new URL(uri);
                    if (process.env.MONGODB_DATABASE && (!mongoUrl.pathname || mongoUrl.pathname === '/')) {
                        mongoUrl.pathname = `/${process.env.MONGODB_DATABASE}`;
                    }
                    connectUrl = mongoUrl.toString();
                } catch (e) {
                    connectUrl = uri;
                }
            }
            await mongoose.connect(connectUrl);
            return true;
        } catch (e) {
            return false;
        }
    };

    if (process.env.MONGODB_LOCAL_URI) {
        const localOk = await tryConnect(process.env.MONGODB_LOCAL_URI);
        if (localOk) {
            console.log('✅ Kết nối Local MongoDB thành công!');
            return;
        }
    }

    if (process.env.MONGODB_URI) {
        const cloudOk = await tryConnect(process.env.MONGODB_URI);
        if (cloudOk) {
            console.log('✅ Kết nối MongoDB Atlas Cloud thành công!');
            return;
        }
    }

    console.log('❌ Lỗi kết nối MongoDB: Không thể kết nối tới Local MongoDB hoặc MongoDB Atlas.');
    process.exit(1);
};

module.exports = connectDB;
