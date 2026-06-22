require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/configs/db');

// 1. Import các Routes
const roomRoutes = require('./src/routes/roomRoutes');
const tenantRoutes = require('./src/routes/tenantRoutes');
const contractRoutes = require('./src/routes/contractRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const repairRoutes = require('./src/routes/repairRoutes');
const authRoutes = require('./src/routes/authRoutes');
const seedRoute = require('./src/routes/seedRoute');
const settingsRoute = require('./src/routes/settingsRoute');
const meRoute = require('./src/routes/meRoute');
const paymentRoute = require('./src/routes/paymentRoute');
const serviceRoutes = require('./src/routes/serviceRoutes');

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Giúp API đọc được dữ liệu JSON gửi lên, tăng giới hạn lên 50mb
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Gọi hàm kết nối Database
connectDB();

// 4. Đăng ký các Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/me', meRoute);
app.use('/api/payments', paymentRoute);
app.use('/api/services', serviceRoutes);

// 5. Khởi động Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại http://0.0.0.0:${PORT}`);
});